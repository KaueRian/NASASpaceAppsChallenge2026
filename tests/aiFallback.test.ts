import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiAssistantBar } from "../src/components/AiAssistantBar.tsx";
import { getCasePresetById } from "../src/data/presets/index.ts";
import { I18nProvider } from "../src/i18n/i18n.tsx";
import { ClientAiError } from "../src/lib/ai/clientAi.ts";
import {
  interpretWithLocalFallback,
  isAiOutageError,
  translateQuestionWithLocalFallback,
} from "../src/lib/ai/fallback.ts";

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

  it("renders transparent fallback mode notice inside AiAssistantBar", () => {
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(AiAssistantBar, {
          question: "Chuva em Vilhena?",
          onQuestionChange: () => {},
          onAskQuestion: () => {},
          stage: "done",
          isBusy: false,
          translation: null,
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
    expect(html).toContain("Gemini");
    expect(html).toContain("NASA POWER");
  });
});
