import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Hero } from "../src/components/Hero";
import {
  ClimateStripes,
  computeStripeTooltipAnchor,
  formatSignedZScore,
  getPaletteForVariable,
  getStripeColor,
  isTemperatureVariable,
} from "../src/components/share/ClimateStripes";
import { EvidenceCard } from "../src/components/share/EvidenceCard";
import { TrendChart } from "../src/components/TrendChart";
import { getCasePresetById } from "../src/data/presets";
import { I18nProvider } from "../src/i18n/i18n";

describe("ClimateStripes interactive hover, legend, and explanation", () => {
  it("classifies palettes and computes non-clipping tooltip anchors", () => {
    expect(isTemperatureVariable("T2M")).toBe(true);
    expect(isTemperatureVariable("T2M_MIN")).toBe(true);
    expect(isTemperatureVariable("PRECTOTCORR")).toBe(false);
    expect(isTemperatureVariable("GWETROOT")).toBe(false);

    expect(getPaletteForVariable("T2M")).toHaveLength(9);
    expect(getPaletteForVariable("T2M")[0]).toBe("#08306B");
    expect(getPaletteForVariable("T2M")[8]).toBe("#67000D");
    expect(getPaletteForVariable("PRECTOTCORR")[0]).toBe("#7F2704");
    expect(getPaletteForVariable("PRECTOTCORR")[8]).toBe("#003C30");
    expect(getStripeColor(0, "T2M")).toBe("#F4EFE6");

    expect(computeStripeTooltipAnchor(0, 45)).toEqual({
      leftPct: (0.5 / 45) * 100,
      align: "left",
    });
    expect(computeStripeTooltipAnchor(22, 45)).toEqual({
      leftPct: (22.5 / 45) * 100,
      align: "center",
    });
    expect(computeStripeTooltipAnchor(44, 45)).toEqual({
      leftPct: (44.5 / 45) * 100,
      align: "right",
    });

    expect(formatSignedZScore(1.842)).toBe("+1.84");
    expect(formatSignedZScore(-1.624)).toBe("-1.62");
    expect(formatSignedZScore(0)).toBe("0.00");
  });

  it("renders interactive stripe buttons, hydrology legend, and PT explanation in dark mode", () => {
    const vilhena = getCasePresetById("01").result;
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(ClimateStripes, {
          series: vilhena.series,
          variable: vilhena.variable,
          unit: vilhena.unit,
          height: 180,
          tone: "dark",
        }),
      ),
    );

    expect(html).toContain("ANOMALY STRIPES (Z-SCORE)");
    expect(html).toContain("Mais seco (−z)");
    expect(html).toContain("Média (z ≈ 0)");
    expect(html).toContain("Mais úmido (+z)");
    expect(html).toContain("cada faixa vertical representa");
    expect(html).toContain("verde-água");
    expect(html).toContain("|z| &gt; 1,5");
    expect(html).toContain("<button");
    expect(html).toContain("1981:");
    expect(html).toContain("2025:");
    expect(html).toContain("mm");
  });

  it("renders floating Dark Editorial tooltip, extreme anomaly tag, and active stripe highlight", () => {
    const vilhena = getCasePresetById("01").result;
    const lastIdx = vilhena.series.length - 1;
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(ClimateStripes, {
          series: vilhena.series,
          variable: vilhena.variable,
          unit: vilhena.unit,
          height: 180,
          tone: "dark",
          initialActiveIndex: lastIdx,
        }),
      ),
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("2025: 161,2 mm");
    expect(html).toContain("z = -1,58");
    expect(html).toContain("Anomalia extrema (|z| &gt; 1,5)");
    expect(html).toContain('opacity="0.45"');
    expect(html).toContain("border-text");
    expect(html).toContain("-translate-x-full");
  });

  it("renders temperature palette legend and explanation for T2M / T2M_MIN", () => {
    const ariquemes = getCasePresetById("02").result;
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(ClimateStripes, {
          series: ariquemes.series,
          variable: ariquemes.variable,
          unit: ariquemes.unit,
          height: 180,
          tone: "dark",
        }),
      ),
    );

    expect(html).toContain("Mais frio (−z)");
    expect(html).toContain("Mais quente (+z)");
    expect(html).toContain("Tons azuis");
  });

  it("keeps light-mode EvidenceCard clean without dark-mode explanation copy", () => {
    const svalbard = getCasePresetById("04").result;
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(EvidenceCard, {
          result: svalbard,
          aspect: "story",
        }),
      ),
    );

    expect(html).toContain("ANOMALY STRIPES (Z-SCORE)");
    expect(html).not.toContain("Como ler:");
    expect(html).not.toContain("How to read:");
  });

  it("supports standalone English fallback when rendered outside I18nProvider", () => {
    const svalbard = getCasePresetById("04").result;
    const html = renderToStaticMarkup(
      createElement(ClimateStripes, {
        series: svalbard.series,
        variable: svalbard.variable,
        unit: svalbard.unit,
        height: 120,
        tone: "dark",
      }),
    );

    expect(html).toContain("Cooler (−z)");
    expect(html).toContain("Warmer (+z)");
    expect(html).toContain("How to read:");
  });

  it("renders Hero without overflow-hidden clipping around ClimateStripes and preserves TrendChart", () => {
    const heroHtml = renderToStaticMarkup(createElement(I18nProvider, null, createElement(Hero)));
    expect(heroHtml).toContain("Mais seco (−z)");
    expect(heroHtml).not.toContain('class="overflow-hidden"');

    const preset = getCasePresetById("01").result;
    const chartHtml = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(TrendChart, {
          series: preset.series,
          unit: preset.unit,
          variable: preset.variable,
        }),
      ),
    );
    expect(chartHtml).toContain("Faixas Climáticas");
  });
});
