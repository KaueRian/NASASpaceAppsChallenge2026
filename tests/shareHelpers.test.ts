import { describe, expect, it } from "vitest";
import { getStripeColor } from "../src/components/share/ClimateStripes.tsx";
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
    expect(csv).toContain("# EarthTrend Detective — Scientific Series Export");
    expect(csv).toContain("year,label,value,unit,trend_value,z_score,is_extreme_anomaly");
    expect(csv).toContain("1981,1981,");

    const citationEn = buildCitationText(vilhenaResult, "en");
    expect(citationEn).toContain("Mann-Kendall non-parametric test");
    expect(citationEn).toContain("NASA POWER / MERRA-2");
    expect(citationEn).toContain("not single-cause physical attribution");

    const citationPt = buildCitationText(vilhenaResult, "pt");
    expect(citationPt).toContain("Teste não-paramétrico de Mann-Kendall");
    expect(citationPt).toContain("sem implicar atribuição causal isolada");
  });
});
