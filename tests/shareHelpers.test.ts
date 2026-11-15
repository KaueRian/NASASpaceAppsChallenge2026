import { describe, expect, it } from "vitest";
import { getStripeColor } from "../src/components/share/ClimateStripes.tsx";
import {
  downloadEvidenceCardPng,
  getEvidenceCardCanvasDimensions,
} from "../src/components/share/EvidenceCard.tsx";
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
import {
  buildSatellitePngFilename,
  downloadSatelliteFigurePng,
} from "../src/components/share/satelliteExport.ts";
import { CASE_PRESETS } from "../src/data/presets/index.ts";
import {
  buildAcademicCitation,
  buildCitationText,
  buildDossierCsv,
  buildSatelliteCitationText,
} from "../src/lib/export/dossierExport.ts";

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
    expect(citationEn).toContain("Bias-Corrected Total Precipitation (PRECTOTCORR)");
    expect(citationEn).toContain("Dry Season (Apr–Sep)");
    expect(citationEn).toContain("95% CI:");
    expect(citationEn).toContain("mm/decade)");
    expect(citationEn).toContain("STRONG EVIDENCE");
    expect(citationEn).toContain("NASA POWER / MERRA-2");
    expect(citationEn).toContain("not single-cause physical attribution");

    const citationPt = buildCitationText(vilhenaResult, "pt");
    expect(citationPt).toContain("GeoTrend");
    expect(citationPt).toContain("Teste não-paramétrico de Mann-Kendall");
    expect(citationPt).toContain("Precipitação Total Corrigida (PRECTOTCORR)");
    expect(citationPt).toContain("Estação Seca (Abr–Set)");
    expect(citationPt).toContain("IC 95%:");
    expect(citationPt).toContain("mm/década)");
    expect(citationPt).toContain("EVIDÊNCIA FORTE");
    expect(citationPt).not.toContain("95% CI:");
    expect(citationPt).not.toContain("/decade)");
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

  it("formats academic citations in Summary, ABNT, APA, BibTeX and builds NASA GIBS captions", () => {
    const vilhena = CASE_PRESETS[0].result;
    const shareUrl = "https://geotrend.earth/?case=01";

    const summaryEn = buildAcademicCitation(vilhena, "summary", { locale: "en", shareUrl });
    expect(summaryEn).toContain("Mann-Kendall non-parametric test");

    const bibtex = buildAcademicCitation(vilhena, "bibtex", {
      locale: "en",
      tempUnit: "C",
      shareUrl,
    });
    expect(bibtex).toContain("@misc{geotrend_");
    expect(bibtex).toContain("howpublished = {\\url{https://geotrend.earth/?case=01}}");
    expect(bibtex).toContain("OLS R^2=");
    expect(bibtex).toContain("Mann-Kendall S=");

    const ariquemes = CASE_PRESETS[1].result;
    const abntPtTemp = buildAcademicCitation(ariquemes, "abnt", {
      locale: "pt",
      tempUnit: "F",
      shareUrl: "https://geotrend.earth/?case=02",
    });
    expect(abntPtTemp).toContain("GEOTREND; NASA POWER / GMAO MERRA-2.");
    expect(abntPtTemp).toContain("°F/década");
    expect(abntPtTemp).toContain("Disponível em: https://geotrend.earth/?case=02");
    expect(abntPtTemp).toContain("R²=");

    const abntPtPrecip = buildAcademicCitation(vilhena, "abnt", {
      locale: "pt",
      tempUnit: "F",
      shareUrl,
    });
    expect(abntPtPrecip).toContain("mm/década");

    const apaEn = buildAcademicCitation(vilhena, "apa", {
      locale: "en",
      tempUnit: "C",
      shareUrl,
    });
    expect(apaEn).toContain("GeoTrend, & NASA POWER / GMAO MERRA-2.");
    expect(apaEn).toContain("OLS R²=");
    expect(apaEn).toContain(shareUrl);

    const satComparePt = buildSatelliteCitationText({
      location: vilhena.location,
      layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
      mode: "compare",
      beforeYear: 2000,
      afterYear: 2025,
      selectedYear: 2025,
      locale: "pt",
      shareUrl,
      worldviewUrl: "https://worldview.earthdata.nasa.gov/?v=-61,-13,-58,-11",
    });
    expect(satComparePt).toContain("MODIS/Terra Reflectância Corrigida (Cor Real)");
    expect(satComparePt).toContain("2000-08-29 vs. 2025-08-29");
    expect(satComparePt).toContain("NASA Global Imagery Browse Services (GIBS)");

    const satNdviEn = buildSatelliteCitationText({
      location: vilhena.location,
      layer: "MODIS_Terra_L3_NDVI_Monthly",
      mode: "timelapse",
      beforeYear: 2000,
      afterYear: 2025,
      selectedYear: 2019,
      locale: "en",
    });
    expect(satNdviEn).toContain("MODIS/Terra Vegetation Indices Monthly (NDVI)");
    expect(satNdviEn).toContain("2019-08-01");
  });

  it("computes academic EvidenceCard canvas dimensions and renders CORS-safe Satellite PNG figures", async () => {
    expect(getEvidenceCardCanvasDimensions("story")).toEqual({ width: 1080, height: 1920 });
    expect(getEvidenceCardCanvasDimensions("square")).toEqual({ width: 1080, height: 1080 });
    expect(getEvidenceCardCanvasDimensions("slide")).toEqual({ width: 1920, height: 1080 });
    expect(getEvidenceCardCanvasDimensions("paper")).toEqual({ width: 1600, height: 1000 });

    const vilhena = CASE_PRESETS[0].result;
    expect(
      buildSatellitePngFilename(
        vilhena.location.label,
        "MODIS_Terra_L3_NDVI_Monthly",
        "timelapse",
        2000,
        2025,
        2020,
      ),
    ).toBe("geotrend-satellite-vilhena-ro-brazil-ndvi-2020.png");

    const downloadedLinks: Array<{ href: string; download: string }> = [];
    const originalDocument = (globalThis as { document?: unknown }).document;

    const noop = () => {};
    const mockCtx = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      font: "",
      save: noop,
      restore: noop,
      beginPath: noop,
      closePath: noop,
      clip: noop,
      rect: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      ellipse: noop,
      fillRect: noop,
      strokeRect: noop,
      fillText: noop,
      stroke: noop,
      fill: noop,
      translate: noop,
      scale: noop,
      rotate: noop,
      measureText: () => ({ width: 120 }),
      drawImage: noop,
    };

    const mockDocument = {
      createElement: (tag: string) => {
        if (tag === "canvas") {
          return {
            width: 0,
            height: 0,
            getContext: () => mockCtx,
            toDataURL: () => "data:image/png;base64,MOCK",
          };
        }
        const anchor = {
          href: "",
          download: "",
          click: () => {
            downloadedLinks.push({ href: anchor.href, download: anchor.download });
          },
        };
        return anchor;
      },
    };

    Object.defineProperty(globalThis, "document", { value: mockDocument, configurable: true });
    try {
      // Blocked CORS / missing tiles fall back cleanly to vector graticule + crosshair without throwing
      const fallbackResult = await downloadSatelliteFigurePng({
        location: vilhena.location,
        layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
        mode: "compare",
        beforeYear: 2000,
        afterYear: 2025,
        selectedYear: 2025,
        zoom: 7,
        locale: "en",
        shareUrl: "https://geotrend.earth/?case=01&satMode=compare",
        loadTileFn: async () => null,
      });

      expect(fallbackResult.usedFallback).toBe(true);
      expect(fallbackResult.width).toBe(1600);
      expect(fallbackResult.height).toBe(900);
      expect(fallbackResult.loadedTiles).toBe(0);
      expect(fallbackResult.totalTiles).toBe(18);
      expect(downloadedLinks[0]?.download).toBe(
        "geotrend-satellite-vilhena-ro-brazil-truecolor-2000-vs-2025.png",
      );

      // Valid tiles render full mosaic without fallback warning
      const mockTile = {} as CanvasImageSource;
      const cleanResult = await downloadSatelliteFigurePng({
        location: vilhena.location,
        layer: "MODIS_Terra_L3_NDVI_Monthly",
        mode: "timelapse",
        beforeYear: 2000,
        afterYear: 2025,
        selectedYear: 2020,
        zoom: 7,
        locale: "pt",
        loadTileFn: async () => mockTile,
      });

      expect(cleanResult.usedFallback).toBe(false);
      expect(cleanResult.width).toBe(1280);
      expect(cleanResult.height).toBe(860);
      expect(cleanResult.loadedTiles).toBe(9);
      expect(cleanResult.totalTiles).toBe(9);
      expect(downloadedLinks[1]?.download).toBe(
        "geotrend-satellite-vilhena-ro-brazil-ndvi-2020.png",
      );

      downloadEvidenceCardPng(vilhena, "slide", "https://geotrend.earth/?case=01", "C", "en");
      downloadEvidenceCardPng(vilhena, "paper", "https://geotrend.earth/?case=01", "F", "pt");
      expect(downloadedLinks[2]?.download).toBe("geotrend-vilhena-ro-brazil-prectotcorr-slide.png");
      expect(downloadedLinks[3]?.download).toBe("geotrend-vilhena-ro-brazil-prectotcorr-paper.png");
    } finally {
      Object.defineProperty(globalThis, "document", {
        value: originalDocument,
        configurable: true,
      });
    }
  });
});
