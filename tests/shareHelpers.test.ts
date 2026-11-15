import { describe, expect, it } from "vitest";
import { getStripeColor } from "../src/components/share/ClimateStripes.tsx";
import {
  buildFrameTileUrls,
  buildPriorityYears,
  clearGibsTileCacheForTests,
  isFrameUrlsCached,
  preloadTileUrl,
  preloadTimelapseSequence,
} from "../src/components/share/gibsTileCache.ts";
import {
  buildNasaGibsTileUrl,
  buildNasaWorldviewUrl,
  latLonToTileXY,
} from "../src/components/share/SatelliteTimelapse.tsx";
import { CASE_PRESETS } from "../src/data/presets/index.ts";
import { buildCitationText, buildDossierCsv } from "../src/lib/export/dossierExport.ts";

describe("ClimateStripes & NASA GIBS SatelliteTimelapse helpers", () => {
  it("maps temperature and hydrological z-scores to distinct stripe colors", () => {
    expect(getStripeColor(-2.0, "T2M")).toBe("#08306B");
    expect(getStripeColor(2.0, "T2M")).toBe("#67000D");
    expect(getStripeColor(-2.0, "PRECTOTCORR")).toBe("#7F2704");
    expect(getStripeColor(2.0, "PRECTOTCORR")).toBe("#003C30");
  });

  it("computes valid Web Mercator slippy-map tile indices and NASA GIBS URLs", () => {
    const vilhenaTile = latLonToTileXY(-12.7406, -60.1458, 7);
    expect(vilhenaTile.x).toBeGreaterThan(0);
    expect(vilhenaTile.y).toBeGreaterThan(0);

    const trueColorUrl = buildNasaGibsTileUrl(
      "MODIS_Terra_CorrectedReflectance_TrueColor",
      2024,
      7,
      vilhenaTile.x,
      vilhenaTile.y,
    );
    expect(trueColorUrl).toContain("MODIS_Terra_CorrectedReflectance_TrueColor");
    expect(trueColorUrl).toContain("/2024-08-29/GoogleMapsCompatible_Level9/7/");
    expect(trueColorUrl.endsWith(".jpg")).toBe(true);

    const ndviUrl = buildNasaGibsTileUrl(
      "MODIS_Terra_L3_NDVI_Monthly",
      2024,
      7,
      vilhenaTile.x,
      vilhenaTile.y,
    );
    expect(ndviUrl).toContain("/2024-08-01/GoogleMapsCompatible_Level7/7/");
    expect(ndviUrl.endsWith(".png")).toBe(true);

    const worldviewUrl = buildNasaWorldviewUrl(-12.7406, -60.1458, 2024);
    expect(worldviewUrl).toContain("worldview.earthdata.nasa.gov");
  });

  it("generates scientific CSV and bilingual citation text from a preset dossier", () => {
    const vilhenaResult = CASE_PRESETS[0].result;
    const csv = buildDossierCsv(vilhenaResult);
    expect(csv).toContain("# GeoTrend — Scientific Series Export");
    expect(csv).toContain("year,label,value,unit,trend_value,z_score,is_extreme_anomaly");
    expect(csv).toContain("1981,1981,");

    const citationEn = buildCitationText(vilhenaResult, "en");
    expect(citationEn).toContain("GeoTrend");
    expect(citationEn).toContain("Mann-Kendall non-parametric test");
    expect(citationEn).toContain("NASA POWER / MERRA-2");
    expect(citationEn).toContain("not single-cause physical attribution");

    const citationPt = buildCitationText(vilhenaResult, "pt");
    expect(citationPt).toContain("GeoTrend");
    expect(citationPt).toContain("Teste não-paramétrico de Mann-Kendall");
    expect(citationPt).toContain("sem implicar atribuição causal isolada");
  });

  it("prioritizes endpoints and preloads/deduplicates 3x3 NASA GIBS frame tiles cleanly", async () => {
    clearGibsTileCacheForTests();

    expect(buildPriorityYears(2000, 2004)).toEqual([2000, 2004, 2001, 2002, 2003]);
    expect(buildPriorityYears(2025, 2025)).toEqual([2025]);

    const urls2020 = buildFrameTileUrls(
      -12.7406,
      -60.1458,
      "MODIS_Terra_CorrectedReflectance_TrueColor",
      2020,
      7,
    );
    expect(urls2020).toHaveLength(9);
    expect(isFrameUrlsCached(urls2020)).toBe(false);

    const requestedUrls: string[] = [];
    const originalImage = globalThis.Image;

    class MockImage {
      decoding = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";

      get src() {
        return this._src;
      }

      set src(value: string) {
        this._src = value;
        requestedUrls.push(value);
        queueMicrotask(() => {
          if (value.includes("/2002-08-29/")) {
            this.onerror?.();
          } else {
            this.onload?.();
          }
        });
      }

      async decode() {
        return undefined;
      }
    }

    Object.defineProperty(globalThis, "Image", { value: MockImage, configurable: true });

    try {
      const settled: number[] = [];
      await preloadTimelapseSequence({
        lat: -12.7406,
        lon: -60.1458,
        layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
        zoom: 7,
        years: [2000, 2003, 2002],
        concurrency: 2,
        onYearSettled: (year) => settled.push(year),
      });

      // Even if 2002 failed an upstream tile, every year settles cleanly so playback never deadlocks.
      expect(settled.sort((a, b) => a - b)).toEqual([2000, 2002, 2003]);

      const urls2000 = buildFrameTileUrls(
        -12.7406,
        -60.1458,
        "MODIS_Terra_CorrectedReflectance_TrueColor",
        2000,
        7,
      );
      expect(isFrameUrlsCached(urls2000)).toBe(true);

      const countBeforeHit = requestedUrls.length;
      const hitStatus = await preloadTileUrl(urls2000[0]);
      expect(hitStatus).toBe("ok");
      expect(requestedUrls.length).toBe(countBeforeHit);

      const controller = new AbortController();
      controller.abort();
      expect(
        await preloadTileUrl("https://gibs.earthdata.nasa.gov/aborted.jpg", controller.signal),
      ).toBe("error");
    } finally {
      Object.defineProperty(globalThis, "Image", { value: originalImage, configurable: true });
      clearGibsTileCacheForTests();
    }
  });
});
