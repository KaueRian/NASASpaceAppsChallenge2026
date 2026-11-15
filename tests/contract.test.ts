import { describe, expect, it } from "vitest";
import {
  CASE_PRESET_IDS,
  MIN_ANALYSIS_YEARS,
  NASA_MISSING_VALUE,
  SEASON_IDS,
  VARIABLE_IDS,
  VARIABLE_UNIT_MAP,
} from "../src/types/investigation";
import { app } from "../src/worker/index";

describe("R0 shared contract and API health", () => {
  it("defines the 4 locked variables and canonical units", () => {
    expect(VARIABLE_IDS).toEqual(["T2M", "T2M_MIN", "PRECTOTCORR", "GWETROOT"]);
    expect(VARIABLE_UNIT_MAP).toEqual({
      T2M: "C",
      T2M_MIN: "C",
      PRECTOTCORR: "mm",
      GWETROOT: "pct",
    });
  });

  it("defines the 4 case presets, 3 seasons, and scientific thresholds", () => {
    expect(CASE_PRESET_IDS).toEqual(["01", "02", "03", "04"]);
    expect(SEASON_IDS).toEqual(["annual", "oct_mar", "apr_sep"]);
    expect(MIN_ANALYSIS_YEARS).toBe(15);
    expect(NASA_MISSING_VALUE).toBe(-999);
  });

  it("responds 200 OK on GET /api/health", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("geotrend");
  });
});
