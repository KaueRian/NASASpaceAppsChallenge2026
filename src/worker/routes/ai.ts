import type { D1Database } from "@cloudflare/workers-types";
import type { Context } from "hono";
import {
  callGeminiStructured,
  DEFAULT_GEMINI_MODEL,
  GeminiClientError,
} from "../../lib/ai/geminiClient.ts";
import {
  buildInterpretationSystemInstruction,
  buildTranslationSystemInstruction,
  FILTER_TRANSLATION_JSON_SCHEMA,
  INTERPRETATION_JSON_SCHEMA,
} from "../../lib/ai/schemas.ts";
import {
  hashAiCacheKey,
  sanitizeAiTranslatedFilters,
  validateAiInterpretRequest,
  validateAiTranslateRequest,
} from "../../lib/ai/validation.ts";
import { getMaxCompleteYear } from "../../lib/validation/investigate.ts";
import {
  AI_SEASON_DESCRIPTIONS,
  AI_VARIABLE_DESCRIPTIONS,
  type AiApiErrorResponse,
  type AiErrorCode,
  type AiHypothesis,
  type AiInterpretResult,
  type AiTranslateResult,
} from "../../types/ai.ts";
import { ensureD1Schema } from "../dbSchema.ts";
import type { WorkerBindings } from "../index.ts";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const MEMORY_CACHE_LIMIT = 200;

const ipRateBuckets = new Map<string, number[]>();
const aiMemoryCache = new Map<string, string>();

interface AiCacheRow {
  response_json: string;
}

interface RawGeminiTranslatePayload {
  inScope?: unknown;
  outOfScopeMessage?: unknown;
  limitationNotice?: unknown;
  suggestedValidQuestions?: unknown;
  reasoning?: unknown;
  initialHypothesis?: unknown;
  filters?: unknown;
}

interface RawGeminiInterpretPayload {
  directAnswer?: unknown;
  keyFindings?: unknown;
  hypotheses?: unknown;
  causalityWarning?: unknown;
  followUpQuestions?: unknown;
}

/** Clears in-isolate rate-limit counters and AI response memory cache (used in Vitest). */
export function resetAiRateLimitsForTests(): void {
  ipRateBuckets.clear();
  aiMemoryCache.clear();
}

function errorJson(
  c: Context<{ Bindings: WorkerBindings }>,
  status: 400 | 429 | 502 | 503 | 504,
  code: AiErrorCode,
  message: string,
) {
  const payload: AiApiErrorResponse = { ok: false, code, message };
  return c.json(payload, status);
}

function resolveClientKey(c: Context<{ Bindings: WorkerBindings }>): string {
  const cfIp = c.req.header("CF-Connecting-IP")?.trim();
  const forwarded = c.req.header("X-Forwarded-For")?.split(",")[0]?.trim();
  return cfIp || forwarded || "local";
}

function checkRateLimit(clientKey: string, now = Date.now()): boolean {
  const recent = (ipRateBuckets.get(clientKey) ?? []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRateBuckets.set(clientKey, recent);
    return false;
  }
  recent.push(now);
  ipRateBuckets.set(clientKey, recent);
  return true;
}

async function readAiCache<T>(cacheKey: string, db?: D1Database): Promise<T | null> {
  const memHit = aiMemoryCache.get(cacheKey);
  if (memHit) {
    return JSON.parse(memHit) as T;
  }
  if (!db) return null;

  await ensureD1Schema(db);
  try {
    const row = await db
      .prepare("SELECT response_json FROM ai_cache WHERE cache_key = ?")
      .bind(cacheKey)
      .first<AiCacheRow>();
    if (!row?.response_json) return null;
    if (aiMemoryCache.size >= MEMORY_CACHE_LIMIT) {
      const oldestKey = aiMemoryCache.keys().next().value;
      if (oldestKey) aiMemoryCache.delete(oldestKey);
    }
    aiMemoryCache.set(cacheKey, row.response_json);
    return JSON.parse(row.response_json) as T;
  } catch {
    return null;
  }
}

async function writeAiCache(
  cacheKey: string,
  stage: "translate" | "interpret",
  payload: unknown,
  db?: D1Database,
): Promise<void> {
  const serialized = JSON.stringify(payload);
  if (aiMemoryCache.size >= MEMORY_CACHE_LIMIT) {
    const oldestKey = aiMemoryCache.keys().next().value;
    if (oldestKey) aiMemoryCache.delete(oldestKey);
  }
  aiMemoryCache.set(cacheKey, serialized);

  if (!db) return;
  try {
    await db
      .prepare("INSERT OR REPLACE INTO ai_cache (cache_key, stage, response_json) VALUES (?, ?, ?)")
      .bind(cacheKey, stage, serialized)
      .run();
  } catch {
    // Non-fatal cache write error.
  }
}

async function parseJsonRequestBody(
  c: Context<{ Bindings: WorkerBindings }>,
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    const data = await c.req.json();
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

function handleGeminiFailure(c: Context<{ Bindings: WorkerBindings }>, err: unknown) {
  if (err instanceof GeminiClientError) {
    const status =
      err.statusCode === 429 || err.statusCode === 502 || err.statusCode === 504
        ? err.statusCode
        : 502;
    return errorJson(c, status, err.code, err.message);
  }
  return errorJson(c, 502, "AI_UPSTREAM_ERROR", "Unexpected AI service failure.");
}

function cleanStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, maxItems);
}

function cleanHypotheses(value: unknown): AiHypothesis[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { title: string; description: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { title?: unknown }).title === "string" &&
        typeof (item as { description?: unknown }).description === "string",
    )
    .map((item) => ({ title: item.title.trim(), description: item.description.trim() }))
    .filter((item) => item.title.length > 0 && item.description.length > 0)
    .slice(0, 2);
}

export async function handleAiTranslate(c: Context<{ Bindings: WorkerBindings }>) {
  if (!checkRateLimit(resolveClientKey(c))) {
    return errorJson(c, 429, "AI_RATE_LIMITED", "Too many AI requests. Please wait a minute.");
  }

  const parsedBody = await parseJsonRequestBody(c);
  if (!parsedBody.ok) {
    return errorJson(c, 400, "AI_INVALID_REQUEST", "Request body must contain valid JSON.");
  }

  const validation = validateAiTranslateRequest(parsedBody.data);
  if (!validation.ok) {
    return errorJson(c, 400, "AI_INVALID_REQUEST", validation.message);
  }

  const req = validation.data;
  const maxCompleteYear = getMaxCompleteYear();
  const modelName = c.env?.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const cacheKey = await hashAiCacheKey("translate", {
    q: req.question.toLowerCase(),
    lang: req.lang,
    ctx: req.currentContext ?? null,
    model: modelName,
    maxYear: maxCompleteYear,
  });

  const cachedResult = await readAiCache<AiTranslateResult>(cacheKey, c.env?.DB);
  if (cachedResult) {
    return c.json({ ...cachedResult, cached: true }, 200);
  }

  const apiKey = c.env?.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorJson(
      c,
      503,
      "AI_NOT_CONFIGURED",
      "GEMINI_API_KEY is not configured on this server.",
    );
  }

  try {
    const { parsed, model } = await callGeminiStructured<RawGeminiTranslatePayload>({
      apiKey,
      model: modelName,
      systemInstruction: buildTranslationSystemInstruction(
        req.lang,
        maxCompleteYear,
        req.currentContext,
      ),
      promptText: `User question (${req.lang}): "${req.question}"`,
      jsonSchema: FILTER_TRANSLATION_JSON_SCHEMA,
      thinkingLevel: "low",
    });

    const inScope = Boolean(parsed.inScope);
    const outOfScopeMessage =
      typeof parsed.outOfScopeMessage === "string" && parsed.outOfScopeMessage.trim()
        ? parsed.outOfScopeMessage.trim()
        : undefined;
    const limitationNotice =
      typeof parsed.limitationNotice === "string" && parsed.limitationNotice.trim()
        ? parsed.limitationNotice.trim()
        : undefined;

    const result: AiTranslateResult = {
      ok: true,
      inScope,
      ...(outOfScopeMessage && !inScope ? { outOfScopeMessage } : {}),
      ...(limitationNotice ? { limitationNotice } : {}),
      suggestedValidQuestions: cleanStringArray(parsed.suggestedValidQuestions, 3),
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : "",
      initialHypothesis:
        typeof parsed.initialHypothesis === "string" ? parsed.initialHypothesis.trim() : "",
      filters: sanitizeAiTranslatedFilters(parsed.filters, req.currentContext, maxCompleteYear),
      model,
      cached: false,
    };

    await writeAiCache(cacheKey, "translate", result, c.env?.DB);
    return c.json(result, 200);
  } catch (err) {
    return handleGeminiFailure(c, err);
  }
}

export async function handleAiInterpret(c: Context<{ Bindings: WorkerBindings }>) {
  if (!checkRateLimit(resolveClientKey(c))) {
    return errorJson(c, 429, "AI_RATE_LIMITED", "Too many AI requests. Please wait a minute.");
  }

  const parsedBody = await parseJsonRequestBody(c);
  if (!parsedBody.ok) {
    return errorJson(c, 400, "AI_INVALID_REQUEST", "Request body must contain valid JSON.");
  }

  const validation = validateAiInterpretRequest(parsedBody.data);
  if (!validation.ok) {
    return errorJson(c, 400, "AI_INVALID_REQUEST", validation.message);
  }

  const req = validation.data;
  const modelName = c.env?.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const cacheKey = await hashAiCacheKey("interpret", {
    q: req.question.toLowerCase(),
    lang: req.lang,
    location: req.location,
    variable: req.variable,
    season: req.season,
    stats: req.stats,
    extremeYears: req.extremeYears,
    scanSummary: req.scanSummary ?? null,
    limitationNotice: req.limitationNotice ?? null,
    model: modelName,
  });

  const cachedResult = await readAiCache<AiInterpretResult>(cacheKey, c.env?.DB);
  if (cachedResult) {
    return c.json({ ...cachedResult, cached: true }, 200);
  }

  const apiKey = c.env?.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorJson(
      c,
      503,
      "AI_NOT_CONFIGURED",
      "GEMINI_API_KEY is not configured on this server.",
    );
  }

  const groundedInput = {
    question: req.question,
    language: req.lang,
    dataSource: "NASA POWER / MERRA-2 (temporal/monthly/point)",
    location: req.location,
    variable: {
      code: req.variable,
      label: AI_VARIABLE_DESCRIPTIONS[req.variable],
      unit: req.unit,
    },
    season: {
      code: req.season,
      label: AI_SEASON_DESCRIPTIONS[req.season],
    },
    ...(req.limitationNotice ? { limitationNotice: req.limitationNotice } : {}),
    calculatedStatistics: req.stats,
    extremeAnomalyYears: req.extremeYears,
    ...(req.scanSummary ? { multiVariableFdrScan: req.scanSummary } : {}),
  };

  try {
    const { parsed, model } = await callGeminiStructured<RawGeminiInterpretPayload>({
      apiKey,
      model: modelName,
      systemInstruction: buildInterpretationSystemInstruction(req.lang),
      promptText: JSON.stringify(groundedInput, null, 2),
      jsonSchema: INTERPRETATION_JSON_SCHEMA,
      thinkingLevel: "medium",
    });

    const directAnswer = typeof parsed.directAnswer === "string" ? parsed.directAnswer.trim() : "";
    const causalityWarning =
      typeof parsed.causalityWarning === "string" ? parsed.causalityWarning.trim() : "";
    const hypotheses = cleanHypotheses(parsed.hypotheses);
    const keyFindings = cleanStringArray(parsed.keyFindings, 4);
    const followUpQuestions = cleanStringArray(parsed.followUpQuestions, 3);

    if (!directAnswer || !causalityWarning || hypotheses.length < 2 || keyFindings.length === 0) {
      return errorJson(
        c,
        502,
        "AI_BAD_RESPONSE",
        "Gemini interpretation omitted required scientific fields.",
      );
    }

    const result: AiInterpretResult = {
      ok: true,
      directAnswer,
      keyFindings,
      hypotheses,
      causalityWarning,
      followUpQuestions,
      model,
      cached: false,
    };

    await writeAiCache(cacheKey, "interpret", result, c.env?.DB);
    return c.json(result, 200);
  } catch (err) {
    return handleGeminiFailure(c, err);
  }
}
