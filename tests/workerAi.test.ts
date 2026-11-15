import type { D1Database } from "@cloudflare/workers-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AiApiErrorResponse, AiInterpretResult, AiTranslateResult } from "../src/types/ai.ts";
import { app, type WorkerBindings } from "../src/worker/index.ts";
import { resetAiRateLimitsForTests } from "../src/worker/routes/ai.ts";

function buildEnv(opts?: {
  db?: D1Database;
  geminiApiKey?: string;
  geminiModel?: string;
}): WorkerBindings {
  return {
    ASSETS: {
      fetch: async () => new Response("Not Found", { status: 404 }),
    },
    ...(opts?.db ? { DB: opts.db } : {}),
    ...(opts?.geminiApiKey ? { GEMINI_API_KEY: opts.geminiApiKey } : {}),
    ...(opts?.geminiModel ? { GEMINI_MODEL: opts.geminiModel } : {}),
  };
}

describe("Worker AI routes (/api/ai/translate and /api/ai/interpret)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetAiRateLimitsForTests();
  });

  it("returns 503 AI_NOT_CONFIGURED when GEMINI_API_KEY binding is absent", async () => {
    const res = await app.request(
      "/api/ai/translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Chuva em Vilhena?", lang: "pt" }),
      },
      buildEnv(),
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as AiApiErrorResponse;
    expect(body.ok).toBe(false);
    expect(body.code).toBe("AI_NOT_CONFIGURED");
  });

  it("POST /api/ai/translate calls Gemini v1beta using x-goog-api-key, filters thoughts, and caches result in D1", async () => {
    const geminiPayload = {
      inScope: true,
      outOfScopeMessage: "",
      limitationNotice: "",
      suggestedValidQuestions: [
        "Comparar com a estação chuvosa (Out–Mar) em Vilhena?",
        "Fazer varredura das 4 variáveis em Vilhena?",
      ],
      reasoning: "User asks about dry-season precipitation in Vilhena since 1990.",
      initialHypothesis: "Testing dry-season precipitation trend since 1990.",
      filters: {
        reuseCurrentLocation: false,
        locationQuery: "Vilhena, RO, Brazil",
        lat: -12.74,
        lon: -60.14,
        variable: "PRECTOTCORR",
        season: "apr_sep",
        startYear: 1990,
        endYear: 2025,
        runMultiVariableScan: false,
      },
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  { thought: true, text: "Planning JSON output" },
                  { text: JSON.stringify(geminiPayload) },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const runMock = vi.fn().mockResolvedValue({ success: true });
    const firstMock = vi.fn().mockResolvedValue(null);
    const fakeDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: firstMock,
          run: runMock,
        }),
      }),
    } as unknown as D1Database;

    const req = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "A seca em Vilhena ficou pior desde 1990?",
        lang: "pt",
      }),
    };

    const res1 = await app.request(
      "/api/ai/translate",
      req,
      buildEnv({ db: fakeDb, geminiApiKey: "test-gemini-key" }),
    );
    expect(res1.status).toBe(200);
    const body1 = (await res1.json()) as AiTranslateResult;
    expect(body1.ok).toBe(true);
    expect(body1.inScope).toBe(true);
    expect(body1.filters.variable).toBe("PRECTOTCORR");
    expect(body1.filters.season).toBe("apr_sep");
    expect(body1.cached).toBe(false);
    expect(body1.model).toBe("gemini-4-hydrogen");
    expect(body1.thinkingLevel).toBe("low");
    expect(body1.fallbackUsed).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toContain("/v1beta/models/gemini-4-hydrogen:generateContent");
    expect((calledInit.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "test-gemini-key",
    );

    const res2 = await app.request(
      "/api/ai/translate",
      req,
      buildEnv({ db: fakeDb, geminiApiKey: "test-gemini-key" }),
    );
    expect(res2.status).toBe(200);
    const body2 = (await res2.json()) as AiTranslateResult;
    expect(body2.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("POST /api/ai/interpret returns grounded hypotheses & followUpQuestions from calculated stats", async () => {
    const interpPayload = {
      directAnswer:
        "Em Vilhena, a precipitação na estação seca (Abr–Set) caiu 234,5 mm entre 1981 e 2025 (p = 0,000131).",
      keyFindings: [
        "Declínio estatisticamente forte de -53,29 mm/década (Z = -3,82).",
        "Ano extremo de seca observado em 2016.",
      ],
      hypotheses: [
        {
          title: "Mudança regional de cobertura e fluxo de umidade",
          description:
            "Alterações no uso do solo podem modular evapotranspiração local e reciclagem de chuvas.",
        },
        {
          title: "Modulação por variabilidade oceânica",
          description:
            "Oscilações no Pacífico Tropical e Atlântico alteram a duração da estação seca na Amazônia Sul.",
        },
      ],
      causalityWarning:
        "Correlação estatística confirmada não prova causalidade isolada; combine com séries MapBiomas.",
      followUpQuestions: [
        "Compare com a estação chuvosa em Vilhena?",
        "Faça varredura das 4 variáveis em Vilhena",
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: JSON.stringify(interpPayload) }] },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await app.request(
      "/api/ai/interpret",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "Como mudou a seca em Vilhena?",
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
        }),
      },
      buildEnv({ geminiApiKey: "test-gemini-key" }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as AiInterpretResult;
    expect(body.ok).toBe(true);
    expect(body.model).toBe("gemini-4-hydrogen");
    expect(body.thinkingLevel).toBe("xhigh");
    expect(body.fallbackUsed).toBe(false);
    expect(body.hypotheses).toHaveLength(2);
    expect(body.followUpQuestions.length).toBeGreaterThanOrEqual(1);
    expect(body.causalityWarning).toContain("Correlação");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(String(init.body)) as {
      generationConfig: { maxOutputTokens: number; thinkingConfig: { thinkingLevel: string } };
    };
    expect(sentBody.generationConfig.maxOutputTokens).toBe(8192);
    expect(sentBody.generationConfig.thinkingConfig.thinkingLevel).toBe("xhigh");
  });

  it("handles inScope=false gracefully and rejects malformed Gemini JSON with 502 AI_BAD_RESPONSE", async () => {
    const outOfScopeFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      inScope: false,
                      outOfScopeMessage: "Não fazemos previsão do tempo para amanhã.",
                      limitationNotice: "",
                      suggestedValidQuestions: ["Como mudou a chuva em Manaus desde 1981?"],
                      reasoning: "Weather forecast question.",
                      initialHypothesis: "",
                      filters: {
                        reuseCurrentLocation: false,
                        locationQuery: "Manaus, AM, Brazil",
                        lat: -3.12,
                        lon: -60.02,
                        variable: "PRECTOTCORR",
                        season: "annual",
                        startYear: 1981,
                        endYear: 2025,
                        runMultiVariableScan: false,
                      },
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", outOfScopeFetch);

    const resOos = await app.request(
      "/api/ai/translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Vai chover amanhã em Manaus?", lang: "pt" }),
      },
      buildEnv({ geminiApiKey: "test-gemini-key" }),
    );
    expect(resOos.status).toBe(200);
    const oosBody = (await resOos.json()) as AiTranslateResult;
    expect(oosBody.inScope).toBe(false);
    expect(oosBody.suggestedValidQuestions).toHaveLength(1);

    const badJsonFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not valid json" }] } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", badJsonFetch);

    const resBad = await app.request(
      "/api/ai/translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Temperatura média em Cuiabá?", lang: "pt" }),
      },
      buildEnv({ geminiApiKey: "test-gemini-key" }),
    );
    expect(resBad.status).toBe(502);
    const badBody = (await resBad.json()) as AiApiErrorResponse;
    expect(badBody.code).toBe("AI_BAD_RESPONSE");
  });

  it("enforces per-client rate limits on AI endpoints (429 AI_RATE_LIMITED)", async () => {
    const okFetch = vi.fn().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        inScope: false,
                        outOfScopeMessage: "Ok",
                        limitationNotice: "",
                        suggestedValidQuestions: ["Chuva em Vilhena"],
                        reasoning: "test",
                        initialHypothesis: "",
                        filters: {
                          reuseCurrentLocation: false,
                          locationQuery: "Vilhena",
                          lat: -12.74,
                          lon: -60.14,
                          variable: "PRECTOTCORR",
                          season: "apr_sep",
                          startYear: 1981,
                          endYear: 2025,
                          runMultiVariableScan: false,
                        },
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", okFetch);

    for (let i = 0; i < 30; i++) {
      const res = await app.request(
        "/api/ai/translate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "CF-Connecting-IP": "198.51.100.1",
          },
          body: JSON.stringify({ question: `Pergunta teste ${i}`, lang: "pt" }),
        },
        buildEnv({ geminiApiKey: "test-gemini-key" }),
      );
      expect(res.status).toBe(200);
    }

    const blocked = await app.request(
      "/api/ai/translate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "198.51.100.1",
        },
        body: JSON.stringify({ question: "Pergunta excedente", lang: "pt" }),
      },
      buildEnv({ geminiApiKey: "test-gemini-key" }),
    );
    expect(blocked.status).toBe(429);
    const blockedBody = (await blocked.json()) as AiApiErrorResponse;
    expect(blockedBody.code).toBe("AI_RATE_LIMITED");
  });

  it("fails over to fallback Gemini model on 503 high-demand spike or AbortError timeout", async () => {
    const validTranslatePayload = JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                text: JSON.stringify({
                  inScope: true,
                  outOfScopeMessage: "",
                  limitationNotice: "",
                  suggestedValidQuestions: [],
                  reasoning: "Chuva na estação seca em Vilhena.",
                  initialHypothesis: "Estiagem mais intensa.",
                  filters: {
                    reuseCurrentLocation: false,
                    locationQuery: "Vilhena",
                    lat: -12.74,
                    lon: -60.14,
                    variable: "PRECTOTCORR",
                    season: "apr_sep",
                    startYear: 1981,
                    endYear: 2025,
                    runMultiVariableScan: false,
                  },
                }),
              },
            ],
          },
        },
      ],
    });

    const spikeThenOkFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: "This model is currently experiencing high demand.",
              status: "UNAVAILABLE",
            },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(validTranslatePayload, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", spikeThenOkFetch);

    const res503Failover = await app.request(
      "/api/ai/translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Seca em Vilhena piorou?", lang: "pt" }),
      },
      buildEnv({ geminiApiKey: "test-gemini-key" }),
    );
    expect(res503Failover.status).toBe(200);
    const body503 = (await res503Failover.json()) as AiTranslateResult;
    expect(body503.ok).toBe(true);
    expect(body503.model).toBe("gemini-3.8-flash");
    expect(body503.fallbackUsed).toBe(true);
    expect(spikeThenOkFetch).toHaveBeenCalledTimes(2);
    expect(String((spikeThenOkFetch.mock.calls[0] as [string])[0])).toContain(
      "/models/gemini-4-hydrogen:generateContent",
    );
    expect(String((spikeThenOkFetch.mock.calls[1] as [string])[0])).toContain(
      "/models/gemini-3.8-flash:generateContent",
    );

    resetAiRateLimitsForTests();

    const abortErr = new Error("The operation was aborted.");
    abortErr.name = "AbortError";
    const timeoutThenOkFetch = vi
      .fn()
      .mockRejectedValueOnce(abortErr)
      .mockResolvedValueOnce(
        new Response(validTranslatePayload, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", timeoutThenOkFetch);

    const resTimeoutFailover = await app.request(
      "/api/ai/translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Chuva em Vilhena na seca?", lang: "pt" }),
      },
      buildEnv({ geminiApiKey: "test-gemini-key" }),
    );
    expect(resTimeoutFailover.status).toBe(200);
    const bodyTimeout = (await resTimeoutFailover.json()) as AiTranslateResult;
    expect(bodyTimeout.ok).toBe(true);
    expect(bodyTimeout.model).toBe("gemini-3.8-flash");
    expect(bodyTimeout.fallbackUsed).toBe(true);
    expect(timeoutThenOkFetch).toHaveBeenCalledTimes(2);

    resetAiRateLimitsForTests();

    const unauthorizedFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "API key not valid." } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", unauthorizedFetch);

    const resUnauthorized = await app.request(
      "/api/ai/translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Temperatura em Vilhena?", lang: "pt" }),
      },
      buildEnv({ geminiApiKey: "bad-gemini-key" }),
    );
    expect(resUnauthorized.status).toBe(502);
    expect(unauthorizedFetch).toHaveBeenCalledTimes(1);
  });

  it("runs Wave 2 effort step-down on Layer 3 timeout/MAX_TOKENS and respects D1 circuit-breaker cooldowns & auto-recovery", async () => {
    const validInterpretResponse = (note: string) =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      directAnswer: note,
                      keyFindings: ["Declínio confirmado na série."],
                      hypotheses: [
                        { title: "H1", description: "Explicação física 1." },
                        { title: "H2", description: "Explicação física 2." },
                      ],
                      causalityWarning: "Correlação estatística não prova causalidade isolada.",
                      followUpQuestions: ["Comparar com outra estação?"],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const interpretBody = {
      question: "Como mudou a seca em Vilhena?",
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
        verdict: "STRONG_EVIDENCE",
        direction: "drier",
      },
      extremeYears: [{ label: "2016", value: 210.5, zScore: -2.1 }],
    };

    const wave2Fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      const sent = JSON.parse(String(init?.body)) as {
        generationConfig: { thinkingConfig: { thinkingLevel: string } };
      };
      const level = sent.generationConfig.thinkingConfig.thinkingLevel;
      if (level === "xhigh" || level === "high") {
        return new Response(
          JSON.stringify({
            candidates: [
              { finishReason: "MAX_TOKENS", content: { parts: [{ thought: true, text: "..." }] } },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return validInterpretResponse(`Recovered at ${level}`);
    });
    vi.stubGlobal("fetch", wave2Fetch);

    const wave2Res = await app.request(
      "/api/ai/interpret",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interpretBody),
      },
      buildEnv({ geminiApiKey: "test-gemini-key" }),
    );
    expect(wave2Res.status).toBe(200);
    const wave2Data = (await wave2Res.json()) as AiInterpretResult;
    expect(wave2Data.model).toBe("gemini-4-hydrogen");
    expect(wave2Data.thinkingLevel).toBe("medium");
    expect(wave2Data.fallbackUsed).toBe(true);
    expect(wave2Fetch).toHaveBeenCalledTimes(9);

    resetAiRateLimitsForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T14:00:00.000Z"));

    const cacheStore = new Map<
      string,
      { stage: string; response_json: string; created_at: string }
    >();
    const cooldownStore = new Map<
      string,
      { model: string; cooldown_until: number; reason: string; failure_count: number }
    >();

    const statefulDb = {
      prepare: vi.fn((sql: string) => ({
        bind: vi.fn((...params: unknown[]) => ({
          first: vi.fn(async () => {
            if (sql.includes("FROM ai_cache")) {
              return cacheStore.get(String(params[0])) ?? null;
            }
            return null;
          }),
          all: vi.fn(async () => {
            if (sql.includes("FROM ai_model_cooldowns")) {
              const nowMs = Number(params[0] ?? 0);
              return {
                results: Array.from(cooldownStore.values()).filter((r) => r.cooldown_until > nowMs),
              };
            }
            return { results: [] };
          }),
          run: vi.fn(async () => {
            if (sql.includes("INSERT OR REPLACE INTO ai_cache")) {
              cacheStore.set(String(params[0]), {
                stage: String(params[1]),
                response_json: String(params[2]),
                created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
              });
            } else if (sql.includes("INTO ai_model_cooldowns")) {
              const model = String(params[0]);
              const existing = cooldownStore.get(model);
              cooldownStore.set(model, {
                model,
                cooldown_until: Number(params[1]),
                reason: String(params[2]),
                failure_count: (existing?.failure_count ?? 0) + 1,
              });
            } else if (sql.includes("DELETE FROM ai_model_cooldowns")) {
              cooldownStore.delete(String(params[0]));
            }
            return { success: true };
          }),
        })),
        run: vi.fn(async () => ({ success: true })),
      })),
    } as unknown as D1Database;

    const degradedFirstFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Model overloaded" } }), { status: 503 }),
      )
      .mockResolvedValueOnce(validInterpretResponse("Secondary answer"));
    vi.stubGlobal("fetch", degradedFirstFetch);

    const fallbackRes = await app.request(
      "/api/ai/interpret",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interpretBody),
      },
      buildEnv({ db: statefulDb, geminiApiKey: "test-gemini-key" }),
    );
    expect(fallbackRes.status).toBe(200);
    const fallbackData = (await fallbackRes.json()) as AiInterpretResult;
    expect(fallbackData.model).toBe("gemini-3.8-flash");
    expect(fallbackData.thinkingLevel).toBe("high");
    expect(fallbackData.fallbackUsed).toBe(true);
    expect(cooldownStore.has("gemini-4-hydrogen")).toBe(true);

    const nextQueryFetch = vi
      .fn()
      .mockResolvedValueOnce(validInterpretResponse("Skipped cooled tier"));
    vi.stubGlobal("fetch", nextQueryFetch);
    const skippedRes = await app.request(
      "/api/ai/interpret",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...interpretBody, question: "Outra pergunta em Vilhena?" }),
      },
      buildEnv({ db: statefulDb, geminiApiKey: "test-gemini-key" }),
    );
    expect(skippedRes.status).toBe(200);
    expect(nextQueryFetch).toHaveBeenCalledTimes(1);
    expect(String((nextQueryFetch.mock.calls[0] as [string])[0])).toContain(
      "/models/gemini-3.8-flash:generateContent",
    );

    vi.advanceTimersByTime(16 * 60 * 1000);
    const recoveredFetch = vi
      .fn()
      .mockResolvedValueOnce(validInterpretResponse("Upgraded back to primary"));
    vi.stubGlobal("fetch", recoveredFetch);

    const upgradedRes = await app.request(
      "/api/ai/interpret",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interpretBody),
      },
      buildEnv({ db: statefulDb, geminiApiKey: "test-gemini-key" }),
    );
    expect(upgradedRes.status).toBe(200);
    const upgradedData = (await upgradedRes.json()) as AiInterpretResult;
    expect(upgradedData.cached).toBe(false);
    expect(upgradedData.model).toBe("gemini-4-hydrogen");
    expect(upgradedData.thinkingLevel).toBe("xhigh");
    expect(upgradedData.fallbackUsed).toBe(false);
    expect(cooldownStore.has("gemini-4-hydrogen")).toBe(false);

    // Primary high-effort cache persists beyond 20 minutes without re-calling Gemini.
    vi.advanceTimersByTime(20 * 60 * 1000);
    const cacheOnlyFetch = vi.fn();
    vi.stubGlobal("fetch", cacheOnlyFetch);
    const longCacheRes = await app.request(
      "/api/ai/interpret",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interpretBody),
      },
      buildEnv({ db: statefulDb, geminiApiKey: "test-gemini-key" }),
    );
    expect(longCacheRes.status).toBe(200);
    const longCacheData = (await longCacheRes.json()) as AiInterpretResult;
    expect(longCacheData.cached).toBe(true);
    expect(longCacheData.model).toBe("gemini-4-hydrogen");
    expect(longCacheData.thinkingLevel).toBe("xhigh");
    expect(cacheOnlyFetch).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("fast-fails without calling Gemini when all models are cooling down after 429 limits, and skips duplicate hydrogen minimal calls on translate Wave 2", async () => {
    const translateStepDownFetch = vi
      .fn()
      .mockImplementation(async (_url: string, init?: RequestInit) => {
        const sent = JSON.parse(String(init?.body)) as {
          generationConfig: { thinkingConfig: { thinkingLevel: string } };
        };
        if (sent.generationConfig.thinkingConfig.thinkingLevel === "minimal") {
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  finishReason: "STOP",
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          inScope: true,
                          outOfScopeMessage: "",
                          limitationNotice: "",
                          suggestedValidQuestions: [],
                          reasoning: "Minimal latency path.",
                          initialHypothesis: "Testing precipitation.",
                          filters: {
                            reuseCurrentLocation: false,
                            locationQuery: "Vilhena, RO, Brazil",
                            lat: -12.74,
                            lon: -60.14,
                            variable: "PRECTOTCORR",
                            season: "annual",
                            startYear: 1981,
                            endYear: 2025,
                            runMultiVariableScan: false,
                          },
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            candidates: [
              { finishReason: "MAX_TOKENS", content: { parts: [{ thought: true, text: "..." }] } },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });
    vi.stubGlobal("fetch", translateStepDownFetch);

    const translateRes = await app.request(
      "/api/ai/translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Chuva em Vilhena?", lang: "pt" }),
      },
      buildEnv({ geminiApiKey: "test-gemini-key" }),
    );
    expect(translateRes.status).toBe(200);
    const translateData = (await translateRes.json()) as AiTranslateResult;
    expect(translateData.model).toBe("gemini-3.8-flash");
    expect(translateData.thinkingLevel).toBe("minimal");
    expect(translateData.fallbackUsed).toBe(true);
    // 8 Wave-1 calls ("low") + 1 Wave-2 call ("minimal" skipping hydrogen because hydrogen already ran "low").
    expect(translateStepDownFetch).toHaveBeenCalledTimes(9);

    resetAiRateLimitsForTests();

    const rateLimitFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Quota exhausted" } }), { status: 429 }),
      );
    vi.stubGlobal("fetch", rateLimitFetch);

    const first429Res = await app.request(
      "/api/ai/translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Seca em Manaus?", lang: "pt" }),
      },
      buildEnv({ geminiApiKey: "test-gemini-key" }),
    );
    expect(first429Res.status).toBe(429);
    expect(rateLimitFetch).toHaveBeenCalledTimes(8);

    const blockedFastFailFetch = vi.fn();
    vi.stubGlobal("fetch", blockedFastFailFetch);
    const secondRes = await app.request(
      "/api/ai/translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "Seca em Cuiabá?", lang: "pt" }),
      },
      buildEnv({ geminiApiKey: "test-gemini-key" }),
    );
    expect(secondRes.status).toBe(429);
    expect(blockedFastFailFetch).not.toHaveBeenCalled();
  });
});
