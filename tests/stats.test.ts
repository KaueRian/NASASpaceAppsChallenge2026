import { describe, expect, it } from "vitest";
import { analyzeTrend } from "../src/lib/stats/analyzeTrend";
import { benjaminiHochberg } from "../src/lib/stats/benjaminiHochberg";
import { mannKendallTest } from "../src/lib/stats/mannKendall";
import { lag1Autocorrelation, linearRegression } from "../src/lib/stats/regression";
import { sensSlope } from "../src/lib/stats/sensSlope";

describe("Mann-Kendall trend test", () => {
  it("detects strong upward trend on a strictly increasing 15-year series", () => {
    const values = Array.from({ length: 15 }, (_, i) => 20 + i * 0.2);
    const mk = mannKendallTest(values);

    // S = n*(n-1)/2 = 15*14/2 = 105
    expect(mk.s).toBe(105);
    expect(mk.zScore).toBeGreaterThan(4.0);
    expect(mk.pValue).toBeLessThan(0.001);
    expect(mk.confidenceLevel).toBe(99);
  });

  it("detects strong downward trend on a strictly decreasing 15-year series", () => {
    const values = Array.from({ length: 15 }, (_, i) => 30 - i * 0.3);
    const mk = mannKendallTest(values);

    expect(mk.s).toBe(-105);
    expect(mk.zScore).toBeLessThan(-4.0);
    expect(mk.pValue).toBeLessThan(0.001);
    expect(mk.confidenceLevel).toBe(99);
  });

  it("applies tie correction to variance when repeated values exist", () => {
    // 15 values with tied groups of size 3 each: [1,1,1, 2,2,2, 3,3,3, 4,4,4, 5,5,5]
    const values = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5];
    const mk = mannKendallTest(values);

    // Standard Var without ties = 15*14*35 / 18 = 408.333...
    // 5 tie groups of t=3: 5 * 3*2*11 = 330 -> (7350 - 330) / 18 = 390
    expect(mk.variance).toBeCloseTo(390, 5);
    expect(mk.s).toBe(90);
  });

  it("returns insufficient evidence on alternating/flat series", () => {
    const values = [10, 12, 10, 12, 10, 12, 10, 12, 10, 12, 10, 12, 10, 12, 10];
    const mk = mannKendallTest(values);

    expect(Math.abs(mk.s)).toBeLessThanOrEqual(1);
    expect(mk.pValue).toBeGreaterThanOrEqual(0.05);
    expect(mk.confidenceLevel).toBe(0);
  });
});

describe("Sen's Slope estimator and 95% confidence interval", () => {
  it("recovers exact slope and tight 95% CI on a noiseless linear series", () => {
    const years = Array.from({ length: 20 }, (_, i) => 1981 + i);
    const values = years.map((y) => 22 + 0.05 * (y - 1981));
    const sen = sensSlope(years, values);

    expect(sen.slopePerYear).toBeCloseTo(0.05, 6);
    expect(sen.slopePerDecade).toBeCloseTo(0.5, 6);
    expect(sen.ciLowerPerYear).toBeCloseTo(0.05, 6);
    expect(sen.ciUpperPerYear).toBeCloseTo(0.05, 6);
    expect(sen.ciLowerPerDecade).toBeCloseTo(0.5, 6);
    expect(sen.ciUpperPerDecade).toBeCloseTo(0.5, 6);
    expect(sen.totalChange).toBeCloseTo(0.05 * 19, 6);
    expect(sen.trendLine[0]).toBeCloseTo(22, 6);
    expect(sen.trendLine[19]).toBeCloseTo(22.95, 6);
  });

  it("remains robust against a single extreme outlier and brackets the true slope in its 95% CI", () => {
    const years = Array.from({ length: 15 }, (_, i) => 2000 + i);
    const values = years.map((y, idx) => (idx === 7 ? 999 : 20 + 0.1 * (y - 2000)));
    const sen = sensSlope(years, values);

    expect(sen.slopePerYear).toBeCloseTo(0.1, 4);
    expect(sen.ciLowerPerYear).toBeLessThanOrEqual(sen.slopePerYear);
    expect(sen.ciUpperPerYear).toBeGreaterThanOrEqual(sen.slopePerYear);
  });
});

describe("OLS Linear Regression, Lag-1 Autocorrelation & Benjamini-Hochberg FDR", () => {
  it("computes OLS slope, intercept, and rSquared = 1 on a linear series", () => {
    const years = Array.from({ length: 15 }, (_, i) => 2000 + i);
    const values = years.map((y) => 15 + 0.25 * (y - 2000));
    const ols = linearRegression(years, values);

    expect(ols.slopePerYear).toBeCloseTo(0.25, 6);
    expect(ols.intercept).toBeCloseTo(15, 6);
    expect(ols.rValue).toBeCloseTo(1, 6);
    expect(ols.rSquared).toBeCloseTo(1, 6);
  });

  it("detects high lag-1 autocorrelation on a smooth monotonic series", () => {
    const values = Array.from({ length: 30 }, (_, i) => 10 + i * 0.5);
    const ac = lag1Autocorrelation(values);

    expect(ac.r1).toBeGreaterThan(0.8);
    expect(ac.hasHighAutocorrelation).toBe(true);
  });

  it("applies Benjamini-Hochberg step-up FDR correction accurately", () => {
    const rawP = [0.001, 0.012, 0.04, 0.2];
    const bh = benjaminiHochberg(rawP, 0.05);

    // m=4:
    // rank 1 (0.001): 0.001 * 4 / 1 = 0.004
    // rank 2 (0.012): 0.012 * 4 / 2 = 0.024
    // rank 3 (0.040): 0.040 * 4 / 3 = 0.053333
    // rank 4 (0.200): 0.200 * 4 / 4 = 0.200
    expect(bh.adjustedPValues[0]).toBeCloseTo(0.004, 5);
    expect(bh.adjustedPValues[1]).toBeCloseTo(0.024, 5);
    expect(bh.adjustedPValues[2]).toBeCloseTo(0.053333, 5);
    expect(bh.adjustedPValues[3]).toBeCloseTo(0.2, 5);
    expect(bh.significant).toEqual([true, true, false, false]);
  });
});

describe("Full trend analysis (anomalies, verdicts, CI & warnings)", () => {
  it("flags extreme anomalies (|z| > 1.5), populates CI + R^2 + warnings, and maps verdict + direction", () => {
    const points = Array.from({ length: 20 }, (_, i) => ({
      year: 1981 + i,
      label: String(1981 + i),
      value: 20 + i * 0.1 + (i === 19 ? 2.5 : 0),
    }));

    const { stats, series } = analyzeTrend(points, "T2M_MIN");

    expect(stats.verdict).toBe("STRONG_EVIDENCE");
    expect(stats.direction).toBe("warming");
    expect(stats.nYears).toBe(20);
    expect(stats.senSlopeCiLowerPerDecade).toBeDefined();
    expect(stats.senSlopeCiUpperPerDecade).toBeDefined();
    expect(stats.rSquared).toBeGreaterThan(0.5);
    expect(stats.warnings?.shortRecord).toBe(true); // 20 < 30 years
    expect(series[19].isExtremeAnomaly).toBe(true);
    expect(series[19].zScore).toBeGreaterThan(1.5);
  });

  it("maps neutral direction when evidence is insufficient", () => {
    const points = Array.from({ length: 16 }, (_, i) => ({
      year: 1990 + i,
      label: String(1990 + i),
      value: i % 2 === 0 ? 100 : 102,
    }));

    const { stats } = analyzeTrend(points, "PRECTOTCORR");
    expect(stats.verdict).toBe("INSUFFICIENT_EVIDENCE");
    expect(stats.direction).toBe("neutral");
  });
});
