import type { AiErrorCode } from "../../types/ai.ts";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const FALLBACK_GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.6-flash",
  "gemini-4-hydrogen",
] as const;

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
  thinkingLevel: "low" | "medium";
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

export function buildGeminiRequestBody(opts: GeminiRequestOptions): Record<string, unknown> {
  const cleanModel = opts.model.replace(/^models\//, "").trim() || DEFAULT_GEMINI_MODEL;
  const isLegacyGemini25 = cleanModel.includes("gemini-2.5");

  const generationConfig: Record<string, unknown> = isLegacyGemini25
    ? {
        temperature: opts.thinkingLevel === "low" ? 0.1 : 0.2,
        responseMimeType: "application/json",
        responseJsonSchema: opts.jsonSchema,
        maxOutputTokens: 4096,
        thinkingConfig: {
          thinkingBudget: opts.thinkingLevel === "low" ? 512 : 1024,
          includeThoughts: true,
        },
      }
    : {
        // Gemini 3/4 strictly requires thinkingLevel + responseJsonSchema without temperature or thinkingBudget.
        responseMimeType: "application/json",
        responseJsonSchema: opts.jsonSchema,
        maxOutputTokens: 4096,
        thinkingConfig: {
          thinkingLevel: opts.thinkingLevel,
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
  | { ok: true; parsed: T; model: string }
  | { ok: false; error: GeminiClientError; retryable: boolean };

function isTransientHttpStatus(status: number): boolean {
  return status === 404 || status === 429 || status >= 500;
}

function resolveCandidateModels(preferredModel: string): string[] {
  const cleanModel = preferredModel.replace(/^models\//, "").trim() || DEFAULT_GEMINI_MODEL;
  const candidates = [cleanModel, ...FALLBACK_GEMINI_MODELS.filter((m) => m !== cleanModel)];
  return candidates.slice(0, 3);
}

async function callSingleGeminiModel<T>(opts: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  promptText: string;
  jsonSchema: Record<string, unknown>;
  thinkingLevel: "low" | "medium";
  timeoutMs: number;
}): Promise<GeminiAttemptOutcome<T>> {
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(opts.model)}:generateContent`;
  const requestBody = buildGeminiRequestBody({
    model: opts.model,
    systemInstruction: opts.systemInstruction,
    promptText: opts.promptText,
    jsonSchema: opts.jsonSchema,
    thinkingLevel: opts.thinkingLevel,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

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

    const parsedJson = (await response.json().catch(() => null)) as GeminiResponsePayload | null;
    if (!response.ok) {
      const upstreamMsg = parsedJson?.error?.message ?? `Gemini HTTP ${response.status}`;
      const error =
        response.status === 429
          ? new GeminiClientError("AI_RATE_LIMITED", upstreamMsg, 429)
          : new GeminiClientError("AI_UPSTREAM_ERROR", upstreamMsg, 502);
      return {
        ok: false,
        error,
        retryable: isTransientHttpStatus(response.status),
      };
    }

    return {
      ok: true,
      parsed: extractGeminiJsonPayload<T>(parsedJson),
      model: opts.model,
    };
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof GeminiClientError) {
      // Do not fail over across models on malformed structured JSON (AI_BAD_RESPONSE).
      return { ok: false, error, retryable: false };
    }
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: new GeminiClientError("AI_TIMEOUT", "Gemini request timed out.", 504),
        retryable: true,
      };
    }
    return {
      ok: false,
      error: new GeminiClientError("AI_UPSTREAM_ERROR", "Failed to reach Gemini API.", 502),
      retryable: true,
    };
  }
}

/** Calls Gemini structured JSON generation with bounded failover on transient outages or timeouts. */
export async function callGeminiStructured<T>(opts: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  promptText: string;
  jsonSchema: Record<string, unknown>;
  thinkingLevel: "low" | "medium";
  timeoutMs?: number;
}): Promise<{ parsed: T; model: string }> {
  const candidates = resolveCandidateModels(opts.model);
  const timeoutMs = opts.timeoutMs ?? 14_000;
  let lastError: GeminiClientError | null = null;

  for (const candidateModel of candidates) {
    const attempt = await callSingleGeminiModel<T>({
      apiKey: opts.apiKey,
      model: candidateModel,
      systemInstruction: opts.systemInstruction,
      promptText: opts.promptText,
      jsonSchema: opts.jsonSchema,
      thinkingLevel: opts.thinkingLevel,
      timeoutMs,
    });

    if (attempt.ok) {
      return {
        parsed: attempt.parsed,
        model: attempt.model,
      };
    }

    lastError = attempt.error;
    if (!attempt.retryable) {
      throw attempt.error;
    }
  }

  throw lastError ?? new GeminiClientError("AI_UPSTREAM_ERROR", "Failed to reach Gemini API.", 502);
}
