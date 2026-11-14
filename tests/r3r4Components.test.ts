import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CasesGrid, markCaseViewed, readViewedCases } from "../src/components/CasesGrid";
import { Hero } from "../src/components/Hero";
import { Investigation } from "../src/components/Investigation";
import { MethodsPage } from "../src/components/MethodsPage";
import {
  RecentDossiersDrawer,
  resolveGibsComparisonWindow,
  SatelliteTimelapse,
  SharedDossierView,
} from "../src/components/share";
import { TrendChart } from "../src/components/TrendChart";
import { getCasePresetById } from "../src/data/presets";
import { I18nProvider } from "../src/i18n/i18n";
import { parseAppRoute } from "../src/lib/routing";

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

  it("renders SatelliteTimelapse Before vs. After (2000 vs. 2025) open by default", () => {
    expect(resolveGibsComparisonWindow(1981, 2025)).toEqual({
      beforeYear: 2000,
      afterYear: 2025,
      startsBeforeArchive: true,
    });
    expect(resolveGibsComparisonWindow(1981, 1995)).toEqual({
      beforeYear: 2000,
      afterYear: 2025,
      startsBeforeArchive: true,
    });

    const preset = getCasePresetById("01").result;
    const html = renderWithI18n(
      createElement(SatelliteTimelapse, {
        location: preset.location,
        startYear: preset.stats.startYear,
        endYear: preset.stats.endYear,
      }),
    );
    expect(html).toContain("Antes vs. Depois");
    expect(html).toContain("ANTES · 2000");
    expect(html).toContain("DEPOIS · 2025");
    expect(html).toContain("MODIS_Terra_CorrectedReflectance_TrueColor");
    expect(html).toContain("/2000-08-29/");
    expect(html).toContain("/2025-08-29/");
  });

  it("wires SatelliteTimelapse and RecentDossiersDrawer directly inside Investigation", () => {
    const html = renderWithI18n(
      createElement(Investigation, {
        presetId: "01",
        onNavigateMethods: () => {},
      }),
    );
    expect(html).toContain("ANTES · 2000");
    expect(html).toContain("DEPOIS · 2025");
    expect(html).toContain("Dossiês recentes");
  });

  it("parses deep links for presets, live queries, methods, and shared dossiers", () => {
    expect(parseAppRoute("/", "")).toEqual({
      view: "home",
      presetId: "01",
      scrollToInvestigation: false,
    });
    expect(parseAppRoute("/", "?case=03")).toEqual({
      view: "home",
      presetId: "03",
      scrollToInvestigation: true,
    });
    expect(parseAppRoute("/dossier/et-0123456789", "")).toEqual({
      view: "dossier",
      dossierId: "et-0123456789",
    });
    expect(parseAppRoute("/methods", "")).toEqual({ view: "methods" });

    const live = parseAppRoute(
      "/investigate",
      "?lat=-3.1190&lon=-60.0217&variable=T2M&season=annual&label=Manaus",
    );
    expect(live.view).toBe("home");
    if (live.view === "home") {
      expect(live.scrollToInvestigation).toBe(true);
      expect(live.initialLiveQuery).toEqual({
        lat: -3.119,
        lon: -60.0217,
        variable: "T2M",
        season: "annual",
        startYear: 1981,
        endYear: 2025,
        label: "Manaus",
      });
    }
  });

  it("renders SharedDossierView and RecentDossiersDrawer with Dark Editorial i18n", () => {
    const sharedHtml = renderWithI18n(
      createElement(SharedDossierView, {
        dossierId: "et-abcdef1234",
      }),
    );
    expect(sharedHtml).toContain("et-abcdef1234");

    const drawerHtml = renderWithI18n(createElement(RecentDossiersDrawer));
    expect(drawerHtml).toContain("Dossiês recentes");
  });
});
