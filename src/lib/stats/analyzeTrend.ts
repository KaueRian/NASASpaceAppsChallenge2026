import type {
  SeriesPoint,
  TrendDirection,
  TrendStats,
  VariableId,
  VerdictLevel,
} from "../../types/investigation.ts";
import type { AggregatedPoint } from "../nasa/aggregate.ts";
import { mannKendallTest } from "./mannKendall.ts";
import { lag1Autocorrelation, linearRegression } from "./regression.ts";
import { sensSlope } from "./sensSlope.ts";

function mapVerdict(confidenceLevel: 99 | 95 | 0): VerdictLevel {
  if (confidenceLevel === 99) return "STRONG_EVIDENCE";
  if (confidenceLevel === 95) return "EVIDENCE_CONFIRMED";
  return "INSUFFICIENT_EVIDENCE";
}

function mapDirection(
  variable: VariableId,
  verdict: VerdictLevel,
  slopePerYear: number,
): TrendDirection {
  if (verdict === "INSUFFICIENT_EVIDENCE" || slopePerYear === 0) {
    return "neutral";
  }
  if (variable === "T2M" || variable === "T2M_MIN") {
    return slopePerYear > 0 ? "warming" : "cooling";
  }
  return slopePerYear > 0 ? "wetter" : "drier";
}

/**
 * Runs Mann-Kendall, Sen's Slope (with 95% CI), OLS regression, lag-1 autocorrelation,
 * and full-period anomaly scoring on an aggregated series.
 */
export function analyzeTrend(
  points: readonly AggregatedPoint[],
  variable: VariableId,
): { stats: TrendStats; series: SeriesPoint[] } {
  const years = points.map((p) => p.year);
  const values = points.map((p) => p.value);
  const n = points.length;

  const mk = mannKendallTest(values);
  const sen = sensSlope(years, values, mk.variance);
  const ols = linearRegression(years, values);
  const ac = lag1Autocorrelation(values);

  const mean = values.reduce((acc, v) => acc + v, 0) / n;
  const variance = n > 1 ? values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  const verdict = mapVerdict(mk.confidenceLevel);
  const direction = mapDirection(variable, verdict, sen.slopePerYear);

  const series: SeriesPoint[] = points.map((p, idx) => {
    const zScore = stdDev > 0 ? Number(((p.value - mean) / stdDev).toFixed(3)) : 0;
    return {
      year: p.year,
      label: p.label,
      value: p.value,
      trendValue: sen.trendLine[idx],
      zScore,
      isExtremeAnomaly: Math.abs(zScore) > 1.5,
    };
  });

  const stats: TrendStats = {
    mannKendallS: mk.s,
    mannKendallVariance: Number(mk.variance.toFixed(4)),
    zScore: Number(mk.zScore.toFixed(4)),
    pValue: Number(mk.pValue.toFixed(6)),
    confidenceLevel: mk.confidenceLevel,
    senSlopePerYear: Number(sen.slopePerYear.toFixed(5)),
    senSlopePerDecade: Number(sen.slopePerDecade.toFixed(4)),
    senSlopeCiLowerPerYear: Number(sen.ciLowerPerYear.toFixed(5)),
    senSlopeCiUpperPerYear: Number(sen.ciUpperPerYear.toFixed(5)),
    senSlopeCiLowerPerDecade: Number(sen.ciLowerPerDecade.toFixed(4)),
    senSlopeCiUpperPerDecade: Number(sen.ciUpperPerDecade.toFixed(4)),
    totalChangeOverPeriod: Number(sen.totalChange.toFixed(3)),
    olsSlopePerYear: Number(ols.slopePerYear.toFixed(5)),
    rSquared: Number(ols.rSquared.toFixed(4)),
    lag1Autocorrelation: Number(ac.r1.toFixed(4)),
    warnings: {
      shortRecord: n < 30,
      highAutocorrelation: ac.hasHighAutocorrelation,
    },
    fullPeriodMean: Number(mean.toFixed(3)),
    fullPeriodStdDev: Number(stdDev.toFixed(3)),
    startYear: years[0],
    endYear: years[n - 1],
    nYears: n,
    verdict,
    direction,
  };

  return { stats, series };
}
