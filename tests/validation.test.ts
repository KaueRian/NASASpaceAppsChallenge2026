import { describe, expect, it } from "vitest";
import {
  buildNasaCacheKey,
  buildSelectableYears,
  getMaxCompleteYear,
  isValidPeriodRange,
  roundCoord,
  validateGeocodeQuery,
  validateInvestigateQuery,
} from "../src/lib/validation/investigate.ts";

describe("validateInvestigateQuery", () => {
  it("accepts valid parameters and applies default years and rounded coords", () => {
    const res = validateInvestigateQuery({
      lat: "-12.7406",
      lon: "-60.1458",
      variable: "PRECTOTCORR",
      season: "apr_sep",
      label: "Vilhena, RO",
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual({
      lat: -12.7406,
      lon: -60.1458,
      variable: "PRECTOTCORR",
      season: "apr_sep",
      startYear: 1981,
      endYear: 2025,
      label: "Vilhena, RO",
    });
  });

  it("rejects out-of-bounds or non-numeric coordinates", () => {
    const cases = [
      { lat: "91", lon: "0" },
      { lat: "-90.1", lon: "0" },
      { lat: "0", lon: "180.5" },
      { lat: "0", lon: "-181" },
      { lat: "abc", lon: "10" },
      { lat: undefined, lon: "10" },
    ];

    for (const coords of cases) {
      const res = validateInvestigateQuery({
        ...coords,
        variable: "T2M",
        season: "annual",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("INVALID_COORDINATES");
      }
    }
  });

  it("rejects unsupported variables and seasons", () => {
    const badVar = validateInvestigateQuery({
      lat: "0",
      lon: "0",
      variable: "WIND",
      season: "annual",
    });
    expect(badVar.ok).toBe(false);
    if (!badVar.ok) expect(badVar.code).toBe("INVALID_VARIABLE");

    const badSeason = validateInvestigateQuery({
      lat: "0",
      lon: "0",
      variable: "T2M",
      season: "winter",
    });
    expect(badSeason.ok).toBe(false);
    if (!badSeason.ok) expect(badSeason.code).toBe("INVALID_SEASON");
  });

  it("enforces minimum 15-year span and valid MERRA-2 year bounds", () => {
    const tooShort = validateInvestigateQuery({
      lat: "0",
      lon: "0",
      variable: "T2M",
      season: "annual",
      startYear: "2015",
      endYear: "2025",
    });
    expect(tooShort.ok).toBe(false);
    if (!tooShort.ok) expect(tooShort.code).toBe("INSUFFICIENT_YEARS");

    const reversed = validateInvestigateQuery({
      lat: "0",
      lon: "0",
      variable: "T2M",
      season: "annual",
      startYear: "2020",
      endYear: "2000",
    });
    expect(reversed.ok).toBe(false);
    if (!reversed.ok) expect(reversed.code).toBe("INSUFFICIENT_YEARS");

    const tooEarly = validateInvestigateQuery({
      lat: "0",
      lon: "0",
      variable: "T2M",
      season: "annual",
      startYear: "1970",
      endYear: "2025",
    });
    expect(tooEarly.ok).toBe(false);
    if (!tooEarly.ok) expect(tooEarly.code).toBe("INSUFFICIENT_YEARS");
  });

  it("builds deterministic D1 cache keys rounded to 2 decimal places", () => {
    expect(roundCoord(-12.7406)).toBe(-12.74);
    expect(roundCoord(-60.1458)).toBe(-60.15);
    expect(buildNasaCacheKey(-12.7406, -60.1458, "T2M", 1981, 2025)).toBe(
      "-12.74:-60.15:T2M:1981:2025",
    );
  });
  it("validates period ranges and builds selectable year lists through the last complete year", () => {
    expect(getMaxCompleteYear(new Date("2026-11-14T00:00:00Z"))).toBe(2025);
    expect(getMaxCompleteYear(new Date("2027-02-01T00:00:00Z"))).toBe(2026);

    const years = buildSelectableYears(2025);
    expect(years[0]).toBe(1981);
    expect(years[years.length - 1]).toBe(2025);
    expect(years).toHaveLength(45);

    const currentYear = new Date().getUTCFullYear();
    const withCurrent = buildSelectableYears(2025, [currentYear]);
    expect(withCurrent).toContain(currentYear);

    expect(isValidPeriodRange(2011, 2025)).toBe(true);
    expect(isValidPeriodRange(2012, 2025)).toBe(false);
    expect(isValidPeriodRange(2025, 2010)).toBe(false);
    expect(isValidPeriodRange(1980, 2025)).toBe(false);
  });
});

describe("validateGeocodeQuery", () => {
  it("trims and enforces minimum 2 characters", () => {
    expect(validateGeocodeQuery("  Vilhena  ")).toEqual({ ok: true, query: "Vilhena" });
    expect(validateGeocodeQuery("a")).toEqual({
      ok: false,
      code: "GEOCODE_NOT_FOUND",
      message: "Search query must be at least 2 characters.",
    });
    expect(validateGeocodeQuery("   ").ok).toBe(false);
  });
});
