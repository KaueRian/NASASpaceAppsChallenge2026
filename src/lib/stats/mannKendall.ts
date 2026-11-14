import type { ConfidenceLevel } from "../../types/investigation.ts";

export interface MannKendallResult {
  s: number;
  variance: number;
  zScore: number;
  pValue: number;
  confidenceLevel: ConfidenceLevel;
}

/** Complementary error function `erfc(x)` for x >= 0 (Abramowitz & Stegun 7.1.26). */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const tau =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? tau : 2 - tau;
}

/** Two-sided normal p-value from Z-score. */
function twoSidedNormalPValue(z: number): number {
  if (z === 0) return 1;
  return Math.min(1, Math.max(0, erfc(Math.abs(z) / Math.SQRT2)));
}

/**
 * Non-parametric Mann-Kendall trend test with exact tie-corrected variance.
 */
export function mannKendallTest(values: readonly number[]): MannKendallResult {
  const n = values.length;
  if (n < 2) {
    return { s: 0, variance: 0, zScore: 0, pValue: 1, confidenceLevel: 0 };
  }

  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = values[j] - values[i];
      if (diff > 0) s += 1;
      else if (diff < 0) s -= 1;
    }
  }

  const tieCounts = new Map<number, number>();
  for (const v of values) {
    tieCounts.set(v, (tieCounts.get(v) ?? 0) + 1);
  }

  let tieCorrection = 0;
  for (const t of tieCounts.values()) {
    if (t > 1) {
      tieCorrection += t * (t - 1) * (2 * t + 5);
    }
  }

  const variance = (n * (n - 1) * (2 * n + 5) - tieCorrection) / 18;

  let zScore = 0;
  if (variance > 0) {
    if (s > 0) zScore = (s - 1) / Math.sqrt(variance);
    else if (s < 0) zScore = (s + 1) / Math.sqrt(variance);
  }

  const pValue = twoSidedNormalPValue(zScore);
  const confidenceLevel: ConfidenceLevel = pValue < 0.01 ? 99 : pValue < 0.05 ? 95 : 0;

  return {
    s,
    variance,
    zScore,
    pValue,
    confidenceLevel,
  };
}
