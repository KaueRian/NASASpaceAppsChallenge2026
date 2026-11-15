import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiAssistantBar, resolvePipelineStepStates } from "../src/components/AiAssistantBar.tsx";
import { AiSynthesisPanel } from "../src/components/AiSynthesisPanel.tsx";
import { AiLayer1TranslationDetails } from "../src/components/Investigation.tsx";
import { getCasePresetById } from "../src/data/presets/index.ts";
import { I18nProvider, type Locale } from "../src/i18n/i18n.tsx";
import { ClientAiError } from "../src/lib/ai/clientAi.ts";
import {
  interpretWithLocalFallback,
  isAiOutageError,
  translateQuestionWithLocalFallback,
} from "../src/lib/ai/fallback.ts";
import en from "../src/locales/en.json";
import pt from "../src/locales/pt.json";

function renderWithLocale(locale: Locale, node: ReturnType<typeof createElement>): string {
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

describe("AI outage resilient fallback mode (TDD)", () => {
  it("detects AI outage and unconfigured errors cleanly while excluding validation and abort errors", () => {
    expect(isAiOutageError(new ClientAiError("AI_NOT_CONFIGURED", "503"))).toBe(true);
    expect(isAiOutageError(new ClientAiError("AI_RATE_LIMITED", "429"))).toBe(true);
    expect(isAiOutageError(new ClientAiError("AI_TIMEOUT", "504"))).toBe(true);
    expect(isAiOutageError(new ClientAiError("AI_UPSTREAM_ERROR", "502"))).toBe(true);
    expect(isAiOutageError(new ClientAiError("AI_BAD_RESPONSE", "502"))).toBe(true);
    expect(isAiOutageError(new ClientAiError("AI_INVALID_REQUEST", "400"))).toBe(false);

    const abortErr = new Error("Aborted");
    abortErr.name = "AbortError";
    expect(isAiOutageError(abortErr)).toBe(false);
    expect(isAiOutageError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("deterministically parses climate questions into valid NASA POWER filters", () => {
    const vilhenaDry = translateQuestionWithLocalFallback(
      {
        question: "A estação seca em Vilhena ficou mais seca desde 1990?",
        lang: "pt",
      },
      2025,
    );
    expect(vilhenaDry.inScope).toBe(true);
    expect(vilhenaDry.filters.variable).toBe("PRECTOTCORR");
    expect(vilhenaDry.filters.season).toBe("apr_sep");
    expect(vilhenaDry.filters.startYear).toBe(1990);
    expect(vilhenaDry.filters.endYear).toBe(2025);
    expect(vilhenaDry.filters.locationQuery).toBe("Vilhena, RO, Brazil");
    expect(vilhenaDry.filters.runMultiVariableScan).toBe(false);
    expect(vilhenaDry.model).toBe("local-deterministic-fallback");

    const ariquemesNights = translateQuestionWithLocalFallback(
      {
        question: "As noites em Ariquemes ficaram mais quentes?",
        lang: "pt",
      },
      2025,
    );
    expect(ariquemesNights.inScope).toBe(true);
    expect(ariquemesNights.filters.variable).toBe("T2M_MIN");
    expect(ariquemesNights.filters.season).toBe("annual");
    expect(ariquemesNights.filters.locationQuery).toBe("Ariquemes, RO, Brazil");

    const manausScan = translateQuestionWithLocalFallback(
      {
        question: "Which climate variables changed significantly in Manaus?",
        lang: "en",
      },
      2025,
    );
    expect(manausScan.inScope).toBe(true);
    expect(manausScan.filters.locationQuery).toBe("Manaus, AM, Brazil");
    expect(manausScan.filters.runMultiVariableScan).toBe(true);

    const soilCustomCity = translateQuestionWithLocalFallback(
      {
        question: "Soil moisture drying in Belo Horizonte over the last 20 years?",
        lang: "en",
      },
      2025,
    );
    expect(soilCustomCity.inScope).toBe(true);
    expect(soilCustomCity.filters.variable).toBe("GWETROOT");
    expect(soilCustomCity.filters.startYear).toBe(2006);
    expect(soilCustomCity.filters.endYear).toBe(2025);
    expect(soilCustomCity.filters.locationQuery.toLowerCase()).toContain("belo horizonte");
  });

  it("handles implicit follow-ups, approximated constraints, and out-of-scope queries", () => {
    const followUp = translateQuestionWithLocalFallback(
      {
        question: "E na estação chuvosa desde 1995?",
        lang: "pt",
        currentContext: {
          lat: -9.91,
          lon: -63.04,
          label: "Ariquemes, RO, Brazil",
          variable: "T2M_MIN",
          season: "annual",
          startYear: 1981,
          endYear: 2025,
        },
      },
      2025,
    );
    expect(followUp.inScope).toBe(true);
    expect(followUp.filters.reuseCurrentLocation).toBe(true);
    expect(followUp.filters.locationQuery).toBe("Ariquemes, RO, Brazil");
    expect(followUp.filters.variable).toBe("T2M_MIN");
    expect(followUp.filters.season).toBe("oct_mar");
    expect(followUp.filters.startYear).toBe(1995);

    const approximated = translateQuestionWithLocalFallback(
      {
        question: "Qual a tendência da temperatura máxima diária em Cuiabá de 2018 a 2025?",
        lang: "pt",
      },
      2025,
    );
    expect(approximated.inScope).toBe(true);
    expect(approximated.filters.variable).toBe("T2M");
    expect(
      approximated.filters.endYear - approximated.filters.startYear + 1,
    ).toBeGreaterThanOrEqual(15);
    expect(approximated.limitationNotice).toBeTruthy();

    const weatherForecast = translateQuestionWithLocalFallback(
      {
        question: "Vai chover amanhã em Vilhena?",
        lang: "pt",
      },
      2025,
    );
    expect(weatherForecast.inScope).toBe(false);
    expect(weatherForecast.outOfScopeMessage).toBeTruthy();
    expect(weatherForecast.suggestedValidQuestions.length).toBeGreaterThanOrEqual(2);
  });

  it("builds deterministic grounded scientific synthesis respecting verdicts, caveats, and °F", () => {
    const ariquemes = getCasePresetById("02").result;
    const ptSynth = interpretWithLocalFallback(
      {
        question: "As noites em Ariquemes ficaram mais quentes?",
        lang: "pt",
        location: ariquemes.location,
        variable: ariquemes.variable,
        unit: ariquemes.unit,
        season: ariquemes.season,
        stats: {
          ...ariquemes.stats,
          warnings: { shortRecord: false, highAutocorrelation: true },
        },
        extremeYears: [{ label: "2024", value: 23.1, zScore: 2.25 }],
        scanSummary: [
          {
            variable: "T2M_MIN",
            season: "annual",
            senSlopePerDecade: ariquemes.stats.senSlopePerDecade,
            pValue: ariquemes.stats.pValue,
            qValue: ariquemes.stats.pValue,
            fdrSignificant: true,
            verdict: ariquemes.stats.verdict,
            direction: ariquemes.stats.direction,
          },
        ],
      },
      "F",
    );

    expect(ptSynth.ok).toBe(true);
    expect(ptSynth.model).toBe("local-statistical-fallback");
    expect(ptSynth.directAnswer).toContain("°F");
    expect(ptSynth.keyFindings.some((f) => /autocorrela/i.test(f))).toBe(true);
    expect(ptSynth.keyFindings.some((f) => f.includes("2024"))).toBe(true);
    expect(ptSynth.keyFindings.some((f) => /FDR/i.test(f))).toBe(true);
    expect(ptSynth.hypotheses).toHaveLength(2);
    expect(ptSynth.causalityWarning.toLowerCase()).toContain("causal");
    expect(ptSynth.followUpQuestions.length).toBeGreaterThanOrEqual(2);

    const insufficient = interpretWithLocalFallback({
      question: "Did rainfall change significantly?",
      lang: "en",
      location: { label: "Sample City", lat: 0, lon: 0 },
      variable: "PRECTOTCORR",
      unit: "mm",
      season: "annual",
      stats: {
        ...ariquemes.stats,
        pValue: 0.42,
        zScore: 0.81,
        verdict: "INSUFFICIENT_EVIDENCE",
        direction: "neutral",
        warnings: { shortRecord: true, highAutocorrelation: false },
      },
      extremeYears: [],
    });
    expect(insufficient.directAnswer.toLowerCase()).toContain("insufficient");
    expect(insufficient.keyFindings.some((f) => /short record|< 20/i.test(f))).toBe(true);
  });

  it("resolves independent per-stage pipeline states across AI, local fallback, out-of-scope, and error paths", () => {
    const aiTranslation = {
      ok: true as const,
      inScope: true,
      reasoning: "Matched Vilhena precipitation.",
      initialHypothesis: "Dry season trend check.",
      suggestedValidQuestions: [],
      filters: {
        reuseCurrentLocation: false,
        locationQuery: "Vilhena, RO, Brazil",
        variable: "PRECTOTCORR" as const,
        season: "apr_sep" as const,
        startYear: 1990,
        endYear: 2025,
        runMultiVariableScan: false,
      },
      model: "gemini-3.5-flash-lite",
      cached: false,
    };
    const localTranslation = {
      ...aiTranslation,
      model: "local-deterministic-fallback",
    };
    const aiInterpretation = {
      ok: true as const,
      directAnswer: "Precipitation declined.",
      keyFindings: ["Significant decline."],
      hypotheses: [],
      causalityWarning: "Correlation is not causation.",
      followUpQuestions: [],
      model: "gemini-3.5-flash-lite",
      cached: false,
    };
    const localInterpretation = {
      ...aiInterpretation,
      model: "local-statistical-fallback",
    };

    expect(
      resolvePipelineStepStates({
        stage: "done",
        translation: aiTranslation,
        interpretation: aiInterpretation,
      }),
    ).toEqual(["done_ai", "done_data", "done_ai"]);

    expect(
      resolvePipelineStepStates({
        stage: "done",
        translation: localTranslation,
        interpretation: localInterpretation,
      }),
    ).toEqual(["done_local", "done_data", "done_local"]);

    expect(
      resolvePipelineStepStates({
        stage: "done",
        translation: aiTranslation,
        interpretation: localInterpretation,
      }),
    ).toEqual(["done_ai", "done_data", "done_local"]);

    expect(
      resolvePipelineStepStates({
        stage: "done",
        translation: localTranslation,
        interpretation: aiInterpretation,
      }),
    ).toEqual(["done_local", "done_data", "done_ai"]);

    expect(
      resolvePipelineStepStates({
        stage: "done",
        translation: { ...aiTranslation, inScope: false },
      }),
    ).toEqual(["done_ai", "skipped", "skipped"]);

    expect(
      resolvePipelineStepStates({
        stage: "error",
        failedStage: "computing",
        translation: aiTranslation,
      }),
    ).toEqual(["done_ai", "failed", "skipped"]);

    expect(
      resolvePipelineStepStates({
        stage: "error",
        failedStage: "translating",
        translation: null,
      }),
    ).toEqual(["failed", "skipped", "skipped"]);
  });

  it("renders transparent local fallback states and clean AI vs local synthesis badges without jargon", () => {
    const sampleTranslation = translateQuestionWithLocalFallback({
      question: "A estação seca em Vilhena ficou mais seca desde 1990?",
      lang: "pt",
    });
    const samplePreset = getCasePresetById("01").result;
    const localSynthesis = interpretWithLocalFallback({
      question: "A estação seca em Vilhena ficou mais seca desde 1990?",
      lang: "pt",
      location: samplePreset.location,
      variable: samplePreset.variable,
      unit: samplePreset.unit,
      season: samplePreset.season,
      stats: samplePreset.stats,
      extremeYears: [],
    });

    const fullFallbackHtml = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(AiAssistantBar, {
          question: "Chuva em Vilhena?",
          onQuestionChange: () => {},
          onAskQuestion: () => {},
          stage: "done",
          isBusy: false,
          translation: sampleTranslation,
          interpretation: localSynthesis,
          errorCode: null,
          fallbackActive: true,
          hasScanApplied: false,
          filterSummaryLine: "Vilhena, RO · PRECTOTCORR · Apr-Sep · 1981-2025",
          advancedOpen: false,
          onToggleAdvanced: () => {},
          onOpenAdvancedForRecovery: () => {},
        }),
      ),
    );
    expect(fullFallbackHtml).toContain("Modo local · sem IA");
    expect(fullFallbackHtml).toContain("Concluído · Dados reais");
    expect(fullFallbackHtml).not.toContain("Concluído · IA");
    expect(fullFallbackHtml).toContain("Modo local ativo (sem IA)");
    expect(fullFallbackHtml).toContain("O serviço de IA não respondeu no momento");
    expect(fullFallbackHtml).toContain("NASA POWER");
    expect(fullFallbackHtml).not.toContain("sem chave configurada");
    expect(fullFallbackHtml).not.toContain("Modo Resiliente Local Ativo");

    const partialFallbackHtml = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(AiAssistantBar, {
          question: "Chuva em Vilhena?",
          onQuestionChange: () => {},
          onAskQuestion: () => {},
          stage: "done",
          isBusy: false,
          translation: { ...sampleTranslation, model: "gemini-3.5-flash-lite" },
          interpretation: localSynthesis,
          errorCode: null,
          hasScanApplied: false,
          filterSummaryLine: "Vilhena, RO · PRECTOTCORR · Apr-Sep · 1981-2025",
          advancedOpen: false,
          onToggleAdvanced: () => {},
          onOpenAdvancedForRecovery: () => {},
        }),
      ),
    );
    expect(partialFallbackHtml).toContain("Concluído · IA");
    expect(partialFallbackHtml).toContain("Modo local · sem IA");
    expect(partialFallbackHtml).toContain("Modo local ativo (sem IA)");
    expect(partialFallbackHtml).toContain("NASA POWER");

    const localPanelHtml = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(AiSynthesisPanel, {
          interpretation: localSynthesis,
          isInterpreting: false,
          onSelectFollowUp: () => {},
        }),
      ),
    );
    expect(localPanelHtml).toContain("Síntese Estatística Local (sem IA)");
    expect(localPanelHtml).not.toContain("Gemini");
    expect(localPanelHtml).not.toContain("local-statistical-fallback");
  });

  it("never exposes Gemini, provider names, Model/Modelo labels, or technical model IDs in PT or EN UI", () => {
    const collectLeafStrings = (obj: unknown): string[] => {
      if (typeof obj === "string") return [obj];
      if (typeof obj !== "object" || obj === null) return [];
      return Object.values(obj as Record<string, unknown>).flatMap(collectLeafStrings);
    };

    for (const [localeName, aiDict] of [
      ["pt", pt.ai],
      ["en", en.ai],
    ] as const) {
      for (const value of collectLeafStrings(aiDict)) {
        expect(value, `${localeName} ai string leaked forbidden term: ${value}`).not.toMatch(
          /\bgemini\b|\bmodelo\b|\bmodel\b|local-deterministic-fallback|local-statistical-fallback/i,
        );
      }
    }

    expect(pt.ai.eyebrow).toBe("PERGUNTE EM LINGUAGEM NATURAL · NASA POWER + IA");
    expect(en.ai.eyebrow).toBe("ASK IN PLAIN LANGUAGE · NASA POWER + AI");

    const sampleAiTranslation = {
      ...translateQuestionWithLocalFallback({
        question: "Is Vilhena losing rainfall in the dry season?",
        lang: "en",
      }),
      model: "gemini-3.5-flash-lite",
    };

    const layer1DetailsPt = renderWithLocale(
      "pt",
      createElement(AiLayer1TranslationDetails, { translation: sampleAiTranslation }),
    );
    expect(layer1DetailsPt).toContain("Parâmetros estruturados da investigação");
    expect(layer1DetailsPt).toContain("Estação Seca (Abr–Set)");
    expect(layer1DetailsPt).not.toMatch(
      /camada\s*1|layer\s*1|reuseCurrentLocation|runMultiVariableScan|locationQuery|gemini|modelo|\bmodel\b/i,
    );

    const layer1DetailsEn = renderWithLocale(
      "en",
      createElement(AiLayer1TranslationDetails, { translation: sampleAiTranslation }),
    );
    expect(layer1DetailsEn).toContain("Structured Investigation Parameters");
    expect(layer1DetailsEn).toContain("Dry Season (Apr–Sep)");
    expect(layer1DetailsEn).not.toMatch(
      /camada\s*1|layer\s*1|reuseCurrentLocation|runMultiVariableScan|locationQuery|gemini|modelo|\bmodel\b/i,
    );

    const enBarUnconfigured = renderWithLocale(
      "en",
      createElement(AiAssistantBar, {
        question: "Dry season rainfall in Vilhena?",
        onQuestionChange: () => {},
        onAskQuestion: () => {},
        stage: "error",
        failedStage: "translating",
        isBusy: false,
        translation: sampleAiTranslation,
        errorCode: "AI_NOT_CONFIGURED",
        hasScanApplied: false,
        filterSummaryLine: "Vilhena · PRECTOTCORR",
        advancedOpen: false,
        onToggleAdvanced: () => {},
        onOpenAdvancedForRecovery: () => {},
      }),
    );
    expect(enBarUnconfigured).toContain("ASK IN PLAIN LANGUAGE · NASA POWER + AI");
    expect(enBarUnconfigured).toContain("AI service is not configured on this server yet");
    expect(enBarUnconfigured).not.toMatch(/gemini|\bmodel\b/i);

    const ptBarUpstream = renderWithLocale(
      "pt",
      createElement(AiAssistantBar, {
        question: "Seca em Vilhena?",
        onQuestionChange: () => {},
        onAskQuestion: () => {},
        stage: "error",
        failedStage: "interpreting",
        isBusy: false,
        translation: sampleAiTranslation,
        errorCode: "AI_UPSTREAM_ERROR",
        hasScanApplied: false,
        filterSummaryLine: "Vilhena · PRECTOTCORR",
        advancedOpen: false,
        onToggleAdvanced: () => {},
        onOpenAdvancedForRecovery: () => {},
      }),
    );
    expect(ptBarUpstream).toContain("PERGUNTE EM LINGUAGEM NATURAL · NASA POWER + IA");
    expect(ptBarUpstream).toContain("Não foi possível conectar ao serviço de IA agora");
    expect(ptBarUpstream).not.toMatch(/gemini|modelo|\bmodel\b/i);

    const preset01 = getCasePresetById("01").result;
    const aiSynth = {
      ...interpretWithLocalFallback({
        question: "Is Vilhena drying?",
        lang: "en",
        location: preset01.location,
        variable: preset01.variable,
        unit: preset01.unit,
        season: preset01.season,
        stats: preset01.stats,
        extremeYears: [],
      }),
      model: "gemini-4-hydrogen",
    };

    const enPanelHtml = renderWithLocale(
      "en",
      createElement(AiSynthesisPanel, {
        interpretation: aiSynth,
        isInterpreting: false,
        onSelectFollowUp: () => {},
      }),
    );
    expect(enPanelHtml).toContain(">AI<");
    expect(enPanelHtml).not.toMatch(/gemini|\bmodel\b/i);
  });
});
