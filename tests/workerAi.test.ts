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
    expect(body.hypotheses).toHaveLength(2);
    expect(body.followUpQuestions.length).toBeGreaterThanOrEqual(1);
    expect(body.causalityWarning).toContain("Correlação");
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
});
