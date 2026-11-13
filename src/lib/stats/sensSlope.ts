export interface SensSlopeResult {
  slopePerYear: number;
  slopePerDecade: number;
  totalChange: number;
  intercept: number;
  trendLine: number[];
}

function median(sorted: readonly number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Computes Sen's non-parametric median slope estimator and fitted trendline.
 */
export function sensSlope(years: readonly number[], values: readonly number[]): SensSlopeResult {
  const n = Math.min(years.length, values.length);
  if (n < 2) {
    return {
      slopePerYear: 0,
      slopePerDecade: 0,
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
    totalChange,
    intercept,
    trendLine,
  };
}
