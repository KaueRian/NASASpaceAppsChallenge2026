import { describe, expect, it, vi } from "vitest";
import {
  analyzeBirthday,
  filterToBirthMonth,
  pickHeadlineScan,
} from "../src/lib/nasa/birthdayAnalysis.ts";
import { analyzeTrend } from "../src/lib/stats/analyzeTrend.ts";
import type { BirthdayVariableScan } from "../src/types/birthday.ts";

function makeScan(
  variable: "T2M" | "T2M_MIN" | "PRECTOTCORR" | "GWETROOT",
  zScore: number,
  fdrSignificant: boolean,
): BirthdayVariableScan {
  const points = [
    { year: 1990, label: "1990", value: 10 },
    { year: 2000, label: "2000", value: 11 },
    { year: 2010, label: "2010", value: 12 },
  ];
  const { stats, series } = analyzeTrend(points, variable);
  return {
    variable,
    unit: "C",
    stats: { ...stats, zScore },
    series,
    qValue: fdrSignificant ? 0.01 : 0.5,
    fdrSignificant,
  };
}

describe("filterToBirthMonth", () => {
  it("keeps only the target month across years and applies canonical unit conversion", () => {
    const raw: Record<string, number> = {
      "199007": 22.5,
      "199008": 30, // different month, must be excluded
      "200007": 23.1,
      "199013": -999, // annual summary row, excluded by parseNasaPowerMonthly
    };
    const points = filterToBirthMonth(raw, "T2M", 7, 1990, 2010);
    expect(points).toEqual([
      { year: 1990, label: "1990", value: 22.5 },
      { year: 2000, label: "2000", value: 23.1 },
    ]);
  });

  it("converts PRECTOTCORR mm/day into total monthly mm using days-in-month", () => {
    const raw: Record<string, number> = { "202102": 2 }; // Feb 2021, 28 days, non-leap
    const points = filterToBirthMonth(raw, "PRECTOTCORR", 2, 2021, 2021);
    expect(points).toEqual([{ year: 2021, label: "2021", value: 56 }]);
  });

  it("scales GWETROOT fraction to a 0-100 index", () => {
    const raw: Record<string, number> = { "201903": 0.42 };
    const points = filterToBirthMonth(raw, "GWETROOT", 3, 2019, 2019);
    expect(points).toEqual([{ year: 2019, label: "2019", value: 42 }]);
  });

  it("drops -999 sentinel values", () => {
    const raw: Record<string, number> = { "202001": -999, "202101": 15 };
    const points = filterToBirthMonth(raw, "T2M", 1, 2020, 2021);
    expect(points).toEqual([{ year: 2021, label: "2021", value: 15 }]);
  });
});

describe("pickHeadlineScan", () => {
  it("prefers the FDR-significant scan with the largest |z-score|", () => {
    const scans = [
      makeScan("T2M", 1.2, true),
      makeScan("T2M_MIN", 2.5, true),
      makeScan("PRECTOTCORR", 3.9, false),
      makeScan("GWETROOT", 0.4, false),
    ];
    expect(pickHeadlineScan(scans).variable).toBe("T2M_MIN");
  });

  it("falls back to the largest |z-score| among all 4 when none are FDR-significant", () => {
    const scans = [
      makeScan("T2M", 0.5, false),
      makeScan("T2M_MIN", 1.8, false),
      makeScan("PRECTOTCORR", 0.2, false),
      makeScan("GWETROOT", 0.9, false),
    ];
    expect(pickHeadlineScan(scans).variable).toBe("T2M_MIN");
  });
});

describe("analyzeBirthday", () => {
  it("scans all 4 variables for the birth month and FDR-adjusts across them", async () => {
    const fakeMonthly: Record<string, number> = {};
    for (let year = 1990; year <= 2025; year++) {
      const offset = (year - 1990) * 0.09;
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, "0");
        fakeMonthly[`${year}${mm}`] = Number((20 + offset + m * 0.1).toFixed(2));
      }
    }

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const match = url.match(/parameters=([A-Z0-9_]+)/);
      const param = match?.[1] ?? "T2M";
      return new Response(JSON.stringify({ properties: { parameter: { [param]: fakeMonthly } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    try {
      const result = await analyzeBirthday({
        lat: -12.74,
        lon: -60.14,
        label: "Vilhena, RO, Brazil",
        birthDate: "1990-07-14",
        birthMonth: 7,
        effectiveStartYear: 1990,
        endYear: 2025,
      });

      expect(result.allScans).toHaveLength(4);
      expect(result.headline).toBeDefined();
      expect(result.location.label).toBe("Vilhena, RO, Brazil");
      for (const scan of result.allScans) {
        expect(scan.qValue).toBeGreaterThanOrEqual(scan.stats.pValue);
      }
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("falls back to coordinate label when no city label is given", async () => {
    const fakeMonthly: Record<string, number> = {};
    for (let year = 1990; year <= 2025; year++) {
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, "0");
        fakeMonthly[`${year}${mm}`] = 20;
      }
    }
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const match = url.match(/parameters=([A-Z0-9_]+)/);
      const param = match?.[1] ?? "T2M";
      return new Response(JSON.stringify({ properties: { parameter: { [param]: fakeMonthly } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    try {
      const result = await analyzeBirthday({
        lat: -12.74,
        lon: -60.14,
        birthDate: "1990-07-14",
        birthMonth: 7,
        effectiveStartYear: 1990,
        endYear: 2025,
      });
      expect(result.location.label).toBe("-12.74, -60.14");
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
