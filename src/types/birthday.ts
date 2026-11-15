import type {
  InvestigationErrorCode,
  LocationInfo,
  SeriesPoint,
  TrendStats,
  VariableId,
  VariableUnit,
} from "./investigation.ts";

/** Earliest birth year accepted as a sanity floor (not a satellite-coverage limit). */
export const MIN_BIRTH_YEAR = 1900;

export interface BirthdayQueryInput {
  /** ISO `yyyy-mm-dd`, as produced by `<input type="date">`. */
  birthDate?: string;
  lat?: string;
  lon?: string;
  label?: string;
}

export interface ValidatedBirthdayQuery {
  birthDate: string;
  birthYear: number;
  birthMonth: number;
  /** `max(birthYear, DEFAULT_START_YEAR)` — NASA POWER coverage starts in 1981. */
  effectiveStartYear: number;
  endYear: number;
  lat: number;
  lon: number;
  label?: string;
}

export type BirthdayValidationResult =
  | { ok: true; data: ValidatedBirthdayQuery }
  | { ok: false; code: InvestigationErrorCode; message: string };

/** One of the 4 NASA POWER variables scanned for the user's birth month, FDR-adjusted. */
export interface BirthdayVariableScan {
  variable: VariableId;
  unit: VariableUnit;
  stats: TrendStats;
  series: SeriesPoint[];
  qValue: number;
  fdrSignificant: boolean;
}

export interface BirthdayResult {
  location: LocationInfo;
  birthDate: string;
  birthMonth: number;
  effectiveStartYear: number;
  endYear: number;
  /** The headline variable: the FDR-significant scan with the largest |z-score| (or, if none
   * are significant, the single largest |z-score| among all 4). */
  headline: BirthdayVariableScan;
  allScans: BirthdayVariableScan[];
}
