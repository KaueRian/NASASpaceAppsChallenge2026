import {
  AI_TREND_DIRECTIONS,
  AI_UNIT_IDS,
  AI_VERDICT_LEVELS,
  type AiExtremeYearInput,
  type AiInterpretRequest,
  type AiLocale,
  type AiScanFindingInput,
  type AiTranslateContext,
  type AiTranslatedFilters,
  type AiTranslateRequest,
} from "../../types/ai.ts";
import {
  DEFAULT_START_YEAR,
  MIN_ANALYSIS_YEARS,
  SEASON_IDS,
  type SeasonId,
  VARIABLE_IDS,
  type VariableId,
} from "../../types/investigation.ts";
import { getMaxCompleteYear } from "../validation/investigate.ts";

const MAX_QUESTION_LENGTH = 500;
const MERRA2_MIN_YEAR = 1981;

export type AiValidationResult<T> = { ok: true; data: T } | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInEnum<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function parseLocale(raw: unknown): AiLocale | null {
  if (raw === "pt" || raw === "en") return raw;
  return null;
}

function isValidLatLon(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lon === "number" &&
    Number.isFinite(lon) &&
    lon >= -180 &&
    lon <= 180
  );
}

export function validateAiTranslateRequest(body: unknown): AiValidationResult<AiTranslateRequest> {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const rawQuestion = typeof body.question === "string" ? body.question.trim() : "";
  if (!rawQuestion) {
    return { ok: false, message: "Question must be a non-empty string." };
  }
  if (rawQuestion.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      message: `Question must not exceed ${MAX_QUESTION_LENGTH} characters.`,
    };
  }

  const lang = parseLocale(body.lang);
  if (!lang) {
    return { ok: false, message: "Language must be 'pt' or 'en'." };
  }

  let currentContext: AiTranslateContext | undefined;
  if (body.currentContext !== undefined) {
    if (!isRecord(body.currentContext)) {
      return { ok: false, message: "currentContext must be an object when supplied." };
    }
    const ctx = body.currentContext;
    if (
      !isValidLatLon(ctx.lat, ctx.lon) ||
      !isInEnum(ctx.variable, VARIABLE_IDS) ||
      !isInEnum(ctx.season, SEASON_IDS) ||
      typeof ctx.startYear !== "number" ||
      !Number.isInteger(ctx.startYear) ||
      typeof ctx.endYear !== "number" ||
      !Number.isInteger(ctx.endYear)
    ) {
      return { ok: false, message: "Invalid currentContext coordinates, variable, or period." };
    }
    const label =
      typeof ctx.label === "string" && ctx.label.trim().length > 0
        ? ctx.label.trim().slice(0, 120)
        : undefined;
    currentContext = {
      lat: ctx.lat as number,
      lon: ctx.lon as number,
      ...(label ? { label } : {}),
      variable: ctx.variable,
      season: ctx.season,
      startYear: ctx.startYear,
      endYear: ctx.endYear,
    };
  }

  return {
    ok: true,
    data: {
      question: rawQuestion,
      lang,
      ...(currentContext ? { currentContext } : {}),
    },
  };
}

export function sanitizeAiTranslatedFilters(
  rawFilters: unknown,
  currentContext?: AiTranslateContext,
  maxCompleteYear = getMaxCompleteYear(),
): AiTranslatedFilters {
  const input = isRecord(rawFilters) ? rawFilters : {};
  const reuseCurrentLocation = Boolean(input.reuseCurrentLocation) && currentContext !== undefined;

  const fallbackVariable: VariableId = currentContext?.variable ?? "PRECTOTCORR";
  const fallbackSeason: SeasonId = currentContext?.season ?? "apr_sep";

  const variable: VariableId = isInEnum(input.variable, VARIABLE_IDS)
    ? input.variable
    : fallbackVariable;
  const season: SeasonId = isInEnum(input.season, SEASON_IDS) ? input.season : fallbackSeason;

  let endYear =
    typeof input.endYear === "number" && Number.isInteger(input.endYear)
      ? input.endYear
      : maxCompleteYear;
  endYear = Math.max(MERRA2_MIN_YEAR + MIN_ANALYSIS_YEARS - 1, Math.min(maxCompleteYear, endYear));

  let startYear =
    typeof input.startYear === "number" && Number.isInteger(input.startYear)
      ? input.startYear
      : DEFAULT_START_YEAR;
  startYear = Math.max(MERRA2_MIN_YEAR, Math.min(startYear, endYear));

  if (endYear - startYear + 1 < MIN_ANALYSIS_YEARS) {
    startYear = Math.max(MERRA2_MIN_YEAR, endYear - MIN_ANALYSIS_YEARS + 1);
  }

  const rawQuery = typeof input.locationQuery === "string" ? input.locationQuery.trim() : "";
  const locationQuery = reuseCurrentLocation
    ? (currentContext.label ?? `${currentContext.lat.toFixed(2)}, ${currentContext.lon.toFixed(2)}`)
    : rawQuery || "Vilhena, RO, Brazil";

  let lat: number | undefined;
  let lon: number | undefined;
  if (reuseCurrentLocation && currentContext) {
    lat = currentContext.lat;
    lon = currentContext.lon;
  } else if (isValidLatLon(input.lat, input.lon)) {
    lat = input.lat as number;
    lon = input.lon as number;
  }

  return {
    reuseCurrentLocation,
    locationQuery: locationQuery.slice(0, 120),
    ...(lat !== undefined && lon !== undefined ? { lat, lon } : {}),
    variable,
    season,
    startYear,
    endYear,
    runMultiVariableScan: Boolean(input.runMultiVariableScan),
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateAiInterpretRequest(body: unknown): AiValidationResult<AiInterpretRequest> {
  if (!isRecord(body)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      message: `Question must be between 1 and ${MAX_QUESTION_LENGTH} characters.`,
    };
  }

  const lang = parseLocale(body.lang);
  if (!lang) {
    return { ok: false, message: "Language must be 'pt' or 'en'." };
  }

  if (
    !isRecord(body.location) ||
    typeof body.location.label !== "string" ||
    !body.location.label.trim() ||
    !isValidLatLon(body.location.lat, body.location.lon)
  ) {
    return { ok: false, message: "Valid location label and coordinates are required." };
  }

  if (
    !isInEnum(body.variable, VARIABLE_IDS) ||
    !isInEnum(body.unit, AI_UNIT_IDS) ||
    !isInEnum(body.season, SEASON_IDS)
  ) {
    return { ok: false, message: "Valid variable, unit, and season are required." };
  }

  if (!isRecord(body.stats)) {
    return { ok: false, message: "Calculated stats object is required." };
  }
  const s = body.stats;
  const requiredNumericFields = [
    s.startYear,
    s.endYear,
    s.nYears,
    s.fullPeriodMean,
    s.fullPeriodStdDev,
    s.zScore,
    s.pValue,
    s.senSlopePerYear,
    s.senSlopePerDecade,
    s.totalChangeOverPeriod,
  ];
  if (
    requiredNumericFields.some((n) => !isFiniteNumber(n)) ||
    !isInEnum(s.verdict, AI_VERDICT_LEVELS) ||
    !isInEnum(s.direction, AI_TREND_DIRECTIONS)
  ) {
    return { ok: false, message: "Calculated stats contain invalid metrics." };
  }

  const extremeYears: AiExtremeYearInput[] = [];
  if (Array.isArray(body.extremeYears)) {
    for (const item of body.extremeYears.slice(0, 8)) {
      if (
        isRecord(item) &&
        typeof item.label === "string" &&
        item.label.trim() &&
        isFiniteNumber(item.value) &&
        isFiniteNumber(item.zScore)
      ) {
        extremeYears.push({
          label: item.label.trim().slice(0, 16),
          value: item.value,
          zScore: item.zScore,
        });
      }
    }
  }

  let scanSummary: AiScanFindingInput[] | undefined;
  if (Array.isArray(body.scanSummary)) {
    const validItems: AiScanFindingInput[] = [];
    for (const item of body.scanSummary.slice(0, 4)) {
      if (
        isRecord(item) &&
        isInEnum(item.variable, VARIABLE_IDS) &&
        isInEnum(item.season, SEASON_IDS) &&
        isFiniteNumber(item.senSlopePerDecade) &&
        isFiniteNumber(item.pValue) &&
        isFiniteNumber(item.qValue) &&
        typeof item.fdrSignificant === "boolean" &&
        isInEnum(item.verdict, AI_VERDICT_LEVELS) &&
        isInEnum(item.direction, AI_TREND_DIRECTIONS)
      ) {
        validItems.push({
          variable: item.variable,
          season: item.season,
          senSlopePerDecade: item.senSlopePerDecade,
          pValue: item.pValue,
          qValue: item.qValue,
          fdrSignificant: item.fdrSignificant,
          verdict: item.verdict,
          direction: item.direction,
        });
      }
    }
    if (validItems.length > 0) scanSummary = validItems;
  }

  const limitationNotice =
    typeof body.limitationNotice === "string" && body.limitationNotice.trim()
      ? body.limitationNotice.trim().slice(0, 300)
      : undefined;

  return {
    ok: true,
    data: {
      question,
      lang,
      ...(limitationNotice ? { limitationNotice } : {}),
      location: {
        label: (body.location.label as string).trim().slice(0, 120),
        lat: body.location.lat as number,
        lon: body.location.lon as number,
      },
      variable: body.variable,
      unit: body.unit,
      season: body.season,
      stats: body.stats as unknown as AiInterpretRequest["stats"],
      extremeYears,
      ...(scanSummary ? { scanSummary } : {}),
    },
  };
}

export async function hashAiCacheKey(
  stage: "translate" | "interpret",
  payload: unknown,
): Promise<string> {
  const bytes = new TextEncoder().encode(`${stage}:${JSON.stringify(payload)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
