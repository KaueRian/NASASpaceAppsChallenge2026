import {
  DEFAULT_END_YEAR,
  DEFAULT_START_YEAR,
  type InvestigationErrorCode,
  type InvestigationResult,
  MIN_ANALYSIS_YEARS,
  type SeasonId,
  VARIABLE_UNIT_MAP,
  type VariableId,
} from "../../types/investigation.ts";
import { analyzeTrend } from "../stats/analyzeTrend.ts";
import { roundCoord, validateInvestigateQuery } from "../validation/investigate.ts";
import { aggregateMonthlySeries } from "./aggregate.ts";
import { fetchNasaPowerMonthly } from "./powerClient.ts";

export interface ClientInvestigateOptions {
  lat: number;
  lon: number;
  label?: string;
  variable: VariableId;
  season?: SeasonId;
  startYear?: number;
  endYear?: number;
  enableWorkerFallback?: boolean;
}

interface CachedMonthlyEntry {
  rawMonthly: Record<string, number>;
  retrievedAt: string;
}

const MEMORY_CACHE = new Map<string, CachedMonthlyEntry>();
const STORAGE_PREFIX = "earthtrend:power:v1:";

export class ClientInvestigationError extends Error {
  readonly code: InvestigationErrorCode;

  constructor(code: InvestigationErrorCode, message: string) {
    super(message);
    this.name = "ClientInvestigationError";
    this.code = code;
  }
}

interface StorageLike {
  readonly length: number;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
}

function getBrowserStorage(): StorageLike | null {
  const g = globalThis as { localStorage?: StorageLike };
  return g.localStorage ?? null;
}

function getCacheKey(roundLat: number, roundLon: number, variable: VariableId): string {
  return `${STORAGE_PREFIX}${roundLat.toFixed(2)}:${roundLon.toFixed(2)}:${variable}`;
}

function readBrowserCache(key: string): CachedMonthlyEntry | null {
  const inMemory = MEMORY_CACHE.get(key);
  if (inMemory) {
    return inMemory;
  }
  try {
    const storage = getBrowserStorage();
    if (storage) {
      const raw = storage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedMonthlyEntry;
        if (parsed && typeof parsed.rawMonthly === "object" && parsed.retrievedAt) {
          MEMORY_CACHE.set(key, parsed);
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
  return null;
}

function writeBrowserCache(key: string, entry: CachedMonthlyEntry): void {
  MEMORY_CACHE.set(key, entry);
  try {
    const storage = getBrowserStorage();
    if (storage) {
      storage.setItem(key, JSON.stringify(entry));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function clearClientInvestigationCache(): void {
  MEMORY_CACHE.clear();
  try {
    const storage = getBrowserStorage();
    if (storage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        storage.removeItem(k);
      }
    }
  } catch {
    // Ignore storage restrictions
  }
}

/**
 * Runs a live climate trend investigation directly in the browser (fetching NASA POWER
 * `temporal/monthly/point` + running the canonical TypeScript stats engine) with browser-side
 * caching and optional fallback to `/api/investigate`.
 */
export async function investigateClientSide(
  options: ClientInvestigateOptions,
): Promise<InvestigationResult> {
  const validation = validateInvestigateQuery({
    lat: String(options.lat),
    lon: String(options.lon),
    label: options.label,
    variable: options.variable,
    season: options.season ?? "annual",
    startYear: String(options.startYear ?? DEFAULT_START_YEAR),
    endYear: String(options.endYear ?? DEFAULT_END_YEAR),
  });

  if (!validation.ok) {
    throw new ClientInvestigationError(validation.code, validation.message);
  }

  const { lat, lon, label, variable, season, startYear, endYear } = validation.data;
  const resolvedLabel = label || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  const roundLat = roundCoord(lat);
  const roundLon = roundCoord(lon);
  const cacheKey = getCacheKey(roundLat, roundLon, variable);
  const cachedEntry = readBrowserCache(cacheKey);

  let rawMonthly: Record<string, number> | null = cachedEntry?.rawMonthly ?? null;
  let retrievedAt = cachedEntry?.retrievedAt ?? new Date().toISOString().slice(0, 10);
  const cached = Boolean(rawMonthly);

  if (!rawMonthly) {
    try {
      rawMonthly = await fetchNasaPowerMonthly({
        lat: roundLat,
        lon: roundLon,
        variable,
        startYear: DEFAULT_START_YEAR,
        endYear: DEFAULT_END_YEAR,
      });
      retrievedAt = new Date().toISOString().slice(0, 10);
      writeBrowserCache(cacheKey, { rawMonthly, retrievedAt });
    } catch (err) {
      if (options.enableWorkerFallback !== false) {
        const params = new URLSearchParams({
          lat: String(lat),
          lon: String(lon),
          label: resolvedLabel,
          variable,
          season,
          startYear: String(startYear),
          endYear: String(endYear),
        });
        const fallbackResp = await fetch(`/api/investigate?${params.toString()}`);
        if (fallbackResp.ok) {
          return (await fallbackResp.json()) as InvestigationResult;
        }
      }
      const message = err instanceof Error ? err.message : "NASA_UPSTREAM_ERROR";
      const code: InvestigationErrorCode = message.includes("TIMEOUT")
        ? "NASA_UPSTREAM_TIMEOUT"
        : "NASA_UPSTREAM_ERROR";
      throw new ClientInvestigationError(
        code,
        code === "NASA_UPSTREAM_TIMEOUT"
          ? "NASA POWER request timed out. Please retry."
          : "NASA POWER archive is temporarily unavailable.",
      );
    }
  }

  let filteredPoints: ReturnType<typeof aggregateMonthlySeries>;
  try {
    filteredPoints = aggregateMonthlySeries(rawMonthly, variable, season, startYear, endYear);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "INSUFFICIENT_YEARS";
    if (msg === "NO_DATA_ALL_MISSING") {
      throw new ClientInvestigationError(
        "NO_DATA_ALL_MISSING",
        "No evidence available for this variable at these coordinates (all values missing/-999).",
      );
    }
    throw new ClientInvestigationError(
      "INSUFFICIENT_YEARS",
      `At least ${MIN_ANALYSIS_YEARS} valid seasonal years are required.`,
    );
  }

  const { stats, series } = analyzeTrend(filteredPoints, variable);

  return {
    location: {
      label: resolvedLabel,
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
}
