import type { AiErrorCode, AiThinkingLevel } from "../../types/ai.ts";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export type GeminiStage = "translate" | "interpret";
export type GeminiCooldownReason = "timeout" | "rate_limited" | "upstream";

export const DEFAULT_GEMINI_MODEL = "auto";

/**
 * Verified FreeTier-accessible Gemini 3/4 models ordered strongest-first.
 * Models returning HTTP 429 `limit: 0` on FreeTier (`gemini-4-carbon`, `gemini-4-argon`,
 * `gemini-3.1-pro-preview`, `gemini-pro-latest`) are intentionally excluded.
 */
export const BEST_FIRST_GEMINI_MODELS = [
  "gemini-4-hydrogen",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
] as const;

export const FALLBACK_GEMINI_MODELS = BEST_FIRST_GEMINI_MODELS;

const THINKING_EFFORT_ORDER: readonly AiThinkingLevel[] = [
  "xhigh",
  "high",
  "medium",
  "low",
  "minimal",
];

const DEFAULT_SUPPORTED_LEVELS: readonly AiThinkingLevel[] = ["high", "medium", "low", "minimal"];

const MODEL_SUPPORTED_THINKING_LEVELS: Record<string, readonly AiThinkingLevel[]> = {
  "gemini-4-hydrogen": ["xhigh", "high", "medium", "low"],
  "gemini-3.8-flash": ["high", "medium", "low", "minimal"],
  "gemini-3.7-flash": ["high", "medium", "low", "minimal"],
  "gemini-3.6-flash": ["high", "medium", "low", "minimal"],
  "gemini-3.5-flash": ["high", "medium", "low", "minimal"],
  "gemini-3-flash-preview": ["high", "medium", "low", "minimal"],
  "gemini-3.5-flash-lite": ["high", "medium", "low", "minimal"],
  "gemini-3.1-flash-lite": ["high", "medium", "low", "minimal"],
};

const STAGE_ROUTE_BUDGET_MS: Record<GeminiStage, number> = {
  translate: 11_500,
  interpret: 27_000,
};

function resolveAttemptTimeoutMs(stage: GeminiStage, effectiveLevel: AiThinkingLevel): number {
  if (stage === "translate") {
    return 5_000;
  }
  switch (effectiveLevel) {
    case "xhigh":
    case "high":
      return 9_500;
    case "medium":
      return 6_500;
    case "low":
    case "minimal":
      return 5_000;
  }
}

const STAGE_EFFORT_WAVES: Record<GeminiStage, readonly AiThinkingLevel[]> = {
  // Layer 1 prioritizes low latency ("low" -> "minimal" on Flash/Lite).
  translate: ["low", "minimal"],
  // Layer 3 runs Wave 1 at max supported effort ("xhigh" on hydrogen, "high" on 3.x),
  // then steps down in Wave 2 before allowing local fallback.
  interpret: ["xhigh", "medium", "low", "minimal"],
};

const MIN_ATTEMPT_BUDGET_MS = 750;

export class GeminiClientError extends Error {
  readonly code: AiErrorCode;
  readonly statusCode: number;

  constructor(code: AiErrorCode, message: string, statusCode = 502) {
    super(message);
    this.name = "GeminiClientError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface GeminiRequestOptions {
  model: string;
  systemInstruction: string;
  promptText: string;
  jsonSchema: Record<string, unknown>;
  thinkingLevel: AiThinkingLevel;
}

interface GeminiPart {
  thought?: boolean;
  text?: string;
}

interface GeminiResponsePayload {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
}

export function normalizeGeminiModelName(model?: string): string {
  return (model ?? "").replace(/^models\//, "").trim();
}

export function isLiteGeminiModel(model: string): boolean {
  return normalizeGeminiModelName(model).includes("-lite");
}

/** Resolves ordered candidate models, treating `"auto"` or empty config as best-first queue. */
export function resolveCandidateModels(preferredModel?: string): string[] {
  const cleanModel = normalizeGeminiModelName(preferredModel);
  if (!cleanModel || cleanModel.toLowerCase() === DEFAULT_GEMINI_MODEL) {
    return [...BEST_FIRST_GEMINI_MODELS];
  }
  return [cleanModel, ...BEST_FIRST_GEMINI_MODELS.filter((m) => m !== cleanModel)];
}

/** Clamps a target thinking level to the closest supported effort for the given model. */
export function resolveThinkingLevelForModel(
  model: string,
  targetLevel: AiThinkingLevel,
): AiThinkingLevel {
  const cleanModel = normalizeGeminiModelName(model);
  const supported = MODEL_SUPPORTED_THINKING_LEVELS[cleanModel] ?? DEFAULT_SUPPORTED_LEVELS;
  if (supported.includes(targetLevel)) {
    return targetLevel;
  }

  const targetIdx = THINKING_EFFORT_ORDER.indexOf(targetLevel);
  for (let i = targetIdx + 1; i < THINKING_EFFORT_ORDER.length; i++) {
    const candidate = THINKING_EFFORT_ORDER[i];
    if (supported.includes(candidate)) {
      return candidate;
    }
  }
  for (let i = targetIdx - 1; i >= 0; i--) {
    const candidate = THINKING_EFFORT_ORDER[i];
    if (supported.includes(candidate)) {
      return candidate;
    }
  }
  return supported[0] ?? "low";
}

function resolveLegacyThinkingBudget(level: AiThinkingLevel): number {
  switch (level) {
    case "minimal":
      return 0;
    case "low":
      return 512;
    case "medium":
      return 1024;
    case "high":
    case "xhigh":
      return 2048;
  }
}

export function buildGeminiRequestBody(opts: GeminiRequestOptions): Record<string, unknown> {
  const cleanModel = normalizeGeminiModelName(opts.model) || BEST_FIRST_GEMINI_MODELS[0];
  const effectiveLevel = resolveThinkingLevelForModel(cleanModel, opts.thinkingLevel);
  const maxOutputTokens = effectiveLevel === "high" || effectiveLevel === "xhigh" ? 8192 : 4096;
  const isLegacyGemini25 = cleanModel.includes("gemini-2.5");

  const generationConfig: Record<string, unknown> = isLegacyGemini25
    ? {
        temperature: effectiveLevel === "minimal" || effectiveLevel === "low" ? 0.1 : 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: opts.jsonSchema,
        maxOutputTokens,
        thinkingConfig: {
          thinkingBudget: resolveLegacyThinkingBudget(effectiveLevel),
          includeThoughts: true,
        },
      }
    : {
        // Gemini 3/4 strictly requires thinkingLevel + responseJsonSchema without temperature or thinkingBudget.
        responseMimeType: "application/json",
        responseJsonSchema: opts.jsonSchema,
        maxOutputTokens,
        thinkingConfig: {
          thinkingLevel: effectiveLevel,
          includeThoughts: true,
        },
      };

  return {
    systemInstruction: {
      parts: [{ text: opts.systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: opts.promptText }],
      },
    ],
    generationConfig,
  };
}

export function extractGeminiJsonPayload<T>(payload: unknown): T {
  const data = payload as GeminiResponsePayload | null;
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  // Thought parts are non-JSON internal summaries and must always be stripped before JSON.parse.
  const answerPart = parts.find((part) => !part.thought && typeof part.text === "string");
  const rawText = answerPart?.text?.trim();

  if (!rawText) {
    const reason = candidate?.finishReason ?? "EMPTY";
    throw new GeminiClientError(
      "AI_BAD_RESPONSE",
      `Gemini returned an empty response (${reason}).`,
      502,
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new GeminiClientError(
      "AI_BAD_RESPONSE",
      "Gemini returned malformed JSON outside the structured schema.",
      502,
    );
  }
}

type GeminiAttemptOutcome<T> =
  | { ok: true; parsed: T; model: string; thinkingLevel: AiThinkingLevel }
  | {
      ok: false;
      error: GeminiClientError;
      retryable: boolean;
      cooldownReason?: GeminiCooldownReason;
    };

function isTransientHttpStatus(status: number): boolean {
  return status === 404 || status === 429 || status >= 500;
}

function isUnsupportedThinkingHttpError(status: number, message: string): boolean {
  return status === 400 && /thinking|level/i.test(message);
}

function classifyHttpCooldownReason(status: number): GeminiCooldownReason | undefined {
  if (status === 429) return "rate_limited";
  if (status === 504) return "timeout";
  if (status === 404 || status >= 500) return "upstream";
  return undefined;
}

async function callSingleGeminiModel<T>(opts: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  promptText: string;
  jsonSchema: Record<string, unknown>;
  thinkingLevel: AiThinkingLevel;
  timeoutMs: number;
}): Promise<GeminiAttemptOutcome<T>> {
  const effectiveLevel = resolveThinkingLevelForModel(opts.model, opts.thinkingLevel);
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(opts.model)}:generateContent`;
  const requestBody = buildGeminiRequestBody({
    model: opts.model,
    systemInstruction: opts.systemInstruction,
    promptText: opts.promptText,
    jsonSchema: opts.jsonSchema,
    thinkingLevel: effectiveLevel,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

  let parsedJson: GeminiResponsePayload | null = null;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": opts.apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    clearTimeout(timer);

    parsedJson = (await response.json().catch(() => null)) as GeminiResponsePayload | null;
    if (!response.ok) {
      const upstreamMsg = parsedJson?.error?.message ?? `Gemini HTTP ${response.status}`;
      const error =
        response.status === 429
          ? new GeminiClientError("AI_RATE_LIMITED", upstreamMsg, 429)
          : new GeminiClientError("AI_UPSTREAM_ERROR", upstreamMsg, 502);

      if (isUnsupportedThinkingHttpError(response.status, upstreamMsg)) {
        return { ok: false, error, retryable: true };
      }
      return {
        ok: false,
        error,
        retryable: isTransientHttpStatus(response.status),
        cooldownReason: classifyHttpCooldownReason(response.status),
      };
    }

    return {
      ok: true,
      parsed: extractGeminiJsonPayload<T>(parsedJson),
      model: opts.model,
      thinkingLevel: effectiveLevel,
    };
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof GeminiClientError) {
      // Output truncation under heavy reasoning is retryable at lower thinking effort
      // without triggering a circuit-breaker cooldown on the model itself.
      const finishReason = parsedJson?.candidates?.[0]?.finishReason;
      if (finishReason === "MAX_TOKENS") {
        return { ok: false, error, retryable: true };
      }
      return { ok: false, error, retryable: false };
    }
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: new GeminiClientError("AI_TIMEOUT", "Gemini request timed out.", 504),
        retryable: true,
        cooldownReason: "timeout",
      };
    }
    return {
      ok: false,
      error: new GeminiClientError("AI_UPSTREAM_ERROR", "Failed to reach Gemini API.", 502),
      retryable: true,
      cooldownReason: "upstream",
    };
  }
}

function resolveEffortWaves(
  stage?: GeminiStage,
  explicitLevel?: AiThinkingLevel,
): readonly AiThinkingLevel[] {
  if (stage) {
    return STAGE_EFFORT_WAVES[stage];
  }
  const start = explicitLevel ?? "low";
  const startIdx = THINKING_EFFORT_ORDER.indexOf(start);
  return startIdx >= 0 ? THINKING_EFFORT_ORDER.slice(startIdx) : ["low", "minimal"];
}

export interface GeminiCascadeResult<T> {
  parsed: T;
  model: string;
  thinkingLevel: AiThinkingLevel;
  fallbackUsed: boolean;
}

/**
 * Calls Gemini structured JSON generation using an adaptive best-first model and thinking-effort
 * cascade with per-route time budgets and optional D1/memory cooldown filtering.
 */
export async function callGeminiStructured<T>(opts: {
  apiKey: string;
  model: string;
  stage?: GeminiStage;
  systemInstruction: string;
  promptText: string;
  jsonSchema: Record<string, unknown>;
  thinkingLevel?: AiThinkingLevel;
  timeoutMs?: number;
  routeBudgetMs?: number;
  activeCooldownModels?: ReadonlySet<string>;
  allCooldownError?: GeminiClientError;
  onModelFailure?: (model: string, reason: GeminiCooldownReason) => Promise<void> | void;
  onModelSuccess?: (model: string) => Promise<void> | void;
}): Promise<GeminiCascadeResult<T>> {
  const stage: GeminiStage =
    opts.stage ?? (opts.thinkingLevel === "medium" ? "interpret" : "translate");
  const allCandidates = resolveCandidateModels(opts.model);
  const healthyCandidates = opts.activeCooldownModels?.size
    ? allCandidates.filter((candidate) => !opts.activeCooldownModels?.has(candidate))
    : allCandidates;

  if (healthyCandidates.length === 0) {
    throw (
      opts.allCooldownError ??
      new GeminiClientError("AI_UPSTREAM_ERROR", "All Gemini models are in cooldown.", 502)
    );
  }

  const waves = resolveEffortWaves(opts.stage, opts.thinkingLevel);
  const totalBudgetMs = opts.routeBudgetMs ?? STAGE_ROUTE_BUDGET_MS[stage];
  const deadlineMs = Date.now() + totalBudgetMs;

  const seenModelEffortPairs = new Set<string>();
  const failedInThisRequest = new Set<string>();
  let lastError: GeminiClientError | null = null;
  let attemptsExecuted = 0;

  for (let waveIndex = 0; waveIndex < waves.length; waveIndex++) {
    const waveTarget = waves[waveIndex];
    const hasLowerEffortWave = waveIndex + 1 < waves.length;

    for (const candidateModel of healthyCandidates) {
      if (failedInThisRequest.has(candidateModel)) {
        continue;
      }

      const effectiveLevel = resolveThinkingLevelForModel(candidateModel, waveTarget);
      const pairKey = `${candidateModel}:${effectiveLevel}`;
      if (seenModelEffortPairs.has(pairKey)) {
        continue;
      }
      seenModelEffortPairs.add(pairKey);

      const remainingMs = deadlineMs - Date.now();
      if (remainingMs < MIN_ATTEMPT_BUDGET_MS) {
        throw (
          lastError ??
          new GeminiClientError("AI_TIMEOUT", "AI cascade route latency budget exhausted.", 504)
        );
      }

      const perAttemptCapMs = opts.timeoutMs ?? resolveAttemptTimeoutMs(stage, effectiveLevel);
      attemptsExecuted += 1;
      const attempt = await callSingleGeminiModel<T>({
        apiKey: opts.apiKey,
        model: candidateModel,
        systemInstruction: opts.systemInstruction,
        promptText: opts.promptText,
        jsonSchema: opts.jsonSchema,
        thinkingLevel: effectiveLevel,
        timeoutMs: Math.min(perAttemptCapMs, remainingMs),
      });

      if (attempt.ok) {
        const headCandidate = allCandidates[0];
        const fallbackUsed =
          attemptsExecuted > 1 ||
          waveIndex > 0 ||
          attempt.model !== headCandidate ||
          isLiteGeminiModel(attempt.model);
        await opts.onModelSuccess?.(attempt.model);
        return {
          parsed: attempt.parsed,
          model: attempt.model,
          thinkingLevel: attempt.thinkingLevel,
          fallbackUsed,
        };
      }

      lastError = attempt.error;
      if (!attempt.retryable) {
        throw attempt.error;
      }

      if (
        attempt.error.code === "AI_TIMEOUT" &&
        hasLowerEffortWave &&
        (effectiveLevel === "xhigh" || effectiveLevel === "high" || effectiveLevel === "medium")
      ) {
        // High/medium reasoning can exceed the wave latency cap while the model itself remains
        // responsive at lower effort—preserve it for faster waves without D1 cooldown poisoning
        // and immediately step down effort instead of repeating slow timeouts.
        break;
      }

      if (attempt.cooldownReason) {
        failedInThisRequest.add(candidateModel);
        await opts.onModelFailure?.(candidateModel, attempt.cooldownReason);
      }
    }
  }

  throw lastError ?? new GeminiClientError("AI_UPSTREAM_ERROR", "Failed to reach Gemini API.", 502);
}
