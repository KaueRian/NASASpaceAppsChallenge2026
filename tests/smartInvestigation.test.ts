import { describe, expect, it, vi } from "vitest";
import {
  getQuickCitySuggestions,
  getRecommendedSeason,
  QUICK_CITY_SUGGESTIONS,
  scanAllVariablesWithFdr,
  searchCitiesClientSide,
} from "../src/lib/nasa/smartInvestigation";

describe("smartInvestigation helpers", () => {
  it("recommends apr_sep for PRECTOTCORR in the Southern Hemisphere and annual elsewhere", () => {
    expect(getRecommendedSeason("PRECTOTCORR", -12.74)).toBe("apr_sep");
    expect(getRecommendedSeason("PRECTOTCORR", -3.12)).toBe("apr_sep");
    expect(getRecommendedSeason("PRECTOTCORR", 45.0)).toBe("annual");
    expect(getRecommendedSeason("T2M", -12.74)).toBe("annual");
    expect(getRecommendedSeason("T2M_MIN", -9.91)).toBe("annual");
    expect(getRecommendedSeason("GWETROOT", -19.01)).toBe("annual");
  });

  it("provides instant quick city suggestions and filters them by substring", () => {
    const all = getQuickCitySuggestions("");
    expect(all.length).toBe(QUICK_CITY_SUGGESTIONS.length);
    expect(all[0]?.label).toContain("Vilhena");

    const filtered = getQuickCitySuggestions("ariquemes");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.label).toBe("Ariquemes, RO, Brazil");

    expect(getQuickCitySuggestions("sao paulo")[0]?.label).toBe("São Paulo, SP, Brazil");
    expect(getQuickCitySuggestions("belem")[0]?.label).toBe("Belém, PA, Brazil");
    expect(getQuickCitySuggestions("barreiras")[0]?.label).toBe("Barreiras (MATOPIBA), BA, Brazil");
  });

  it("searches cities via /api/geocode and falls back gracefully when offline", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    try {
      const results = await searchCitiesClientSide("Vilhena");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.label).toContain("Vilhena");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("scans all 4 variables with Benjamini-Hochberg FDR adjustment", async () => {
    const fakeMonthly: Record<string, number> = {};
    for (let year = 1981; year <= 2025; year++) {
      const offset = (year - 1981) * 0.08;
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, "0");
        fakeMonthly[`${year}${mm}`] = Number((22 + offset + m * 0.1).toFixed(2));
      }
    }

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const match = url.match(/parameters=([A-Z0-9_]+)/);
      const param = match?.[1] ?? "T2M";
      return new Response(
        JSON.stringify({
          properties: {
            parameter: {
              [param]: fakeMonthly,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    try {
      const items = await scanAllVariablesWithFdr({
        lat: -12.74,
        lon: -60.14,
        label: "Vilhena, RO, Brazil",
        startYear: 1981,
        endYear: 2025,
      });

      expect(items).toHaveLength(4);
      const prectot = items.find((item) => item.variable === "PRECTOTCORR");
      expect(prectot?.season).toBe("apr_sep");

      for (const item of items) {
        expect(item.qValue).toBeGreaterThanOrEqual(item.result.stats.pValue);
        expect(item.qValue).toBeLessThanOrEqual(1);
      }
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
