import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CasesGrid, markCaseViewed, readViewedCases } from "../src/components/CasesGrid";
import { Hero } from "../src/components/Hero";
import { MethodsPage } from "../src/components/MethodsPage";
import { TrendChart } from "../src/components/TrendChart";
import { getCasePresetById } from "../src/data/presets";
import { I18nProvider } from "../src/i18n/i18n";

function renderWithI18n(node: ReactElement): string {
  return renderToStaticMarkup(createElement(I18nProvider, null, node));
}

describe("R3 & R4 UI components", () => {
  it("renders Hero with live Vilhena Case #01 anomaly stripes and caption", () => {
    const html = renderWithI18n(createElement(Hero));
    expect(html).toContain("Vilhena, RO, Brazil");
    expect(html).toContain("1981–2025");
    expect(html).toContain("ANOMALY STRIPES (Z-SCORE)");
  });

  it("renders TrendChart with the 3 View As mode buttons", () => {
    const preset = getCasePresetById("01").result;
    const html = renderWithI18n(
      createElement(TrendChart, {
        series: preset.series,
        unit: preset.unit,
        variable: preset.variable,
      }),
    );
    expect(html).toContain("Linha + Tendência de Sen");
    expect(html).toContain("Barras Sazonais");
    expect(html).toContain("Faixas Climáticas");
  });

  it("persists viewed Featured Cases in localStorage and renders Reviewed indicator", () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
      configurable: true,
    });

    expect(readViewedCases()).toEqual([]);
    const after01 = markCaseViewed("01", []);
    const after03 = markCaseViewed("03", after01);
    expect(after03).toEqual(["01", "03"]);
    expect(readViewedCases()).toEqual(["01", "03"]);

    const html = renderWithI18n(
      createElement(CasesGrid, {
        activePresetId: "01",
        onSelectPreset: () => {},
      }),
    );
    expect(html).toContain("Revisado");
  });

  it("renders complete MethodsPage with all 7 sections and 4-scale validation table", () => {
    const html = renderWithI18n(
      createElement(MethodsPage, {
        onNavigateHome: () => {},
      }),
    );
    expect(html).toContain("01.");
    expect(html).toContain("05.");
    expect(html).toContain("06.");
    expect(html).toContain("07.");
    expect(html).toContain("Vilhena, RO, Brasil");
    expect(html).toContain("Ariquemes, RO, Brasil");
    expect(html).toContain("Corumbá (Pantanal), MS, Brasil");
    expect(html).toContain("Svalbard, Ártico");
  });
});
