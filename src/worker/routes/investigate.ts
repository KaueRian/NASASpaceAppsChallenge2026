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
  type InvestigationResult,
  VARIABLE_UNIT_MAP,
} from "../../types/investigation.ts";
import type { WorkerBindings } from "../index.ts";

interface NasaCacheRow {
  payload_json: string;
  retrieved_at: string;
}

function errorResponse(
  c: Context<{ Bindings: WorkerBindings }>,
  status: 400 | 422 | 502 | 504,
  code: ApiErrorResponse["code"],
  message: string,
) {
  const payload: ApiErrorResponse = { ok: false, code, message };
  return c.json(payload, status);
}

export async function handleInvestigate(c: Context<{ Bindings: WorkerBindings }>) {
  const validation = validateInvestigateQuery({
    lat: c.req.query("lat"),
    lon: c.req.query("lon"),
    variable: c.req.query("variable"),
    season: c.req.query("season"),
    startYear: c.req.query("startYear"),
    endYear: c.req.query("endYear"),
    label: c.req.query("label"),
  });

  if (!validation.ok) {
    return errorResponse(c, 400, validation.code, validation.message);
  }

  const { lat, lon, variable, season, startYear, endYear, label } = validation.data;
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
      // Fall through to live NASA POWER fetch if D1 is uninitialized or transiently unavailable.
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
      retrievedAt = new Date().toISOString().slice(0, 10);

      if (c.env?.DB) {
        try {
          await c.env.DB.prepare(
            `INSERT OR REPLACE INTO nasa_cache
              (cache_key, lat_key, lon_key, variable, start_year, end_year, payload_json, retrieved_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
            .bind(
              cacheKey,
              latKey,
              lonKey,
              variable,
              startYear,
              endYear,
              JSON.stringify(rawMonthly),
              retrievedAt,
            )
            .run();
        } catch {
          // Non-fatal cache write failure.
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "NASA_UPSTREAM_ERROR";
      if (msg === "NASA_UPSTREAM_TIMEOUT") {
        return errorResponse(
          c,
          504,
          "NASA_UPSTREAM_TIMEOUT",
          "NASA POWER API timed out. Please retry.",
        );
      }
      return errorResponse(c, 502, "NASA_UPSTREAM_ERROR", msg);
    }
  }

  try {
    const aggregated = aggregateMonthlySeries(rawMonthly, variable, season, startYear, endYear);
    const { stats, series } = analyzeTrend(aggregated, variable);

    const result: InvestigationResult = {
      location: {
        label: label ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        lat,
        lon,
      },
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

    return c.json(result, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "INSUFFICIENT_YEARS";
    if (msg === "NO_DATA_ALL_MISSING") {
      return errorResponse(
        c,
        422,
        "NO_DATA_ALL_MISSING",
        "NASA POWER returned only missing (-999) values for this coordinate and variable.",
      );
    }
    return errorResponse(
      c,
      400,
      "INSUFFICIENT_YEARS",
      "Fewer than 15 complete years of valid NASA POWER data were available.",
    );
  }
}
