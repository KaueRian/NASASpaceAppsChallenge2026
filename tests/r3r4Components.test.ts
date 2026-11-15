import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiAssistantBar } from "../src/components/AiAssistantBar";
import { AiSynthesisPanel } from "../src/components/AiSynthesisPanel";
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
    expect(html).toContain("FAIXAS DE ANOMALIA (Z-SCORE)");
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
    expect(html).toContain('loading="eager"');
    expect(html).toContain('decoding="async"');
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

  it("renders AI-first search bar by default, collapses manual filters under Advanced, and warns on invalid spans", () => {
    const defaultHtml = renderWithI18n(
      createElement(Investigation, {
        presetId: "01",
        onNavigateMethods: () => {},
      }),
    );
    expect(defaultHtml).toContain('aria-label="Faça uma pergunta investigativa sobre o clima"');
    expect(defaultHtml).toContain('aria-expanded="false"');
    expect(defaultHtml).toContain("45 anos");
    expect(defaultHtml).not.toContain('aria-label="Ano Inicial"');

    const advancedHtml = renderWithI18n(
      createElement(Investigation, {
        presetId: "01",
        defaultAdvancedOpen: true,
        onNavigateMethods: () => {},
      }),
    );
    expect(advancedHtml).toContain('aria-expanded="true"');
    expect(advancedHtml).toContain('aria-label="Ano Inicial"');
    expect(advancedHtml).toContain('aria-label="Ano Final"');
    expect(advancedHtml).not.toContain('type="number"');

    const shortHtml = renderWithI18n(
      createElement(Investigation, {
        presetId: "01",
        initialLiveQuery: {
          lat: -12.74,
          lon: -60.14,
          variable: "T2M",
          season: "annual",
          startYear: 2015,
          endYear: 2025,
          label: "Vilhena, RO, Brazil",
        },
        onNavigateMethods: () => {},
      }),
    );
    expect(shortHtml).toContain("Período selecionado: 11 anos (2015–2025)");
    expect(shortHtml).toContain('disabled=""');

    const reversedHtml = renderWithI18n(
      createElement(Investigation, {
        presetId: "01",
        initialLiveQuery: {
          lat: -12.74,
          lon: -60.14,
          variable: "T2M",
          season: "annual",
          startYear: 2020,
          endYear: 2005,
          label: "Vilhena, RO, Brazil",
        },
        onNavigateMethods: () => {},
      }),
    );
    expect(reversedHtml).toContain(
      "O ano inicial (2020) precisa ser menor ou igual ao ano final (2005).",
    );
  });

  it("renders AiAssistantBar unhappy-path recovery states and AiSynthesisPanel grounding cards", () => {
    const outOfScopeHtml = renderWithI18n(
      createElement(AiAssistantBar, {
        question: "Vai chover amanhã em Manaus?",
        onQuestionChange: () => {},
        onAskQuestion: () => {},
        stage: "done",
        isBusy: false,
        translation: {
          ok: true,
          inScope: false,
          outOfScopeMessage: "A ferramenta analisa séries históricas de longo prazo (>= 15 anos).",
          suggestedValidQuestions: ["Como mudou a chuva em Manaus desde 1981?"],
          reasoning: "Short-term forecast requested.",
          initialHypothesis: "",
          filters: {
            reuseCurrentLocation: false,
            locationQuery: "Manaus",
            variable: "PRECTOTCORR",
            season: "annual",
            startYear: 1981,
            endYear: 2025,
            runMultiVariableScan: false,
          },
          model: "gemini-4-hydrogen",
          cached: false,
        },
        errorCode: "AI_NOT_CONFIGURED",
        hasScanApplied: false,
        filterSummaryLine: "PRECTOTCORR · Vilhena · 1981–2025",
        advancedOpen: false,
        onToggleAdvanced: () => {},
        onOpenAdvancedForRecovery: () => {},
      }),
    );
    expect(outOfScopeHtml).toContain("Fora do escopo histórico da ferramenta");
    expect(outOfScopeHtml).toContain("Como mudou a chuva em Manaus desde 1981?");
    expect(outOfScopeHtml).toContain("Abrir filtros manuais (Avançado)");
    expect(outOfScopeHtml).toContain("Concluído · IA");
    expect(outOfScopeHtml).toContain("Não executada");

    const runningHtml = renderWithI18n(
      createElement(AiAssistantBar, {
        question: "Como mudou a chuva em Vilhena?",
        onQuestionChange: () => {},
        onAskQuestion: () => {},
        stage: "computing",
        isBusy: true,
        translation: {
          ok: true,
          inScope: true,
          reasoning: "Vilhena rain.",
          initialHypothesis: "Rain drop.",
          suggestedValidQuestions: [],
          filters: {
            reuseCurrentLocation: false,
            locationQuery: "Vilhena",
            variable: "PRECTOTCORR",
            season: "apr_sep",
            startYear: 1981,
            endYear: 2025,
            runMultiVariableScan: false,
          },
          model: "gemini-3.5-flash-lite",
          cached: false,
        },
        errorCode: null,
        hasScanApplied: false,
        filterSummaryLine: "PRECTOTCORR · Vilhena · 1981–2025",
        advancedOpen: false,
        onToggleAdvanced: () => {},
        onOpenAdvancedForRecovery: () => {},
      }),
    );
    expect(runningHtml).toContain("Concluído · IA");
    expect(runningHtml).toContain("Executando…");
    expect(runningHtml).toContain("Aguardando");
    expect(runningHtml).toContain("animate-pulse");

    const failedStageHtml = renderWithI18n(
      createElement(AiAssistantBar, {
        question: "Como mudou a chuva em Vilhena?",
        onQuestionChange: () => {},
        onAskQuestion: () => {},
        stage: "error",
        failedStage: "computing",
        isBusy: false,
        translation: {
          ok: true,
          inScope: true,
          reasoning: "Vilhena rain.",
          initialHypothesis: "Rain drop.",
          suggestedValidQuestions: [],
          filters: {
            reuseCurrentLocation: false,
            locationQuery: "Vilhena",
            variable: "PRECTOTCORR",
            season: "apr_sep",
            startYear: 1981,
            endYear: 2025,
            runMultiVariableScan: false,
          },
          model: "gemini-3.5-flash-lite",
          cached: false,
        },
        errorCode: null,
        hasScanApplied: false,
        filterSummaryLine: "PRECTOTCORR · Vilhena · 1981–2025",
        advancedOpen: false,
        onToggleAdvanced: () => {},
        onOpenAdvancedForRecovery: () => {},
      }),
    );
    expect(failedStageHtml).toContain("Concluído · IA");
    expect(failedStageHtml).toContain("Falhou");
    expect(failedStageHtml).toContain("Não executada");

    const synthesisHtml = renderWithI18n(
      createElement(AiSynthesisPanel, {
        interpretation: {
          ok: true,
          directAnswer: "A precipitação seca em Vilhena caiu 234,5 mm (1981–2025).",
          keyFindings: ["Tendência significativa p = 0,000131"],
          hypotheses: [
            { title: "Cobertura do solo", description: "Evapotranspiração regional alterada." },
            { title: "Oscilações oceânicas", description: "Modulação ENOS / Atlântico Tropical." },
          ],
          causalityWarning: "Correlação estatística não prova causalidade isolada.",
          followUpQuestions: ["Comparar com a estação chuvosa em Vilhena?"],
          model: "gemini-4-hydrogen",
          cached: false,
        },
        isInterpreting: false,
        onSelectFollowUp: () => {},
      }),
    );
    expect(synthesisHtml).toContain("Síntese Científica da IA");
    expect(synthesisHtml).not.toContain("gemini-4-hydrogen");
    expect(synthesisHtml).toContain("Cobertura do solo");
    expect(synthesisHtml).toContain("Correlação estatística não prova causalidade isolada.");
    expect(synthesisHtml).toContain("Comparar com a estação chuvosa em Vilhena?");
  });

  it("renders expanded 20-case investigation catalog with filter controls and live active state", () => {
    const html = renderWithI18n(
      createElement(CasesGrid, {
        activePresetId: "01",
        activeLiveQuery: {
          lat: -12.09,
          lon: -45.79,
          variable: "GWETROOT",
          season: "apr_sep",
          startYear: 1981,
          endYear: 2025,
          label: "Barreiras (MATOPIBA), BA, Brazil",
        },
        onSelectPreset: () => {},
        onSelectInvestigation: () => {},
      }),
    );
    expect(html).toContain("20 de 20 investigações");
    expect(html).toContain('aria-label="Escala"');
    expect(html).toContain('aria-label="Variável"');
    expect(html).toContain('aria-label="Janela"');
    expect(html).toContain('aria-label="Buscar investigação"');
    expect(html).toContain("Barreiras (MATOPIBA), BA, Brasil");
    expect(html).toContain("Belém, PA, Brasil");
    expect(html).toContain("Porto Alegre, RS, Brasil");
    expect(html).toContain("Sevilha, Espanha");

    const liveInvestigationHtml = renderWithI18n(
      createElement(Investigation, {
        presetId: "01",
        initialLiveQuery: {
          lat: -12.09,
          lon: -45.79,
          variable: "GWETROOT",
          season: "apr_sep",
          startYear: 1981,
          endYear: 2025,
          label: "Barreiras (MATOPIBA), BA, Brazil",
        },
        onNavigateMethods: () => {},
      }),
    );
    expect(liveInvestigationHtml).toContain("Barreiras (MATOPIBA), BA, Brazil");
    expect(liveInvestigationHtml).toContain("Estação Seca (Abr–Set)");
    expect(liveInvestigationHtml).not.toContain("Derivado do Caso #01");
  });
});
