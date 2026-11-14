import { describe, expect, it } from "vitest";
import { analyzeTrend } from "../src/lib/stats/analyzeTrend";
import { mannKendallTest } from "../src/lib/stats/mannKendall";
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

describe("Sen's Slope estimator", () => {
  it("recovers exact slope on a noiseless linear series", () => {
    const years = Array.from({ length: 20 }, (_, i) => 1981 + i);
    const values = years.map((y) => 22 + 0.05 * (y - 1981));
    const sen = sensSlope(years, values);

    expect(sen.slopePerYear).toBeCloseTo(0.05, 6);
    expect(sen.slopePerDecade).toBeCloseTo(0.5, 6);
    expect(sen.totalChange).toBeCloseTo(0.05 * 19, 6);
    expect(sen.trendLine[0]).toBeCloseTo(22, 6);
    expect(sen.trendLine[19]).toBeCloseTo(22.95, 6);
  });

  it("remains robust against a single extreme outlier", () => {
    const years = Array.from({ length: 15 }, (_, i) => 2000 + i);
    const values = years.map((y, idx) => (idx === 7 ? 999 : 20 + 0.1 * (y - 2000)));
    const sen = sensSlope(years, values);

    expect(sen.slopePerYear).toBeCloseTo(0.1, 4);
  });
});

describe("Full trend analysis (anomalies, verdicts & directions)", () => {
  it("flags extreme anomalies (|z| > 1.5) and maps verdict + direction", () => {
    const points = Array.from({ length: 20 }, (_, i) => ({
      year: 1981 + i,
      label: String(1981 + i),
      value: 20 + i * 0.1 + (i === 19 ? 2.5 : 0),
    }));

    const { stats, series } = analyzeTrend(points, "T2M_MIN");

    expect(stats.verdict).toBe("STRONG_EVIDENCE");
    expect(stats.direction).toBe("warming");
    expect(stats.nYears).toBe(20);
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
