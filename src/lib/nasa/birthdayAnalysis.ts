import type { BirthdayResult, BirthdayVariableScan } from "../../types/birthday.ts";
import {
  MIN_ANALYSIS_YEARS,
  VARIABLE_IDS,
  VARIABLE_UNIT_MAP,
  type VariableId,
} from "../../types/investigation.ts";
import { analyzeTrend } from "../stats/analyzeTrend.ts";
import { benjaminiHochberg } from "../stats/benjaminiHochberg.ts";
import { roundCoord } from "../validation/investigate.ts";
import { type AggregatedPoint, daysInMonth, parseNasaPowerMonthly } from "./aggregate.ts";
import { ClientInvestigationError } from "./clientInvestigate.ts";
import { fetchNasaPowerMonthly } from "./powerClient.ts";

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Builds one series point per year for a single calendar month (the user's birth month),
 * converting to the same canonical units `aggregateMonthlySeries` uses for a season
 * (total mm for `PRECTOTCORR`, Soil Wetness Index 0-100 for `GWETROOT`, mean °C otherwise) —
 * but across exactly one month per year instead of a multi-month window.
 */
export function filterToBirthMonth(
  raw: Record<string, number>,
  variable: VariableId,
  birthMonth: number,
  startYear: number,
  endYear: number,
): AggregatedPoint[] {
  const readings = parseNasaPowerMonthly(raw);
  const points: AggregatedPoint[] = [];

  for (const r of readings) {
    if (r.month !== birthMonth || r.year < startYear || r.year > endYear) continue;
    const value =
      variable === "PRECTOTCORR"
        ? roundTo(r.value * daysInMonth(r.year, r.month), 2)
        : roundTo(variable === "GWETROOT" ? r.value * 100 : r.value, 2);
    points.push({ year: r.year, label: String(r.year), value });
  }

  return points;
}

/**
 * Picks the "headline" variable from a 4-variable FDR-adjusted scan: the FDR-significant
 * result with the largest |z-score|, or — if none are significant — the single largest
 * |z-score| among all 4 (so the card always has something to show, honestly labeled
 * `INSUFFICIENT_EVIDENCE` by the existing verdict logic when nothing is actually significant).
 */
export function pickHeadlineScan(scans: readonly BirthdayVariableScan[]): BirthdayVariableScan {
  const significant = scans.filter((s) => s.fdrSignificant);
  const pool = significant.length > 0 ? significant : scans;
  return pool.reduce((best, current) =>
    Math.abs(current.stats.zScore) > Math.abs(best.stats.zScore) ? current : best,
  );
}

export interface BirthdayAnalysisParams {
  lat: number;
  lon: number;
  label?: string;
  birthDate: string;
  birthMonth: number;
  effectiveStartYear: number;
  endYear: number;
}

/**
 * Runs the "Your Timeline" analysis: fetches all 4 NASA POWER variables, filters each to the
 * user's birth month across every year since `effectiveStartYear`, runs the canonical
 * Mann-Kendall/Sen's Slope engine on each, FDR-adjusts the 4 p-values (Benjamini-Hochberg,
 * same method as `scanAllVariablesWithFdr`), and picks the strongest trend as the headline.
 */
export async function analyzeBirthday(params: BirthdayAnalysisParams): Promise<BirthdayResult> {
  const roundLat = roundCoord(params.lat);
  const roundLon = roundCoord(params.lon);

  const scans = await Promise.all(
    VARIABLE_IDS.map(async (variable) => {
      let raw: Record<string, number>;
      try {
        raw = await fetchNasaPowerMonthly({
          lat: roundLat,
          lon: roundLon,
          variable,
          startYear: params.effectiveStartYear,
          endYear: params.endYear,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "NASA_UPSTREAM_ERROR";
        throw new ClientInvestigationError(
          message.includes("TIMEOUT") ? "NASA_UPSTREAM_TIMEOUT" : "NASA_UPSTREAM_ERROR",
          "NASA POWER archive is temporarily unavailable.",
        );
      }

      const points = filterToBirthMonth(
        raw,
        variable,
        params.birthMonth,
        params.effectiveStartYear,
        params.endYear,
      );
      if (points.length === 0) {
        throw new ClientInvestigationError(
          "NO_DATA_ALL_MISSING",
          "No evidence available for this birth month at these coordinates (all values missing/-999).",
        );
      }
      if (points.length < MIN_ANALYSIS_YEARS) {
        throw new ClientInvestigationError(
          "INSUFFICIENT_YEARS",
          `At least ${MIN_ANALYSIS_YEARS} years of data are required for this birth month.`,
        );
      }

      const { stats, series } = analyzeTrend(points, variable);
      return { variable, unit: VARIABLE_UNIT_MAP[variable], stats, series };
    }),
  );

  const fdr = benjaminiHochberg(
    scans.map((s) => s.stats.pValue),
    0.05,
  );

  const allScans: BirthdayVariableScan[] = scans.map((s, idx) => ({
    ...s,
    qValue: fdr.adjustedPValues[idx] ?? s.stats.pValue,
    fdrSignificant: fdr.significant[idx] ?? s.stats.pValue < 0.05,
  }));

  const headline = pickHeadlineScan(allScans);
  const resolvedLabel = params.label || `${params.lat.toFixed(2)}, ${params.lon.toFixed(2)}`;

  return {
    location: { label: resolvedLabel, lat: params.lat, lon: params.lon },
    birthDate: params.birthDate,
    birthMonth: params.birthMonth,
    effectiveStartYear: params.effectiveStartYear,
    endYear: params.endYear,
    headline,
    allScans,
  };
}
