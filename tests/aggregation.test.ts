import { describe, expect, it } from "vitest";
import {
  aggregateMonthlySeries,
  daysInMonth,
  parseNasaPowerMonthly,
} from "../src/lib/nasa/aggregate";
import { NASA_MISSING_VALUE } from "../src/types/investigation";

describe("NASA POWER monthly parsing & filtering", () => {
  it("computes days in month accurately including leap years", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2024, 4)).toBe(30);
    expect(daysInMonth(2024, 1)).toBe(31);
  });

  it("ignores YYYY13 annual summary keys and -999 sentinel values", () => {
    const raw: Record<string, number> = {
      "202001": 25.4,
      "202002": NASA_MISSING_VALUE,
      "202003": 26.1,
      "202013": 25.8,
      "202101": Number.NaN,
    };

    const parsed = parseNasaPowerMonthly(raw);
    expect(parsed).toEqual([
      { year: 2020, month: 1, value: 25.4 },
      { year: 2020, month: 3, value: 26.1 },
    ]);
  });

  it("throws NO_DATA_ALL_MISSING when every monthly reading is -999", () => {
    const raw: Record<string, number> = {
      "202001": NASA_MISSING_VALUE,
      "202002": NASA_MISSING_VALUE,
    };
    expect(() => aggregateMonthlySeries(raw, "GWETROOT", "annual", 2020, 2020)).toThrow(
      "NO_DATA_ALL_MISSING",
    );
  });
});

describe("Seasonal & annual aggregation with canonical units", () => {
  it("computes annual mean for T2M and scales GWETROOT by 100", () => {
    const raw: Record<string, number> = {};
    for (let y = 1981; y <= 1995; y++) {
      for (let m = 1; m <= 12; m++) {
        raw[`${y}${String(m).padStart(2, "0")}`] = 0.65;
      }
    }

    const gwet = aggregateMonthlySeries(raw, "GWETROOT", "annual", 1981, 1995);
    expect(gwet).toHaveLength(15);
    expect(gwet[0]).toEqual({ year: 1981, label: "1981", value: 65 });
  });

  it("sums monthly mm/day * daysInMonth for PRECTOTCORR annual totals", () => {
    const raw: Record<string, number> = {};
    // 2000 is a leap year (366 days), 2001 is non-leap (365 days)
    for (let y = 2000; y <= 2015; y++) {
      for (let m = 1; m <= 12; m++) {
        raw[`${y}${String(m).padStart(2, "0")}`] = 10;
      }
    }

    const precip = aggregateMonthlySeries(raw, "PRECTOTCORR", "annual", 2000, 2015);
    expect(precip[0]).toEqual({ year: 2000, label: "2000", value: 3660 });
    expect(precip[1]).toEqual({ year: 2001, label: "2001", value: 3650 });
  });

  it("labels cross-year oct_mar seasons as YYYY/YY and drops incomplete edge seasons", () => {
    const raw: Record<string, number> = {};
    for (let y = 1981; y <= 1996; y++) {
      for (let m = 1; m <= 12; m++) {
        raw[`${y}${String(m).padStart(2, "0")}`] = 20 + (y - 1981);
      }
    }

    // 1981 Jan-Mar has no Oct-Dec 1980, so first complete oct_mar is 1981/82 (ending 1982)
    // Last complete oct_mar within 1981..1996 is 1995/96 (ending 1996) -> 15 seasons
    const wet = aggregateMonthlySeries(raw, "T2M", "oct_mar", 1981, 1996);
    expect(wet).toHaveLength(15);
    expect(wet[0].year).toBe(1982);
    expect(wet[0].label).toBe("1981/82");
    expect(wet[14].year).toBe(1996);
    expect(wet[14].label).toBe("1995/96");
  });

  it("drops seasons with too many missing months and enforces minimum 15 years", () => {
    const raw: Record<string, number> = {};
    for (let y = 1981; y <= 1995; y++) {
      for (let m = 1; m <= 12; m++) {
        // Corrupt 1985 with 4 missing months -> annual 1985 dropped -> only 14 valid years remain
        const isMissing = y === 1985 && m <= 4;
        raw[`${y}${String(m).padStart(2, "0")}`] = isMissing ? NASA_MISSING_VALUE : 25;
      }
    }

    expect(() => aggregateMonthlySeries(raw, "T2M", "annual", 1981, 1995)).toThrow(
      "INSUFFICIENT_YEARS",
    );
  });
});
