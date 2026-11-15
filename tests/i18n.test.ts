import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanguageToggle } from "../src/components/LanguageToggle";
import { ClimateStripes } from "../src/components/share/ClimateStripes";
import { EvidenceCard } from "../src/components/share/EvidenceCard";
import { ShareSheet } from "../src/components/share/ShareSheet";
import { TrendChart } from "../src/components/TrendChart";
import { getCasePresetById } from "../src/data/presets";
import { I18nProvider, type Locale } from "../src/i18n/i18n";
import en from "../src/locales/en.json";
import pt from "../src/locales/pt.json";

function collectKeys(dict: unknown, prefix = ""): string[] {
  if (typeof dict !== "object" || dict === null) return [];
  return Object.entries(dict as Record<string, unknown>).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null ? collectKeys(value, path) : [path];
  });
}

function renderWithLocale(locale: Locale, node: ReactElement): string {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const store = new Map<string, string>([["etd.locale", locale]]);
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

  try {
    return renderToStaticMarkup(createElement(I18nProvider, null, node));
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "localStorage", originalDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  }
}

describe("i18n dictionary key parity", () => {
  it("en.json and pt.json have the exact same set of keys", () => {
    expect(collectKeys(pt).sort()).toEqual(collectKeys(en).sort());
  });

  it("localizes ShareSheet and EvidenceCard completely in Portuguese and English", () => {
    const vilhena = getCasePresetById("01").result;

    const ptHtml = renderToStaticMarkup(
      createElement(ShareSheet, {
        result: vilhena,
        locale: "pt",
        onClose: () => {},
      }),
    );
    expect(ptHtml).toContain("Card de Evidência &amp; Exportação de Dados");
    expect(ptHtml).toContain("EXPORTAÇÃO DE EVIDÊNCIA · COMPARTILHAR DOSSIÊ");
    expect(ptHtml).toContain("ESC / FECHAR");
    expect(ptHtml).toContain("Quadrado 1:1");
    expect(ptHtml).toContain("Baixar Card PNG");
    expect(ptHtml).toContain("Baixar Série CSV");
    expect(ptHtml).toContain("Copiar Citação Científica");
    expect(ptHtml).toContain("Copiar Link de Compartilhamento");
    expect(ptHtml).toContain("GEOTREND · DOSSIÊ PERICIAL");
    expect(ptHtml).toContain("VARIAÇÃO TOTAL (45 ANOS)");
    expect(ptHtml).toContain("EVIDÊNCIA FORTE");
    expect(ptHtml).toContain("DECLIVE DE SEN / DÉCADA");
    expect(ptHtml).toContain("P-VALOR MANN-KENDALL");
    expect(ptHtml).toContain("CONFIANÇA");
    expect(ptHtml).toContain("COORDENADAS");
    expect(ptHtml).toContain("FONTE:");
    expect(ptHtml).toContain("CONSULTA:");
    expect(ptHtml).toContain("Código de verificação do dossiê");
    expect(ptHtml).toContain("FAIXAS DE ANOMALIA (Z-SCORE)");
    expect(ptHtml).not.toContain("Evidence Card &amp; Data Export");
    expect(ptHtml).not.toContain("STRONG EVIDENCE");
    expect(ptHtml).not.toContain("TOTAL SHIFT");

    const enHtml = renderToStaticMarkup(
      createElement(ShareSheet, {
        result: vilhena,
        locale: "en",
        onClose: () => {},
      }),
    );
    expect(enHtml).toContain("Evidence Card &amp; Data Export");
    expect(enHtml).toContain("EVIDENCE EXPORT · SHARE DOSSIER");
    expect(enHtml).toContain("ESC / CLOSE");
    expect(enHtml).toContain("Square 1:1");
    expect(enHtml).toContain("Download Evidence PNG");
    expect(enHtml).toContain("Download CSV Series");
    expect(enHtml).toContain("Copy Scientific Citation");
    expect(enHtml).toContain("Copy Share Link");
    expect(enHtml).toContain("GEOTREND · CASE FILE");
    expect(enHtml).toContain("TOTAL SHIFT (45 YRS)");
    expect(enHtml).toContain("STRONG EVIDENCE");
    expect(enHtml).toContain("ANOMALY STRIPES (Z-SCORE)");
    expect(enHtml).not.toContain("Card de Evidência &amp; Exportação de Dados");
  });

  it("reads active I18nProvider locale inside ShareSheet, EvidenceCard, LanguageToggle, TrendChart, and ClimateStripes", () => {
    const ariquemes = getCasePresetById("02").result;

    const ptBundle = renderWithLocale(
      "pt",
      createElement(
        "div",
        null,
        createElement(LanguageToggle),
        createElement(TrendChart, {
          series: ariquemes.series,
          unit: ariquemes.unit,
          variable: ariquemes.variable,
        }),
        createElement(ClimateStripes, {
          series: ariquemes.series,
          variable: ariquemes.variable,
          unit: ariquemes.unit,
        }),
        createElement(EvidenceCard, { result: ariquemes }),
        createElement(ShareSheet, { result: ariquemes }),
      ),
    );
    expect(ptBundle).toContain('aria-label="Idioma"');
    expect(ptBundle).toContain("Gráfico (Linha + Tendência de Sen): valores observados em °C");
    expect(ptBundle).toContain("Card de Evidência &amp; Exportação de Dados");
    expect(ptBundle).toContain("Temperatura Mínima Noturna (2m) (T2M_MIN) · Anual (Jan–Dez)");

    const enBundle = renderWithLocale(
      "en",
      createElement(
        "div",
        null,
        createElement(LanguageToggle),
        createElement(TrendChart, {
          series: ariquemes.series,
          unit: ariquemes.unit,
          variable: ariquemes.variable,
        }),
        createElement(ClimateStripes, {
          series: ariquemes.series,
          variable: ariquemes.variable,
          unit: ariquemes.unit,
        }),
        createElement(EvidenceCard, { result: ariquemes }),
        createElement(ShareSheet, { result: ariquemes }),
      ),
    );
    expect(enBundle).toContain('aria-label="Language"');
    expect(enBundle).toContain("Chart (Line + Sen&#x27;s Trend): observed values in °C");
    expect(enBundle).toContain("Evidence Card &amp; Data Export");
    expect(enBundle).toContain("Minimum Night-Time Temperature (2m) (T2M_MIN) · Annual (Jan–Dec)");
  });

  it("keeps user-facing PT and EN copy free of internal engineering jargon", () => {
    const collectLeafStrings = (dict: unknown): string[] => {
      if (typeof dict !== "object" || dict === null) return [];
      return Object.values(dict as Record<string, unknown>).flatMap((value) =>
        typeof value === "object" && value !== null ? collectLeafStrings(value) : [String(value)],
      );
    };

    const forbiddenUiJargon =
      /\bD1\b|camada\s*1|layer\s*1|AM-Oc|NASA API|\bp bruto\b|\braw p\b(?!-value)/i;

    for (const [localeName, dict] of [
      ["pt", pt],
      ["en", en],
    ] as const) {
      for (const value of collectLeafStrings(dict)) {
        expect(value, `${localeName} copy leaked internal jargon: ${value}`).not.toMatch(
          forbiddenUiJargon,
        );
      }
    }

    expect(pt.dossier.recentTitle).toBe("Dossiês compartilhados recentes");
    expect(en.dossier.recentTitle).toBe("Recent shared dossiers");
    expect(pt.dossier.recentEmpty).toBe("Nenhum dossiê compartilhado foi salvo ainda.");
    expect(en.dossier.recentEmpty).toBe("No shared dossiers saved yet.");
    expect(pt.dossier.recentError).toBe("Não foi possível carregar os dossiês recentes agora.");
    expect(en.dossier.recentError).toBe("Could not load recent dossiers right now.");
    expect(pt.form.scanColPValue).toBe("p-valor");
    expect(en.form.scanColPValue).toBe("p-value");
    expect(pt.cases.filters.offlineReady).toBe("Caso offline");
    expect(en.cases.filters.offlineReady).toBe("Offline case");
    expect(pt.cases.filters.liveQuery).toBe("Dados NASA");
    expect(en.cases.filters.liveQuery).toBe("Live NASA");
    expect(pt.pagination.summary).toBe("Mostrando {{start}}–{{end}} de {{total}}");
    expect(en.pagination.summary).toBe("Showing {{start}}–{{end}} of {{total}}");
    expect(pt.pagination.previous).toBe("Anterior");
    expect(en.pagination.previous).toBe("Previous");
    expect(pt.pagination.next).toBe("Próxima");
    expect(en.pagination.next).toBe("Next");
    expect(pt.pagination.casesNavLabel).toBe("Paginação de investigações");
    expect(en.pagination.casesNavLabel).toBe("Investigations pagination");
    expect(pt.pagination.dossiersNavLabel).toBe("Paginação de dossiês recentes");
    expect(en.pagination.dossiersNavLabel).toBe("Recent dossiers pagination");
  });
});
