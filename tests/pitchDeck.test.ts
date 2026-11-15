import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CASE_PRESETS } from "../src/data/presets/index.ts";
import {
  buildPitchDeckHtml,
  GEOTREND_QR_PATH_D,
  PITCH_SITE_URL,
  PITCH_SLIDE_COUNT,
} from "../src/lib/pitch/pitchDeckBuilder.ts";

describe("GeoTrend PT-BR Pitch Slides ([13H])", () => {
  const html = buildPitchDeckHtml(CASE_PRESETS);

  it("renders all 7 slides in Dark Editorial PT-BR with 16:9 PDF print rules", () => {
    const slideMatches = html.match(/class="slide[^"]*" data-slide="\d+"/g) ?? [];
    expect(slideMatches).toHaveLength(PITCH_SLIDE_COUNT);
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain("size: 13.333in 7.5in;");
    expect(html).toContain("@media print");
    expect(html).toContain("-webkit-print-color-adjust: exact");
    expect(html).toContain("#121212");
    expect(html).toContain("#C1472E");
  });

  it("embeds real 1981-2025 metrics from CASE_PRESETS and verified geotrend.earth QR code", () => {
    expect(html).toContain("-234,46 mm");
    expect(html).toContain("-53,29 mm/década");
    expect(html).toContain("p = 0,000131");
    expect(html).toContain("+1,82 °C");
    expect(html).toContain("-5,60 pts (%)");
    expect(html).toContain("+3,50 °C");
    expect(html).toContain(PITCH_SITE_URL);
    expect(html).toContain("GEOTREND.EARTH");
    expect(html).toContain(GEOTREND_QR_PATH_D);
  });

  it("covers challenge guardrails, Missão Amazônia SDGs, and excludes internal AI jargon", () => {
    expect(html).toContain("Correlação ≠ Causalidade");
    expect(html).toContain("ODS 6");
    expect(html).toContain("ODS 13");
    expect(html).toContain("ODS 15");
    expect(html).toContain("MapBiomas");
    expect(html).not.toMatch(/Gemini|flash-lite|Camada 1|\bD1\b/i);
  });

  it("matches generated docs/submission/slides-pt.html cleanly", () => {
    const generatedPath = path.resolve(import.meta.dirname, "../docs/submission/slides-pt.html");
    const onDisk = readFileSync(generatedPath, "utf8");
    expect(onDisk).toBe(html);
  });
});
