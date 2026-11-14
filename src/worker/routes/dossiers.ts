import type { Context } from "hono";
import { aggregateMonthlySeries } from "../../lib/nasa/aggregate.ts";
import { fetchNasaPowerMonthly } from "../../lib/nasa/powerClient.ts";
import { analyzeTrend } from "../../lib/stats/analyzeTrend.ts";
import {
  buildNasaCacheKey,
  roundCoord,
  validateInvestigateQuery,
} from "../../lib/validation/investigate.ts";
import {
  type ApiErrorResponse,
  type CreateDossierRequest,
  type InvestigationResult,
  type SavedDossier,
  VARIABLE_UNIT_MAP,
} from "../../types/investigation.ts";
import type { WorkerBindings } from "../index.ts";

interface DossierRow {
  id: string;
  created_at: string;
  result_json: string;
}

interface NasaCacheRow {
  payload_json: string;
  retrieved_at: string;
}

/**
 * In-memory isolate fallback store so dossier sharing works in tests and
 * even if the remote D1 schema has not been migrated yet.
 */
const memoryDossiers = new Map<string, SavedDossier>();

function sanitizeLocationLabel(raw: unknown, fallbackLat: number, fallbackLon: number): string {
  if (typeof raw !== "string") {
    return `${fallbackLat.toFixed(2)}, ${fallbackLon.toFixed(2)}`;
  }
  const cleaned = raw
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[^\p{L}\p{N}\s,.\-()/°]/gu, "")
    .trim()
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : `${fallbackLat.toFixed(2)}, ${fallbackLon.toFixed(2)}`;
}

function buildDossierId(
  lat: number,
  lon: number,
  variable: string,
  season: string,
  startYear: number,
  endYear: number,
): string {
  const input = `${roundCoord(lat).toFixed(2)}|${roundCoord(lon).toFixed(2)}|${variable}|${season}|${startYear}|${endYear}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  return `et-${hex.slice(0, 10)}`;
}

function errorResponse(
  c: Context<{ Bindings: WorkerBindings }>,
  status: 400 | 404 | 422 | 502 | 504,
  code: ApiErrorResponse["code"],
  message: string,
) {
  return c.json({ ok: false, code, message } satisfies ApiErrorResponse, status);
}

export async function handleCreateDossier(c: Context<{ Bindings: WorkerBindings }>) {
  let body: Partial<CreateDossierRequest>;
  try {
    body = (await c.req.json()) as Partial<CreateDossierRequest>;
  } catch {
    return errorResponse(c, 400, "INVALID_COORDINATES", "Invalid JSON payload.");
  }

  const validation = validateInvestigateQuery({
    lat: body.lat !== undefined ? String(body.lat) : undefined,
    lon: body.lon !== undefined ? String(body.lon) : undefined,
    variable: body.variable,
    season: body.season,
    startYear: body.startYear !== undefined ? String(body.startYear) : undefined,
    endYear: body.endYear !== undefined ? String(body.endYear) : undefined,
    label: body.locationLabel,
  });

  if (!validation.ok) {
    return errorResponse(c, 400, validation.code, validation.message);
  }

  const { lat, lon, variable, season, startYear, endYear } = validation.data;
  const locationLabel = sanitizeLocationLabel(body.locationLabel, lat, lon);
  const id = buildDossierId(lat, lon, variable, season, startYear, endYear);

  const latKey = roundCoord(lat);
  const lonKey = roundCoord(lon);
  const cacheKey = buildNasaCacheKey(latKey, lonKey, variable, startYear, endYear);

  let rawMonthly: Record<string, number> | null = null;
  let retrievedAt = new Date().toISOString().slice(0, 10);
  let cached = false;

  if (c.env?.DB) {
    try {
      const row = await c.env.DB.prepare(
        "SELECT payload_json, retrieved_at FROM nasa_cache WHERE cache_key = ?",
      )
        .bind(cacheKey)
        .first<NasaCacheRow>();
      if (row) {
        rawMonthly = JSON.parse(row.payload_json) as Record<string, number>;
        retrievedAt = row.retrieved_at;
        cached = true;
      }
    } catch {
      // Fall back to live NASA fetch
    }
  }

  if (!rawMonthly) {
    try {
      rawMonthly = await fetchNasaPowerMonthly({
        lat: latKey,
        lon: lonKey,
        variable,
        startYear,
        endYear,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "NASA_UPSTREAM_ERROR";
      if (msg === "NASA_UPSTREAM_TIMEOUT") {
        return errorResponse(c, 504, "NASA_UPSTREAM_TIMEOUT", "NASA POWER API timed out.");
      }
      return errorResponse(c, 502, "NASA_UPSTREAM_ERROR", msg);
    }
  }

  let result: InvestigationResult;
  try {
    const aggregated = aggregateMonthlySeries(rawMonthly, variable, season, startYear, endYear);
    const { stats, series } = analyzeTrend(aggregated, variable);
    result = {
      location: { label: locationLabel, lat, lon },
      variable,
      unit: VARIABLE_UNIT_MAP[variable],
      season,
      stats,
      series,
      source: {
        provider: "NASA POWER / MERRA-2",
        resolution: "temporal/monthly/point",
        retrievedAt,
      },
      cached,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "INSUFFICIENT_YEARS";
    if (msg === "NO_DATA_ALL_MISSING") {
      return errorResponse(
        c,
        422,
        "NO_DATA_ALL_MISSING",
        "NASA POWER returned only missing (-999) values.",
      );
    }
    return errorResponse(
      c,
      400,
      "INSUFFICIENT_YEARS",
      "Fewer than 15 complete years of valid NASA POWER data were available.",
    );
  }

  const createdAt = new Date().toISOString();
  const saved: SavedDossier = { id, createdAt, result };
  memoryDossiers.set(id, saved);

  if (c.env?.DB) {
    try {
      await c.env.DB.prepare(
        `INSERT OR REPLACE INTO dossiers
          (id, created_at, lat, lon, location_label, variable, season, start_year, end_year, result_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          createdAt,
          lat,
          lon,
          locationLabel,
          variable,
          season,
          startYear,
          endYear,
          JSON.stringify(result),
        )
        .run();
    } catch {
      // Non-fatal if D1 table is not yet initialized; memoryDossiers still holds the dossier.
    }
  }

  return c.json(saved, 201);
}

export async function handleGetDossier(c: Context<{ Bindings: WorkerBindings }>) {
  const id = c.req.param("id")?.trim() ?? "";
  if (!/^et-[a-f0-9]{10}$/.test(id)) {
    return errorResponse(c, 404, "DOSSIER_NOT_FOUND", "Dossier not found.");
  }

  if (c.env?.DB) {
    try {
      const row = await c.env.DB.prepare(
        "SELECT id, created_at, result_json FROM dossiers WHERE id = ?",
      )
        .bind(id)
        .first<DossierRow>();

      if (row) {
        const saved: SavedDossier = {
          id: row.id,
          createdAt: row.created_at,
          result: JSON.parse(row.result_json) as InvestigationResult,
        };
        return c.json(saved, 200);
      }
    } catch {
      // Fall back to in-memory isolate store
    }
  }

  const fromMemory = memoryDossiers.get(id);
  if (fromMemory) {
    return c.json(fromMemory, 200);
  }

  return errorResponse(c, 404, "DOSSIER_NOT_FOUND", "Dossier not found.");
}

export async function handleListDossiers(c: Context<{ Bindings: WorkerBindings }>) {
  if (c.env?.DB) {
    try {
      const queryResult = await c.env.DB.prepare(
        "SELECT id, created_at, result_json FROM dossiers ORDER BY created_at DESC LIMIT 10",
      ).all<DossierRow>();

      const items: SavedDossier[] = (queryResult.results ?? []).map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        result: JSON.parse(row.result_json) as InvestigationResult,
      }));
      return c.json({ ok: true, dossiers: items }, 200);
    } catch {
      // Fall back to in-memory isolate store
    }
  }

  const items = Array.from(memoryDossiers.values()).slice(-10).reverse();
  return c.json({ ok: true, dossiers: items }, 200);
}
