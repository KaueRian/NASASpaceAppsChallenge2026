import type { AiErrorCode } from "../../types/ai.ts";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";

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

export async function callGeminiStructured<T>(opts: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  promptText: string;
  jsonSchema: Record<string, unknown>;
  thinkingLevel: "low" | "medium";
  timeoutMs?: number;
}): Promise<{ parsed: T; model: string }> {
  const cleanModel = opts.model.replace(/^models\//, "").trim() || DEFAULT_GEMINI_MODEL;
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(cleanModel)}:generateContent`;
  const requestBody = buildGeminiRequestBody({
    model: cleanModel,
    systemInstruction: opts.systemInstruction,
    promptText: opts.promptText,
    jsonSchema: opts.jsonSchema,
    thinkingLevel: opts.thinkingLevel,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 22_000);

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
      if (response.status === 429) {
        throw new GeminiClientError("AI_RATE_LIMITED", upstreamMsg, 429);
      }
      throw new GeminiClientError("AI_UPSTREAM_ERROR", upstreamMsg, 502);
    }

    return {
      parsed: extractGeminiJsonPayload<T>(parsedJson),
      model: cleanModel,
    };
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof GeminiClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new GeminiClientError("AI_TIMEOUT", "Gemini request timed out.", 504);
    }
    throw new GeminiClientError("AI_UPSTREAM_ERROR", "Failed to reach Gemini API.", 502);
  }
}
