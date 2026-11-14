import {
  type GeocodeCandidate,
  type InvestigationResult,
  type SeasonId,
  VARIABLE_IDS,
  type VariableId,
} from "../../types/investigation.ts";
import { benjaminiHochberg } from "../stats/benjaminiHochberg.ts";
import { investigateClientSide } from "./clientInvestigate.ts";

/**
 * Curated instant 1-click municipal & global reference locations covering
 * the 4 scales (Vilhena -> Rondônia -> Brazil -> World) and Amazonian hubs.
 */
export const QUICK_CITY_SUGGESTIONS: readonly GeocodeCandidate[] = [
  {
    name: "Vilhena",
    admin1: "Rondônia",
    country: "Brazil",
    lat: -12.74,
    lon: -60.14,
    label: "Vilhena, RO, Brazil",
  },
  {
    name: "Ariquemes",
    admin1: "Rondônia",
    country: "Brazil",
    lat: -9.91,
    lon: -63.04,
    label: "Ariquemes, RO, Brazil",
  },
  {
    name: "Porto Velho",
    admin1: "Rondônia",
    country: "Brazil",
    lat: -8.76,
    lon: -63.9,
    label: "Porto Velho, RO, Brazil",
  },
  {
    name: "Ji-Paraná",
    admin1: "Rondônia",
    country: "Brazil",
    lat: -10.88,
    lon: -61.95,
    label: "Ji-Paraná, RO, Brazil",
  },
  {
    name: "Cacoal",
    admin1: "Rondônia",
    country: "Brazil",
    lat: -11.44,
    lon: -61.45,
    label: "Cacoal, RO, Brazil",
  },
  {
    name: "Manaus",
    admin1: "Amazonas",
    country: "Brazil",
    lat: -3.12,
    lon: -60.02,
    label: "Manaus, AM, Brazil",
  },
  {
    name: "Cuiabá",
    admin1: "Mato Grosso",
    country: "Brazil",
    lat: -15.6,
    lon: -56.1,
    label: "Cuiabá, MT, Brazil",
  },
  {
    name: "Corumbá (Pantanal)",
    admin1: "Mato Grosso do Sul",
    country: "Brazil",
    lat: -19.01,
    lon: -57.65,
    label: "Corumbá (Pantanal), MS, Brazil",
  },
  {
    name: "Svalbard",
    admin1: "Svalbard",
    country: "Norway",
    lat: 78.22,
    lon: 15.65,
    label: "Svalbard, Arctic",
  },
];

/**
 * Returns the scientifically recommended seasonal window for a given variable and latitude:
 * - `PRECTOTCORR` in the Southern Hemisphere (`lat <= 0`) defaults to `apr_sep`
 *   (the dry/transition window where second-crop *safrinha* and wildfire stress occur).
 * - All other variable/hemisphere combinations default to `annual`.
 */
export function getRecommendedSeason(variable: VariableId, lat: number): SeasonId {
  if (variable === "PRECTOTCORR" && lat <= 0) {
    return "apr_sep";
  }
  return "annual";
}

/**
 * Filters curated quick-access cities by case-insensitive substring, or returns all when empty.
 */
export function getQuickCitySuggestions(filterQuery = ""): GeocodeCandidate[] {
  const normalized = filterQuery.trim().toLowerCase();
  if (!normalized) {
    return [...QUICK_CITY_SUGGESTIONS];
  }
  return QUICK_CITY_SUGGESTIONS.filter(
    (c) =>
      c.label.toLowerCase().includes(normalized) ||
      c.name.toLowerCase().includes(normalized) ||
      (c.admin1?.toLowerCase().includes(normalized) ?? false) ||
      c.country.toLowerCase().includes(normalized),
  );
}

interface OpenMeteoRawResult {
  name?: string;
  admin1?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Searches cities worldwide with 3-tier resilience:
 * 1. For `< 3` characters, returns matching curated quick suggestions.
 * 2. Tries `/api/geocode?q=...` on the Cloudflare Worker.
 * 3. Falls back to direct Open-Meteo Geocoding API (`geocoding-api.open-meteo.com`) or local curated matches if offline.
 */
export async function searchCitiesClientSide(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeCandidate[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return getQuickCitySuggestions(trimmed);
  }

  try {
    const workerRes = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, { signal });
    if (workerRes.ok) {
      const contentType = workerRes.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const payload = (await workerRes.json()) as {
          ok?: boolean;
          results?: GeocodeCandidate[];
        };
        if (payload.ok && Array.isArray(payload.results) && payload.results.length > 0) {
          return payload.results;
        }
      }
    }
  } catch {
    // Fall through to direct Open-Meteo or local quick suggestions
  }

  try {
    const directUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=5&language=en&format=json`;
    const directRes = await fetch(directUrl, { signal });
    if (directRes.ok) {
      const data = (await directRes.json()) as { results?: OpenMeteoRawResult[] };
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results
          .filter(
            (
              r,
            ): r is Required<Pick<OpenMeteoRawResult, "name" | "latitude" | "longitude">> &
              OpenMeteoRawResult =>
              typeof r.name === "string" &&
              typeof r.latitude === "number" &&
              typeof r.longitude === "number",
          )
          .slice(0, 5)
          .map((r) => {
            const parts = [r.name, r.admin1, r.country].filter(Boolean);
            return {
              name: r.name,
              admin1: r.admin1,
              country: r.country ?? "",
              lat: Math.round(r.latitude * 100) / 100,
              lon: Math.round(r.longitude * 100) / 100,
              label: parts.join(", "),
            };
          });
      }
    }
  } catch {
    // Fall through to local quick matches
  }

  return getQuickCitySuggestions(trimmed);
}

export interface MultiVariableScanItem {
  variable: VariableId;
  season: SeasonId;
  result: InvestigationResult;
  qValue: number;
  fdrSignificant: boolean;
}

/**
 * Runs all 4 NASA POWER variables at the target coordinate and applies
 * the Benjamini-Hochberg (1995) False Discovery Rate (FDR) adjustment across the 4 p-values.
 */
export async function scanAllVariablesWithFdr(params: {
  lat: number;
  lon: number;
  label?: string;
  startYear?: number;
  endYear?: number;
  seasonOverride?: SeasonId;
}): Promise<MultiVariableScanItem[]> {
  const rawResults = await Promise.all(
    VARIABLE_IDS.map(async (variable) => {
      const season = params.seasonOverride ?? getRecommendedSeason(variable, params.lat);
      const result = await investigateClientSide({
        lat: params.lat,
        lon: params.lon,
        label: params.label,
        variable,
        season,
        startYear: params.startYear,
        endYear: params.endYear,
      });
      return { variable, season, result };
    }),
  );

  const fdrAdjusted = benjaminiHochberg(
    rawResults.map((item) => item.result.stats.pValue),
    0.05,
  );

  return rawResults.map((item, idx) => ({
    variable: item.variable,
    season: item.season,
    result: item.result,
    qValue: fdrAdjusted.adjustedPValues[idx] ?? item.result.stats.pValue,
    fdrSignificant: fdrAdjusted.significant[idx] ?? item.result.stats.pValue < 0.05,
  }));
}

/**
 * Formats the nearest NASA POWER MERRA-2 0.5° × 0.625° grid-cell center for Advanced Options display.
 */
export function formatMerraGridCell(lat: number, lon: number): string {
  const gridLat = (Math.round(lat * 2) / 2).toFixed(2);
  const gridLon = (Math.round(lon / 0.625) * 0.625).toFixed(3);
  return `${gridLat}°, ${gridLon}° (~50 km MERRA-2)`;
}
