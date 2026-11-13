import type {
  SeriesPoint,
  TrendDirection,
  TrendStats,
  VariableId,
  VerdictLevel,
} from "../../types/investigation";
import type { AggregatedPoint } from "../nasa/aggregate";
import { mannKendallTest } from "./mannKendall";
import { sensSlope } from "./sensSlope";

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
 * Runs Mann-Kendall, Sen's Slope, and full-period anomaly scoring on an aggregated series.
 */
export function analyzeTrend(
  points: readonly AggregatedPoint[],
  variable: VariableId,
): { stats: TrendStats; series: SeriesPoint[] } {
  const years = points.map((p) => p.year);
  const values = points.map((p) => p.value);
  const n = points.length;

  const mk = mannKendallTest(values);
  const sen = sensSlope(years, values);

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
    totalChangeOverPeriod: Number(sen.totalChange.toFixed(3)),
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
