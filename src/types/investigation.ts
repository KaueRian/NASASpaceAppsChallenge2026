/**
 * Shared TypeScript API & Domain Contract for GeoTrend.
 * Single source of truth between frontend (`src/`) and backend (`functions/api/`).
 *
 * i18n-first rule: Backend returns structured numeric metrics and enum keys;
 * never return hardcoded English prose for user-facing report copy.
 */

export const VARIABLE_IDS = ["T2M", "T2M_MIN", "PRECTOTCORR", "GWETROOT"] as const;
export type VariableId = (typeof VARIABLE_IDS)[number];

/** Canonical display unit identifiers matching DESIGN.md §5.1 */
export type VariableUnit = "C" | "mm" | "pct";

export const VARIABLE_UNIT_MAP: Record<VariableId, VariableUnit> = {
  T2M: "C",
  T2M_MIN: "C",
  PRECTOTCORR: "mm",
  GWETROOT: "pct",
};

export const SEASON_IDS = ["annual", "oct_mar", "apr_sep"] as const;
export type SeasonId = (typeof SEASON_IDS)[number];

export type VerdictLevel = "STRONG_EVIDENCE" | "EVIDENCE_CONFIRMED" | "INSUFFICIENT_EVIDENCE";

export type ConfidenceLevel = 99 | 95 | 0;

export type TrendDirection = "warming" | "cooling" | "wetter" | "drier" | "neutral";

export const CASE_PRESET_IDS = ["01", "02", "03", "04"] as const;
export type CasePresetId = (typeof CASE_PRESET_IDS)[number];

export const INVESTIGATION_SCALES = ["local", "state", "national", "global"] as const;
export type InvestigationScale = (typeof INVESTIGATION_SCALES)[number];

export const INVESTIGATION_TOPICS = ["agro", "warming", "hydrology", "urban", "benchmark"] as const;
export type InvestigationTopic = (typeof INVESTIGATION_TOPICS)[number];

export const NASA_MISSING_VALUE = -999;
export const MIN_ANALYSIS_YEARS = 15;
export const DEFAULT_START_YEAR = 1981;
export const DEFAULT_END_YEAR = 2025;

export interface LocationInfo {
  /** Human-readable place name (or formatted coordinates if unresolved) */
  label: string;
  lat: number;
  lon: number;
}

export interface SeriesPoint {
  /** Calendar year (for `oct_mar`, the ending year — e.g. 2025 for "2024/25") */
  year: number;
  /** Display label on X axis (`"2024"` or `"2024/25"`) */
  label: string;
  /**
   * Aggregated observation in canonical unit:
   * - `T2M` / `T2M_MIN`: mean °C
   * - `PRECTOTCORR`: total mm (sum of monthly mm/day * days in month)
   * - `GWETROOT`: Soil Wetness Index 0-100 (%)
   */
  value: number;
  /** Fitted Sen's Slope trendline value for this point */
  trendValue: number;
  /** Anomaly standardized against full-period mean */
  zScore: number;
  /** True when |zScore| > 1.5 */
  isExtremeAnomaly: boolean;
}

export interface TrendWarnings {
  shortRecord: boolean;
  highAutocorrelation: boolean;
}

export interface TrendStats {
  mannKendallS: number;
  mannKendallVariance: number;
  zScore: number;
  /** Two-sided p-value */
  pValue: number;
  confidenceLevel: ConfidenceLevel;
  senSlopePerYear: number;
  senSlopePerDecade: number;
  /** 95% Gilbert/Hollander-Wolfe confidence interval bounds for Sen's slope */
  senSlopeCiLowerPerYear?: number;
  senSlopeCiUpperPerYear?: number;
  senSlopeCiLowerPerDecade?: number;
  senSlopeCiUpperPerDecade?: number;
  /** Headline metric: Sen's slope delta over the full investigated span */
  totalChangeOverPeriod: number;
  /** Ordinary least squares linear regression metrics */
  olsSlopePerYear?: number;
  rSquared?: number;
  /** Lag-1 serial autocorrelation coefficient r1 in [-1, 1] */
  lag1Autocorrelation?: number;
  /** Methodological caveat flags for inline disclosure */
  warnings?: TrendWarnings;
  fullPeriodMean: number;
  fullPeriodStdDev: number;
  startYear: number;
  endYear: number;
  nYears: number;
  verdict: VerdictLevel;
  direction: TrendDirection;
}

export interface SourceMetadata {
  provider: "NASA POWER / MERRA-2";
  resolution: "temporal/monthly/point";
  /** ISO date or YYYY-MM-DD when raw series was retrieved from NASA POWER */
  retrievedAt: string;
}

export interface InvestigationResult {
  presetId?: CasePresetId;
  location: LocationInfo;
  variable: VariableId;
  unit: VariableUnit;
  season: SeasonId;
  stats: TrendStats;
  series: SeriesPoint[];
  source: SourceMetadata;
  cached: boolean;
}

export interface CasePreset {
  id: CasePresetId;
  location: LocationInfo;
  variable: VariableId;
  defaultSeason: SeasonId;
  /** i18n key under locales/en.json & locales/pt.json */
  hookKey: string;
  result: InvestigationResult;
}

export interface GeocodeCandidate {
  name: string;
  admin1?: string;
  country: string;
  label: string;
  lat: number;
  lon: number;
}

/** Strictly structured payload — no public free-text fields allowed */
export interface CreateDossierRequest {
  lat: number;
  lon: number;
  locationLabel: string;
  variable: VariableId;
  season: SeasonId;
  startYear: number;
  endYear: number;
}

export interface SavedDossier {
  id: string;
  createdAt: string;
  result: InvestigationResult;
}

export interface CatalogInvestigation {
  id: string;
  presetId?: CasePresetId;
  scale: InvestigationScale;
  topic: InvestigationTopic;
  variable: VariableId;
  season: SeasonId;
  startYear: number;
  endYear: number;
  lat: number;
  lon: number;
  label: string;
  /** Key prefix under `cases.catalog.<key>` (or `cases.<presetId>`) in locales */
  titleKey: string;
  regionKey: string;
  hookKey: string;
  tags: readonly string[];
}

export type InvestigationErrorCode =
  | "INVALID_COORDINATES"
  | "INVALID_VARIABLE"
  | "INVALID_SEASON"
  | "INVALID_BIRTH_DATE"
  | "INVALID_FILTER"
  | "INSUFFICIENT_YEARS"
  | "NO_DATA_ALL_MISSING"
  | "NASA_UPSTREAM_TIMEOUT"
  | "NASA_UPSTREAM_ERROR"
  | "GEOCODE_NOT_FOUND"
  | "DOSSIER_NOT_FOUND";

export interface ApiErrorResponse {
  ok: false;
  code: InvestigationErrorCode;
  message: string;
}
