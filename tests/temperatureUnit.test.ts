import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppHeader } from "../src/components/AppHeader";
import { Investigation } from "../src/components/Investigation";
import { MethodsPage } from "../src/components/MethodsPage";
import { ClimateStripes } from "../src/components/share/ClimateStripes";
import { EvidenceCard } from "../src/components/share/EvidenceCard";
import { TrendChart } from "../src/components/TrendChart";
import { getCasePresetById } from "../src/data/presets";
import { I18nProvider } from "../src/i18n/i18n";
import { readStoredTemperatureUnit, TemperatureUnitProvider } from "../src/i18n/temperatureUnit";
import { buildCitationText, buildDossierCsv } from "../src/lib/export/dossierExport";
import {
  celsiusDeltaToFahrenheit,
  celsiusToFahrenheit,
  convertInvestigationResultForDisplay,
} from "../src/lib/temperatureUnit";

describe("Temperature unit toggle (°C | °F) and conversions", () => {
  it("converts absolute temperatures with +32 offset and deltas without +32 offset", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(25)).toBe(77);
    expect(celsiusToFahrenheit(-40)).toBe(-40);

    expect(celsiusDeltaToFahrenheit(1)).toBeCloseTo(1.8, 6);
    expect(celsiusDeltaToFahrenheit(1.818)).toBeCloseTo(3.2724, 6);
    expect(celsiusDeltaToFahrenheit(-0.5)).toBeCloseTo(-0.9, 6);
  });

  it("converts T2M/T2M_MIN InvestigationResult in °F while leaving PRECTOTCORR/GWETROOT unchanged", () => {
    const ariquemes = getCasePresetById("02").result;
    const converted = convertInvestigationResultForDisplay(ariquemes, "F");

    expect(converted.series[0].value).toBeCloseTo((ariquemes.series[0].value * 9) / 5 + 32, 5);
    expect(converted.series[0].trendValue).toBeCloseTo(
      (ariquemes.series[0].trendValue * 9) / 5 + 32,
      5,
    );
    expect(converted.series[0].zScore).toBe(ariquemes.series[0].zScore);
    expect(converted.stats.fullPeriodMean).toBeCloseTo(
      (ariquemes.stats.fullPeriodMean * 9) / 5 + 32,
      5,
    );
    expect(converted.stats.fullPeriodStdDev).toBeCloseTo(
      (ariquemes.stats.fullPeriodStdDev * 9) / 5,
      5,
    );
    expect(converted.stats.totalChangeOverPeriod).toBeCloseTo(
      (ariquemes.stats.totalChangeOverPeriod * 9) / 5,
      5,
    );
    expect(converted.stats.senSlopePerDecade).toBeCloseTo(
      (ariquemes.stats.senSlopePerDecade * 9) / 5,
      5,
    );
    expect(converted.stats.pValue).toBe(ariquemes.stats.pValue);
    expect(converted.stats.zScore).toBe(ariquemes.stats.zScore);

    const vilhenaRain = getCasePresetById("01").result;
    expect(convertInvestigationResultForDisplay(vilhenaRain, "F")).toBe(vilhenaRain);

    const pantanalSoil = getCasePresetById("03").result;
    expect(convertInvestigationResultForDisplay(pantanalSoil, "F")).toBe(pantanalSoil);
  });

  it("exports CSV and bilingual citations in °F for temperature variables", () => {
    const ariquemes = getCasePresetById("02").result;
    const csvF = buildDossierCsv(ariquemes, "F");
    const firstPointF = ((ariquemes.series[0].value * 9) / 5 + 32).toString();
    expect(csvF).toContain("# Variable: T2M_MIN (F)");
    expect(csvF).toContain("Total Change: 3.272");
    expect(csvF).toContain(`1981,1981,${firstPointF},F,`);

    const citationEnF = buildCitationText(ariquemes, "en", "F");
    expect(citationEnF).toContain("+0.74 °F/decade");
    expect(citationEnF).toContain("total shift of +3.27 °F");
    expect(citationEnF).toContain("°F/decade)");

    const citationPtF = buildCitationText(ariquemes, "pt", "F");
    expect(citationPtF).toContain("+0.74 °F/década");
    expect(citationPtF).toContain("mudança total de +3.27 °F");

    const vilhenaRain = getCasePresetById("01").result;
    expect(buildCitationText(vilhenaRain, "en", "F")).toContain("mm/decade");
  });

  it("persists temperature unit preference in localStorage safely", () => {
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

    expect(readStoredTemperatureUnit()).toBe("C");
    store.set("etd.tempUnit", "F");
    expect(readStoredTemperatureUnit()).toBe("F");
    store.set("etd.tempUnit", "invalid");
    expect(readStoredTemperatureUnit()).toBe("C");
  });

  it("renders °C | °F toggle in AppHeader and converts UI components when °F is selected", () => {
    const headerHtml = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(
          TemperatureUnitProvider,
          { initialUnit: "F" },
          createElement(AppHeader, {
            onNavigateSection: () => {},
            onNavigateMethods: () => {},
            onNavigateHome: () => {},
          }),
        ),
      ),
    );
    expect(headerHtml).toContain("°C");
    expect(headerHtml).toContain("°F");
    expect(headerHtml).toContain('aria-pressed="true"');

    const ariquemes = getCasePresetById("02").result;
    const invHtml = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(
          TemperatureUnitProvider,
          { initialUnit: "F" },
          createElement(Investigation, {
            presetId: "02",
            onNavigateMethods: () => {},
          }),
        ),
      ),
    );
    expect(invHtml).toContain("°F");
    expect(invHtml).toContain("3,3 °F");
    expect(invHtml).not.toContain("1,8 °C");

    const chartHtml = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(
          TemperatureUnitProvider,
          { initialUnit: "F" },
          createElement(TrendChart, {
            series: ariquemes.series,
            unit: ariquemes.unit,
            variable: ariquemes.variable,
          }),
        ),
      ),
    );
    expect(chartHtml).toContain("em °F");

    const stripesHtml = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(
          TemperatureUnitProvider,
          { initialUnit: "F" },
          createElement(ClimateStripes, {
            series: ariquemes.series,
            variable: ariquemes.variable,
            unit: ariquemes.unit,
            tone: "dark",
            initialActiveIndex: 0,
          }),
        ),
      ),
    );
    expect(stripesHtml).toContain("°F");

    const methodsHtml = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(
          TemperatureUnitProvider,
          { initialUnit: "F" },
          createElement(MethodsPage, {
            onNavigateHome: () => {},
          }),
        ),
      ),
    );
    expect(methodsHtml).toContain("°F/dec");
    expect(methodsHtml).toContain("mm/dec");
    expect(methodsHtml).toContain("%/dec");

    const cardHtml = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(
          TemperatureUnitProvider,
          { initialUnit: "F" },
          createElement(EvidenceCard, {
            result: ariquemes,
            aspect: "story",
          }),
        ),
      ),
    );
    expect(cardHtml).toContain("+3.27°F");
    expect(cardHtml).toContain("+0.74°F");
  });
});
