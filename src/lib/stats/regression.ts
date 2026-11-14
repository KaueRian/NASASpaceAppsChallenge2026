export interface LinearRegressionResult {
  slopePerYear: number;
  intercept: number;
  rValue: number;
  rSquared: number;
}

export interface AutocorrelationResult {
  r1: number;
  hasHighAutocorrelation: boolean;
}

/**
 * Ordinary Least Squares (OLS) linear regression y = intercept + slopePerYear * (year - baseYear).
 */
export function linearRegression(
  years: readonly number[],
  values: readonly number[],
): LinearRegressionResult {
  const n = Math.min(years.length, values.length);
  if (n < 2) {
    return {
      slopePerYear: 0,
      intercept: values[0] ?? 0,
      rValue: 0,
      rSquared: 0,
    };
  }

  const baseYear = years[0];
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += years[i] - baseYear;
    sumY += values[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let covXY = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = years[i] - baseYear - meanX;
    const dy = values[i] - meanY;
    covXY += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX === 0) {
    return {
      slopePerYear: 0,
      intercept: meanY,
      rValue: 0,
      rSquared: 0,
    };
  }

  const slopePerYear = covXY / varX;
  const intercept = meanY - slopePerYear * meanX;
  const denom = Math.sqrt(varX * varY);
  const rValue = denom > 0 ? Math.max(-1, Math.min(1, covXY / denom)) : 0;
  const rSquared = rValue * rValue;

  return {
    slopePerYear,
    intercept,
    rValue,
    rSquared,
  };
}

/**
 * Computes lag-1 serial autocorrelation coefficient r1 and checks whether |r1| exceeds
 * the 95% white-noise bound (1.96 / sqrt(n)).
 */
export function lag1Autocorrelation(values: readonly number[]): AutocorrelationResult {
  const n = values.length;
  if (n < 3) {
    return { r1: 0, hasHighAutocorrelation: false };
  }

  const mean = values.reduce((acc, v) => acc + v, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i] - mean;
    denominator += d * d;
    if (i < n - 1) {
      numerator += d * (values[i + 1] - mean);
    }
  }

  if (denominator === 0) {
    return { r1: 0, hasHighAutocorrelation: false };
  }

  const r1 = Math.max(-1, Math.min(1, numerator / denominator));
  const threshold = 1.959963984540054 / Math.sqrt(n);
  return {
    r1,
    hasHighAutocorrelation: Math.abs(r1) > threshold,
  };
}
