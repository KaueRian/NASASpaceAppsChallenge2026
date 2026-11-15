import { describe, expect, it } from "vitest";
import { CASE_PRESETS } from "../src/data/presets/index.ts";
import { buildAcademicCitation } from "../src/lib/export/dossierExport.ts";

describe("buildAcademicCitation", () => {
  const vilhenaResult = CASE_PRESETS[0].result;
  const url = "https://geotrend.example/?case=01";

  it("builds a BibTeX entry with a stable, URL-safe citation key", () => {
    const en = buildAcademicCitation(vilhenaResult, "bibtex", "en", "C", url);
    expect(en).toMatch(/^@misc\{geotrend_[a-z0-9_]+,/);
    expect(en).toContain("author = {GeoTrend}");
    expect(en).toContain(`year = {${vilhenaResult.stats.endYear}}`);
    expect(en).toContain(`url = {${url}}`);
    expect(en).toContain("NASA POWER");
    expect(en.trim().endsWith("}")).toBe(true);
  });

  it("builds an ABNT (NBR 6023) reference in Portuguese", () => {
    const pt = buildAcademicCitation(vilhenaResult, "abnt", "pt", "C", url);
    expect(pt).toMatch(/^GEOTREND\./);
    expect(pt).toContain(String(vilhenaResult.stats.endYear));
    expect(pt).toContain(url);
    expect(pt).toContain("Acesso em:");
  });

  it("builds an ABNT reference without a URL line when no url is given", () => {
    const pt = buildAcademicCitation(vilhenaResult, "abnt", "pt");
    expect(pt).not.toContain("Disponível em:");
    expect(pt).toContain("Acesso em:");
  });

  it("builds an APA (7th ed.) reference in English", () => {
    const en = buildAcademicCitation(vilhenaResult, "apa", "en", "C", url);
    expect(en).toMatch(/^GeoTrend\. \(\d{4}\)\./);
    expect(en).toContain("Retrieved");
    expect(en).toContain(url);
  });

  it("keeps all 3 formats locale-aware and distinct from each other", () => {
    const bibtex = buildAcademicCitation(vilhenaResult, "bibtex", "en");
    const abnt = buildAcademicCitation(vilhenaResult, "abnt", "en");
    const apa = buildAcademicCitation(vilhenaResult, "apa", "en");
    expect(new Set([bibtex, abnt, apa]).size).toBe(3);
  });

  it("converts to Fahrenheit deltas consistently with the existing prose citation", () => {
    const tempResult = CASE_PRESETS.find((p) => p.result.unit === "C")?.result;
    expect(tempResult).toBeDefined();
    if (!tempResult) return;
    const apaF = buildAcademicCitation(tempResult, "apa", "en", "F");
    expect(apaF).toContain("°F/decade");
  });
});
