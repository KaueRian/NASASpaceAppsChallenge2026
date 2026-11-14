import {
  DEFAULT_END_YEAR,
  DEFAULT_START_YEAR,
  type InvestigationErrorCode,
  MIN_ANALYSIS_YEARS,
  SEASON_IDS,
  type SeasonId,
  VARIABLE_IDS,
  type VariableId,
} from "../../types/investigation.ts";

export interface InvestigateQueryInput {
  lat?: string;
  lon?: string;
  variable?: string;
  season?: string;
  startYear?: string;
  endYear?: string;
  label?: string;
}

export interface ValidatedInvestigateQuery {
  lat: number;
  lon: number;
  variable: VariableId;
  season: SeasonId;
  startYear: number;
  endYear: number;
  label?: string;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: InvestigationErrorCode; message: string };

const MERRA2_MIN_YEAR = 1981;

/** Rounds a coordinate to 2 decimal places (~1.1 km) for D1 cache keys. */
export function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildNasaCacheKey(
  lat: number,
  lon: number,
  variable: VariableId,
  startYear: number,
  endYear: number,
): string {
  return `${roundCoord(lat).toFixed(2)}:${roundCoord(lon).toFixed(2)}:${variable}:${startYear}:${endYear}`;
}

function parseFiniteNumber(raw?: string): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export function validateInvestigateQuery(
  input: InvestigateQueryInput,
): ValidationResult<ValidatedInvestigateQuery> {
  const lat = parseFiniteNumber(input.lat);
  const lon = parseFiniteNumber(input.lon);
  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return {
      ok: false,
      code: "INVALID_COORDINATES",
      message: "Latitude must be between -90 and 90, and longitude between -180 and 180.",
    };
  }

  if (!input.variable || !VARIABLE_IDS.includes(input.variable as VariableId)) {
    return {
      ok: false,
      code: "INVALID_VARIABLE",
      message: `Unsupported variable. Allowed: ${VARIABLE_IDS.join(", ")}.`,
    };
  }

  if (!input.season || !SEASON_IDS.includes(input.season as SeasonId)) {
    return {
      ok: false,
      code: "INVALID_SEASON",
      message: `Unsupported season. Allowed: ${SEASON_IDS.join(", ")}.`,
    };
  }

  const startYear =
    input.startYear !== undefined ? parseFiniteNumber(input.startYear) : DEFAULT_START_YEAR;
  const endYear = input.endYear !== undefined ? parseFiniteNumber(input.endYear) : DEFAULT_END_YEAR;
  const maxAllowedYear = new Date().getUTCFullYear();

  if (
    startYear === null ||
    endYear === null ||
    !Number.isInteger(startYear) ||
    !Number.isInteger(endYear) ||
    startYear < MERRA2_MIN_YEAR ||
    endYear > maxAllowedYear ||
    startYear > endYear ||
    endYear - startYear + 1 < MIN_ANALYSIS_YEARS
  ) {
    return {
      ok: false,
      code: "INSUFFICIENT_YEARS",
      message: `Year range must span at least ${MIN_ANALYSIS_YEARS} years between ${MERRA2_MIN_YEAR} and ${maxAllowedYear}.`,
    };
  }

  const trimmedLabel = input.label?.trim();

  return {
    ok: true,
    data: {
      lat,
      lon,
      variable: input.variable as VariableId,
      season: input.season as SeasonId,
      startYear,
      endYear,
      ...(trimmedLabel ? { label: trimmedLabel.slice(0, 120) } : {}),
    },
  };
}

export type GeocodeValidationResult =
  | { ok: true; query: string }
  | { ok: false; code: InvestigationErrorCode; message: string };

export function validateGeocodeQuery(raw?: string): GeocodeValidationResult {
  const query = raw?.trim() ?? "";
  if (query.length < 2) {
    return {
      ok: false,
      code: "GEOCODE_NOT_FOUND",
      message: "Search query must be at least 2 characters.",
    };
  }
  return { ok: true, query: query.slice(0, 120) };
}
