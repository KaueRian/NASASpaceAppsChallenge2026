import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractExtremeYearsForAi,
  findCuratedCityMatch,
  resolveAiLocation,
} from "../src/lib/ai/clientAi.ts";
import {
  BEST_FIRST_GEMINI_MODELS,
  buildGeminiRequestBody,
  callGeminiStructured,
  DEFAULT_GEMINI_MODEL,
  extractGeminiJsonPayload,
  GeminiClientError,
  resolveCandidateModels,
  resolveThinkingLevelForModel,
} from "../src/lib/ai/geminiClient.ts";
import {
  FILTER_TRANSLATION_JSON_SCHEMA,
  INTERPRETATION_JSON_SCHEMA,
} from "../src/lib/ai/schemas.ts";
import {
  sanitizeAiTranslatedFilters,
  validateAiInterpretRequest,
  validateAiTranslateRequest,
} from "../src/lib/ai/validation.ts";

describe("AI domain schemas, validation & Gemini payload rules (TDD)", () => {
  it("validates AI translate request bounds and preserves optional currentContext", () => {
    expect(validateAiTranslateRequest(null).ok).toBe(false);
    expect(validateAiTranslateRequest({ question: "   ", lang: "pt" }).ok).toBe(false);
    expect(validateAiTranslateRequest({ question: "a".repeat(501), lang: "pt" }).ok).toBe(false);

    const valid = validateAiTranslateRequest({
      question: "  E na estação seca desde 1990?  ",
      lang: "pt",
      currentContext: {
        lat: -12.74,
        lon: -60.14,
        label: "Vilhena, RO, Brazil",
        variable: "PRECTOTCORR",
        season: "apr_sep",
        startYear: 1981,
        endYear: 2025,
      },
    });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.data.question).toBe("E na estação seca desde 1990?");
      expect(valid.data.lang).toBe("pt");
      expect(valid.data.currentContext?.label).toBe("Vilhena, RO, Brazil");
    }
  });

  it("sanitizes translated filters within NASA POWER 4-variable contract and 15-year minimum", () => {
    const fallbackCtx = {
      lat: -12.74,
      lon: -60.14,
      label: "Vilhena, RO, Brazil",
      variable: "PRECTOTCORR" as const,
      season: "apr_sep" as const,
      startYear: 1981,
      endYear: 2025,
    };

    const sanitized = sanitizeAiTranslatedFilters(
      {
        reuseCurrentLocation: true,
        locationQuery: "",
        variable: "T2M_MAX",
        season: "invalid_season",
        startYear: 2020,
        endYear: 2025,
        runMultiVariableScan: true,
      },
      fallbackCtx,
      2025,
    );

    expect(sanitized.reuseCurrentLocation).toBe(true);
    expect(sanitized.locationQuery).toBe("Vilhena, RO, Brazil");
    expect(sanitized.lat).toBe(-12.74);
    expect(sanitized.lon).toBe(-60.14);
    expect(sanitized.variable).toBe("PRECTOTCORR");
    expect(sanitized.season).toBe("apr_sep");
    expect(sanitized.endYear).toBe(2025);
    expect(sanitized.startYear).toBe(2011);
    expect(sanitized.runMultiVariableScan).toBe(true);
  });

  it("builds Gemini 4 request body using thinkingLevel + responseJsonSchema without forbidden fields", () => {
    const body = buildGeminiRequestBody({
      model: "gemini-4-hydrogen",
      systemInstruction: "System guardrail",
      promptText: "Question",
      jsonSchema: FILTER_TRANSLATION_JSON_SCHEMA,
      thinkingLevel: "low",
    });

    const config = body.generationConfig as Record<string, unknown>;
    expect(config.responseMimeType).toBe("application/json");
    expect(config.responseJsonSchema).toEqual(FILTER_TRANSLATION_JSON_SCHEMA);
    expect("responseSchema" in config).toBe(false);
    expect("temperature" in config).toBe(false);
    expect(config.thinkingConfig).toEqual({
      thinkingLevel: "low",
      includeThoughts: true,
    });
    expect("thinkingBudget" in (config.thinkingConfig as Record<string, unknown>)).toBe(false);
    expect(JSON.stringify(INTERPRETATION_JSON_SCHEMA)).toContain("causalityWarning");
  });

  it("extracts non-thought JSON text parts from Gemini responses cleanly and rejects empty/corrupt output", () => {
    const parsed = extractGeminiJsonPayload<{ inScope: boolean }>({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { thought: true, text: "Internal reasoning draft not valid JSON" },
              { text: '{"inScope": true}' },
            ],
          },
        },
      ],
    });
    expect(parsed).toEqual({ inScope: true });

    expect(() =>
      extractGeminiJsonPayload({
        candidates: [
          { finishReason: "SAFETY", content: { parts: [{ thought: true, text: "x" }] } },
        ],
      }),
    ).toThrow(GeminiClientError);
  });

  it("validates AI interpret request payload bounds cleanly", () => {
    const bad = validateAiInterpretRequest({ question: "test", lang: "pt" });
    expect(bad.ok).toBe(false);

    const good = validateAiInterpretRequest({
      question: "A estação seca de Vilhena está perdendo chuvas?",
      lang: "pt",
      location: { label: "Vilhena, RO, Brazil", lat: -12.74, lon: -60.14 },
      variable: "PRECTOTCORR",
      unit: "mm",
      season: "apr_sep",
      stats: {
        mannKendallS: -392,
        mannKendallVariance: 10516.67,
        startYear: 1981,
        endYear: 2025,
        nYears: 45,
        fullPeriodMean: 380,
        fullPeriodStdDev: 60,
        zScore: -3.82,
        pValue: 0.000131,
        confidenceLevel: 99,
        senSlopePerYear: -5.33,
        senSlopePerDecade: -53.29,
        totalChangeOverPeriod: -234.46,
        olsSlopePerYear: -5.1,
        rSquared: 0.32,
        lag1Autocorrelation: 0.11,
        verdict: "STRONG_EVIDENCE",
        direction: "drier",
      },
      extremeYears: [{ label: "2016", value: 210.5, zScore: -2.1 }],
    });
    expect(good.ok).toBe(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("resolves AI locations via context reuse, curated quick cities, or /api/geocode", async () => {
    expect(findCuratedCityMatch("Cuiaba, MT")?.label).toBe("Cuiabá, MT, Brazil");

    const reused = await resolveAiLocation(
      {
        reuseCurrentLocation: true,
        locationQuery: "Vilhena",
        variable: "T2M",
        season: "annual",
        startYear: 1981,
        endYear: 2025,
        runMultiVariableScan: false,
      },
      {
        lat: -12.74,
        lon: -60.14,
        label: "Vilhena, RO, Brazil",
        variable: "PRECTOTCORR",
        season: "apr_sep",
        startYear: 1981,
        endYear: 2025,
      },
    );
    expect(reused.label).toBe("Vilhena, RO, Brazil");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          results: [
            {
              name: "Belo Horizonte",
              lat: -19.92,
              lon: -43.94,
              label: "Belo Horizonte, MG, Brazil",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const geocoded = await resolveAiLocation({
      reuseCurrentLocation: false,
      locationQuery: "Belo Horizonte, Brazil",
      variable: "T2M",
      season: "annual",
      startYear: 1981,
      endYear: 2025,
      runMultiVariableScan: false,
    });
    expect(geocoded).toEqual({
      lat: -19.92,
      lon: -43.94,
      label: "Belo Horizonte, MG, Brazil",
    });
  });

  it("extracts top extreme anomaly years sorted by |zScore| magnitude", () => {
    const extremes = extractExtremeYearsForAi([
      {
        year: 2001,
        label: "2001",
        value: 100,
        trendValue: 100,
        zScore: 0.2,
        isExtremeAnomaly: false,
      },
      {
        year: 2016,
        label: "2016",
        value: 60,
        trendValue: 90,
        zScore: -2.4,
        isExtremeAnomaly: true,
      },
      {
        year: 2023,
        label: "2023",
        value: 55,
        trendValue: 85,
        zScore: -2.9,
        isExtremeAnomaly: true,
      },
    ]);
    expect(extremes[0]?.label).toBe("2023");
    expect(extremes[1]?.label).toBe("2016");
    expect(extremes).toHaveLength(2);
  });

  it("orders best-first accessible Gemini models, clamps unsupported thinkingLevel, and sets 8192 maxOutputTokens for high/xhigh", () => {
    expect(DEFAULT_GEMINI_MODEL).toBe("auto");
    expect(BEST_FIRST_GEMINI_MODELS).toEqual([
      "gemini-4-hydrogen",
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3-flash-preview",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ]);

    for (const blocked of [
      "gemini-4-carbon",
      "gemini-4-argon",
      "gemini-3.1-pro-preview",
      "gemini-pro-latest",
    ]) {
      expect(BEST_FIRST_GEMINI_MODELS).not.toContain(blocked);
    }

    expect(resolveCandidateModels("auto")).toEqual([...BEST_FIRST_GEMINI_MODELS]);
    expect(resolveCandidateModels("")).toEqual([...BEST_FIRST_GEMINI_MODELS]);
    expect(resolveCandidateModels("models/gemini-3.6-flash")[0]).toBe("gemini-3.6-flash");
    expect(resolveCandidateModels("models/gemini-3.6-flash")).toHaveLength(
      BEST_FIRST_GEMINI_MODELS.length,
    );

    expect(resolveThinkingLevelForModel("gemini-4-hydrogen", "xhigh")).toBe("xhigh");
    expect(resolveThinkingLevelForModel("gemini-4-hydrogen", "minimal")).toBe("low");
    expect(resolveThinkingLevelForModel("gemini-3.8-flash", "xhigh")).toBe("high");
    expect(resolveThinkingLevelForModel("gemini-3.5-flash-lite", "minimal")).toBe("minimal");

    const xhighBody = buildGeminiRequestBody({
      model: "gemini-4-hydrogen",
      systemInstruction: "Sys",
      promptText: "Prompt",
      jsonSchema: INTERPRETATION_JSON_SCHEMA,
      thinkingLevel: "xhigh",
    });
    const xhighConfig = xhighBody.generationConfig as {
      maxOutputTokens: number;
      thinkingConfig: { thinkingLevel: string };
    };
    expect(xhighConfig.maxOutputTokens).toBe(8192);
    expect(xhighConfig.thinkingConfig.thinkingLevel).toBe("xhigh");

    const clampedBody = buildGeminiRequestBody({
      model: "gemini-3.8-flash",
      systemInstruction: "Sys",
      promptText: "Prompt",
      jsonSchema: INTERPRETATION_JSON_SCHEMA,
      thinkingLevel: "xhigh",
    });
    const clampedConfig = clampedBody.generationConfig as {
      maxOutputTokens: number;
      thinkingConfig: { thinkingLevel: string };
    };
    expect(clampedConfig.maxOutputTokens).toBe(8192);
    expect(clampedConfig.thinkingConfig.thinkingLevel).toBe("high");

    const minimalHydrogenBody = buildGeminiRequestBody({
      model: "gemini-4-hydrogen",
      systemInstruction: "Sys",
      promptText: "Prompt",
      jsonSchema: FILTER_TRANSLATION_JSON_SCHEMA,
      thinkingLevel: "minimal",
    });
    const minimalHydrogenConfig = minimalHydrogenBody.generationConfig as {
      maxOutputTokens: number;
      thinkingConfig: { thinkingLevel: string };
    };
    expect(minimalHydrogenConfig.maxOutputTokens).toBe(4096);
    expect(minimalHydrogenConfig.thinkingConfig.thinkingLevel).toBe("low");
  });

  it("enforces route latency budgets cleanly and retries HTTP 400 unsupported thinkingLevel without cooldown", async () => {
    const unsupportedThenOk = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: "Thinking level xhigh is not supported for this request." },
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: { parts: [{ text: JSON.stringify({ ok: true }) }] },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", unsupportedThenOk);

    const cooldownSpy = vi.fn();
    const recovered = await callGeminiStructured<{ ok: boolean }>({
      apiKey: "test-key",
      model: "auto",
      stage: "interpret",
      systemInstruction: "Sys",
      promptText: "Prompt",
      jsonSchema: INTERPRETATION_JSON_SCHEMA,
      onModelFailure: cooldownSpy,
    });
    expect(recovered.parsed).toEqual({ ok: true });
    expect(recovered.model).toBe("gemini-3.8-flash");
    expect(recovered.fallbackUsed).toBe(true);
    expect(cooldownSpy).not.toHaveBeenCalled();

    let nowMs = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => nowMs);
    const slowFetch = vi.fn().mockImplementation(async () => {
      nowMs += 6_000;
      return new Response(JSON.stringify({ error: { message: "Overloaded" } }), { status: 503 });
    });
    vi.stubGlobal("fetch", slowFetch);

    await expect(
      callGeminiStructured<{ ok: boolean }>({
        apiKey: "test-key",
        model: "auto",
        stage: "translate",
        systemInstruction: "Sys",
        promptText: "Prompt",
        jsonSchema: FILTER_TRANSLATION_JSON_SCHEMA,
        routeBudgetMs: 11_500,
      }),
    ).rejects.toThrow(GeminiClientError);
    // Two attempts x 6,000ms = 12,000ms exceeds 11,500ms budget -> stops after 2 calls instead of burning all 8 candidates.
    expect(slowFetch).toHaveBeenCalledTimes(2);
  });
});
