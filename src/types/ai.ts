import type {
  SeasonId,
  TrendDirection,
  TrendStats,
  VariableId,
  VariableUnit,
  VerdictLevel,
} from "./investigation.ts";

export type AiLocale = "en" | "pt";

export type AiThinkingLevel = "minimal" | "low" | "medium" | "high" | "xhigh";

export const AI_UNIT_IDS: readonly VariableUnit[] = ["C", "mm", "pct"] as const;
export const AI_VERDICT_LEVELS: readonly VerdictLevel[] = [
  "STRONG_EVIDENCE",
  "EVIDENCE_CONFIRMED",
  "INSUFFICIENT_EVIDENCE",
] as const;
export const AI_TREND_DIRECTIONS: readonly TrendDirection[] = [
  "warming",
  "cooling",
  "wetter",
  "drier",
  "neutral",
] as const;

export const AI_VARIABLE_DESCRIPTIONS: Record<VariableId, string> = {
  T2M: "Air Temperature at 2m Mean (°C)",
  T2M_MIN: "Minimum Night-Time Temperature at 2m (°C)",
  PRECTOTCORR: "Bias-Corrected Total Precipitation (mm)",
  GWETROOT: "Root-Zone Soil Wetness Index (0-100%)",
};

export const AI_SEASON_DESCRIPTIONS: Record<SeasonId, string> = {
  annual: "Annual (Jan-Dec)",
  oct_mar: "Wet Season (Oct-Mar)",
  apr_sep: "Dry Season (Apr-Sep)",
};

export type AiErrorCode =
  | "AI_INVALID_REQUEST"
  | "AI_NOT_CONFIGURED"
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_UPSTREAM_ERROR"
  | "AI_BAD_RESPONSE";

export interface AiTranslateContext {
  lat: number;
  lon: number;
  label?: string;
  variable: VariableId;
  season: SeasonId;
  startYear: number;
  endYear: number;
}

export interface AiTranslateRequest {
  question: string;
  lang: AiLocale;
  currentContext?: AiTranslateContext;
}

export interface AiTranslatedFilters {
  reuseCurrentLocation: boolean;
  locationQuery: string;
  lat?: number;
  lon?: number;
  variable: VariableId;
  season: SeasonId;
  startYear: number;
  endYear: number;
  runMultiVariableScan: boolean;
}

export interface AiTranslateResult {
  ok: true;
  inScope: boolean;
  outOfScopeMessage?: string;
  limitationNotice?: string;
  suggestedValidQuestions: string[];
  reasoning: string;
  initialHypothesis: string;
  filters: AiTranslatedFilters;
  model: string;
  thinkingLevel?: AiThinkingLevel;
  fallbackUsed?: boolean;
  cached: boolean;
}

export interface AiScanFindingInput {
  variable: VariableId;
  season: SeasonId;
  senSlopePerDecade: number;
  pValue: number;
  qValue: number;
  fdrSignificant: boolean;
  verdict: VerdictLevel;
  direction: TrendDirection;
}

export interface AiExtremeYearInput {
  label: string;
  value: number;
  zScore: number;
}

export interface AiInterpretRequest {
  question: string;
  lang: AiLocale;
  limitationNotice?: string;
  location: {
    label: string;
    lat: number;
    lon: number;
  };
  variable: VariableId;
  unit: VariableUnit;
  season: SeasonId;
  stats: TrendStats;
  extremeYears: AiExtremeYearInput[];
  scanSummary?: AiScanFindingInput[];
}

export interface AiHypothesis {
  title: string;
  description: string;
}

export interface AiInterpretResult {
  ok: true;
  directAnswer: string;
  keyFindings: string[];
  hypotheses: AiHypothesis[];
  causalityWarning: string;
  followUpQuestions: string[];
  model: string;
  thinkingLevel?: AiThinkingLevel;
  fallbackUsed?: boolean;
  cached: boolean;
}

export interface AiApiErrorResponse {
  ok: false;
  code: AiErrorCode;
  message: string;
}
