import { describe, expect, it } from "vitest";
import { getStripeColor } from "../src/components/share/ClimateStripes.tsx";
import {
  buildNasaGibsTileUrl,
  buildNasaWorldviewUrl,
  latLonToTileXY,
} from "../src/components/share/SatelliteTimelapse.tsx";

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
    expect(trueColorUrl).toContain("/2024-08-13/GoogleMapsCompatible_Level9/7/");
    expect(trueColorUrl.endsWith(".jpg")).toBe(true);

    const ndviUrl = buildNasaGibsTileUrl(
      "MODIS_Terra_NDVI_8Day",
      2024,
      7,
      vilhenaTile.x,
      vilhenaTile.y,
    );
    expect(ndviUrl.endsWith(".png")).toBe(true);

    const worldviewUrl = buildNasaWorldviewUrl(-12.7406, -60.1458, 2024);
    expect(worldviewUrl).toContain("worldview.earthdata.nasa.gov");
  });
});
