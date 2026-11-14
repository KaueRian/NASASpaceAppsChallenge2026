import { mannKendallTest } from "./mannKendall.ts";

export interface SensSlopeResult {
  slopePerYear: number;
  slopePerDecade: number;
  ciLowerPerYear: number;
  ciUpperPerYear: number;
  ciLowerPerDecade: number;
  ciUpperPerDecade: number;
  totalChange: number;
  intercept: number;
  trendLine: number[];
}

const Z_95 = 1.959963984540054;

function median(sorted: readonly number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function interpolateSortedRank(sorted: readonly number[], rankZeroBased: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  if (rankZeroBased <= 0) return sorted[0];
  if (rankZeroBased >= n - 1) return sorted[n - 1];
  const lowerIdx = Math.floor(rankZeroBased);
  const upperIdx = Math.ceil(rankZeroBased);
  if (lowerIdx === upperIdx) return sorted[lowerIdx];
  const weight = rankZeroBased - lowerIdx;
  return sorted[lowerIdx] * (1 - weight) + sorted[upperIdx] * weight;
}

/**
 * Computes Sen's non-parametric median slope estimator, 95% Gilbert/Hollander-Wolfe
 * confidence interval, and fitted trendline.
 */
export function sensSlope(
  years: readonly number[],
  values: readonly number[],
  mkVarianceOverride?: number,
): SensSlopeResult {
  const n = Math.min(years.length, values.length);
  if (n < 2) {
    return {
      slopePerYear: 0,
      slopePerDecade: 0,
      ciLowerPerYear: 0,
      ciUpperPerYear: 0,
      ciLowerPerDecade: 0,
      ciUpperPerDecade: 0,
      totalChange: 0,
      intercept: values[0] ?? 0,
      trendLine: [...values],
    };
  }

  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dt = years[j] - years[i];
      if (dt !== 0) {
        slopes.push((values[j] - values[i]) / dt);
      }
    }
  }

  slopes.sort((a, b) => a - b);
  const slopePerYear = median(slopes);
  const slopePerDecade = slopePerYear * 10;

  const mkVariance = mkVarianceOverride ?? mannKendallTest(values.slice(0, n)).variance;
  const cAlpha = Z_95 * Math.sqrt(Math.max(0, mkVariance));
  const numPairs = slopes.length;
  // Gilbert (1987) / scipy.stats.theilslopes 0-based rank bounds:
  const m1 = (numPairs - cAlpha) / 2 - 0.5;
  const m2 = (numPairs + cAlpha) / 2 - 0.5;
  const ciLowerPerYear = interpolateSortedRank(slopes, m1);
  const ciUpperPerYear = interpolateSortedRank(slopes, m2);
  const ciLowerPerDecade = ciLowerPerYear * 10;
  const ciUpperPerDecade = ciUpperPerYear * 10;

  const baseYear = years[0];
  const totalChange = slopePerYear * (years[n - 1] - baseYear);

  const residuals = years
    .slice(0, n)
    .map((y, idx) => values[idx] - slopePerYear * (y - baseYear))
    .sort((a, b) => a - b);
  const intercept = median(residuals);

  const trendLine = years
    .slice(0, n)
    .map((y) => Number((intercept + slopePerYear * (y - baseYear)).toFixed(4)));

  return {
    slopePerYear,
    slopePerDecade,
    ciLowerPerYear,
    ciUpperPerYear,
    ciLowerPerDecade,
    ciUpperPerDecade,
    totalChange,
    intercept,
    trendLine,
  };
}
