import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  it("binds geotrend.earth custom domain in wrangler.jsonc without breaking previews or workers.dev", () => {
    const raw = readFileSync(resolve(process.cwd(), "wrangler.jsonc"), "utf8");
    const wrangler = JSON.parse(raw) as {
      workers_dev?: boolean;
      preview_urls?: boolean;
      routes?: Array<{
        pattern?: string;
        custom_domain?: boolean;
        previews_enabled?: boolean;
      }>;
    };

    expect(wrangler.workers_dev).toBe(true);
    expect(wrangler.preview_urls).toBe(true);
    expect(wrangler.routes).toContainEqual({
      pattern: "geotrend.earth",
      custom_domain: true,
      previews_enabled: false,
    });
  });

  it("declares canonical geotrend.earth metadata and absolute OG image in index.html", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    expect(html).toContain('<link rel="canonical" href="https://geotrend.earth/" />');
    expect(html).toContain('<meta property="og:url" content="https://geotrend.earth/" />');
    expect(html).toContain(
      '<meta property="og:image" content="https://geotrend.earth/brand/og-card.png" />',
    );
    expect(html).toContain(
      '<meta name="twitter:image" content="https://geotrend.earth/brand/og-card.png" />',
    );
  });
});
