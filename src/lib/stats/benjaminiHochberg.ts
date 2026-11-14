export interface BenjaminiHochbergResult {
  adjustedPValues: number[];
  significant: boolean[];
}

/**
 * Applies the Benjamini-Hochberg (1995) step-up False Discovery Rate (FDR) correction
 * across multiple simultaneous hypothesis tests (e.g. comparing multiple variables or locations).
 */
export function benjaminiHochberg(
  pValues: readonly number[],
  alpha = 0.05,
): BenjaminiHochbergResult {
  const m = pValues.length;
  if (m === 0) {
    return { adjustedPValues: [], significant: [] };
  }

  const indexed = pValues.map((p, idx) => ({
    idx,
    p: Math.max(0, Math.min(1, p)),
  }));
  indexed.sort((a, b) => a.p - b.p);

  const adjustedSorted = new Array<number>(m);
  let runningMin = 1;
  for (let i = m - 1; i >= 0; i--) {
    const rank = i + 1;
    const rawAdjusted = (indexed[i].p * m) / rank;
    runningMin = Math.min(runningMin, rawAdjusted, 1);
    adjustedSorted[i] = Number(runningMin.toFixed(6));
  }

  const adjustedPValues = new Array<number>(m);
  const significant = new Array<boolean>(m);
  for (let i = 0; i < m; i++) {
    const originalIdx = indexed[i].idx;
    adjustedPValues[originalIdx] = adjustedSorted[i];
    significant[originalIdx] = adjustedSorted[i] < alpha;
  }

  return { adjustedPValues, significant };
}
