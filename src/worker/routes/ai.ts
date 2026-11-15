import type { D1Database } from "@cloudflare/workers-types";
import type { Context } from "hono";
import {
  callGeminiStructured,
  DEFAULT_GEMINI_MODEL,
  GeminiClientError,
  type GeminiCooldownReason,
  type GeminiStage,
  isLiteGeminiModel,
  resolveCandidateModels,
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
  type AiThinkingLevel,
  type AiTranslateResult,
} from "../../types/ai.ts";
import { ensureD1Schema } from "../dbSchema.ts";
import type { WorkerBindings } from "../index.ts";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const MEMORY_CACHE_LIMIT = 200;
const SHORT_FALLBACK_CACHE_TTL_MS = 15 * 60_000;
const SHORT_COOLDOWN_MS = 5 * 60_000;
const RATE_LIMIT_COOLDOWN_MS = 15 * 60_000;
const MAX_COOLDOWN_MS = 60 * 60_000;

interface MemoryCacheEntry {
  responseJson: string;
  storedAtMs: number;
}

interface ModelCooldownEntry {
  untilMs: number;
  reason: GeminiCooldownReason;
  failureCount: number;
}

const ipRateBuckets = new Map<string, number[]>();
const aiMemoryCache = new Map<string, MemoryCacheEntry>();
const modelCooldownCache = new Map<string, ModelCooldownEntry>();

interface AiCacheRow {
  response_json: string;
  created_at?: string;
}

interface AiCooldownRow {
  model: string;
  cooldown_until: number;
  reason: string;
  failure_count: number;
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

/** Clears in-isolate rate-limit counters, memory cache, and model cooldowns (used in Vitest). */
export function resetAiRateLimitsForTests(): void {
  ipRateBuckets.clear();
  aiMemoryCache.clear();
  modelCooldownCache.clear();
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

function parseDbTimestampMs(raw?: string | null): number | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes("T") ? trimmed : `${trimmed.replace(" ", "T")}Z`;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : null;
}

function formatDbTimestamp(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}

function isDegradedCachedPayload(
  stage: GeminiStage,
  payload: { model?: string; thinkingLevel?: AiThinkingLevel; fallbackUsed?: boolean },
): boolean {
  if (payload.fallbackUsed === true) return true;
  if (payload.model && isLiteGeminiModel(payload.model)) return true;
  if (!payload.thinkingLevel) return false;

  if (stage === "interpret") {
    return payload.thinkingLevel !== "xhigh" && payload.thinkingLevel !== "high";
  }
  return payload.thinkingLevel === "minimal";
}

function isCacheEntryExpired(
  stage: GeminiStage,
  payload: { model?: string; thinkingLevel?: AiThinkingLevel; fallbackUsed?: boolean },
  createdAtMs: number | null,
  nowMs: number,
): boolean {
  if (!isDegradedCachedPayload(stage, payload)) return false;
  if (createdAtMs === null) return false;
  return nowMs - createdAtMs >= SHORT_FALLBACK_CACHE_TTL_MS;
}

function setMemoryCacheEntry(cacheKey: string, entry: MemoryCacheEntry): void {
  if (aiMemoryCache.size >= MEMORY_CACHE_LIMIT) {
    const oldestKey = aiMemoryCache.keys().next().value;
    if (oldestKey) aiMemoryCache.delete(oldestKey);
  }
  aiMemoryCache.set(cacheKey, entry);
}

async function readAiCache<
  T extends { model?: string; thinkingLevel?: AiThinkingLevel; fallbackUsed?: boolean },
>(cacheKey: string, stage: GeminiStage, db?: D1Database, nowMs = Date.now()): Promise<T | null> {
  const memHit = aiMemoryCache.get(cacheKey);
  if (memHit) {
    const parsedMem = JSON.parse(memHit.responseJson) as T;
    if (!isCacheEntryExpired(stage, parsedMem, memHit.storedAtMs, nowMs)) {
      return parsedMem;
    }
    aiMemoryCache.delete(cacheKey);
  }

  if (!db) return null;
  await ensureD1Schema(db);
  try {
    const row = await db
      .prepare("SELECT response_json, created_at FROM ai_cache WHERE cache_key = ?")
      .bind(cacheKey)
      .first<AiCacheRow>();
    if (!row?.response_json) return null;

    const parsedRow = JSON.parse(row.response_json) as T;
    const createdAtMs = parseDbTimestampMs(row.created_at);
    if (isCacheEntryExpired(stage, parsedRow, createdAtMs, nowMs)) {
      return null;
    }

    setMemoryCacheEntry(cacheKey, {
      responseJson: row.response_json,
      storedAtMs: createdAtMs ?? nowMs,
    });
    return parsedRow;
  } catch {
    return null;
  }
}

async function writeAiCache(
  cacheKey: string,
  stage: GeminiStage,
  payload: unknown,
  db?: D1Database,
  nowMs = Date.now(),
): Promise<void> {
  const serialized = JSON.stringify(payload);
  setMemoryCacheEntry(cacheKey, { responseJson: serialized, storedAtMs: nowMs });

  if (!db) return;
  try {
    await db
      .prepare(
        "INSERT OR REPLACE INTO ai_cache (cache_key, stage, response_json, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(cacheKey, stage, serialized, formatDbTimestamp(nowMs))
      .run();
  } catch {
    // Non-fatal cache write error.
  }
}

function resolveCooldownDurationMs(reason: GeminiCooldownReason, failureCount: number): number {
  if (reason === "rate_limited") {
    return Math.min(MAX_COOLDOWN_MS, RATE_LIMIT_COOLDOWN_MS * 2 ** Math.max(0, failureCount - 1));
  }
  return Math.min(15 * 60_000, SHORT_COOLDOWN_MS * Math.max(1, failureCount));
}

function normalizeCooldownReason(raw?: string): GeminiCooldownReason {
  if (raw === "rate_limited" || raw === "timeout") return raw;
  return "upstream";
}

function buildAllCooldownError(
  candidates: readonly string[],
  reasons: ReadonlyMap<string, GeminiCooldownReason>,
): GeminiClientError | undefined {
  if (candidates.length === 0 || candidates.some((m) => !reasons.has(m))) {
    return undefined;
  }

  const candidateReasons = candidates.map((m) => reasons.get(m));
  if (candidateReasons.includes("rate_limited")) {
    return new GeminiClientError(
      "AI_RATE_LIMITED",
      "All Gemini models are currently cooling down after quota limits.",
      429,
    );
  }
  if (candidateReasons.includes("timeout")) {
    return new GeminiClientError(
      "AI_TIMEOUT",
      "All Gemini models recently timed out and are cooling down.",
      504,
    );
  }
  return new GeminiClientError(
    "AI_UPSTREAM_ERROR",
    "All Gemini models are temporarily cooling down.",
    502,
  );
}

async function loadActiveCooldowns(
  candidates: readonly string[],
  db?: D1Database,
  nowMs = Date.now(),
): Promise<{
  activeModels: Set<string>;
  allCooldownError?: GeminiClientError;
}> {
  const activeReasons = new Map<string, GeminiCooldownReason>();
  for (const [model, entry] of modelCooldownCache.entries()) {
    if (entry.untilMs > nowMs) {
      activeReasons.set(model, entry.reason);
    } else {
      modelCooldownCache.delete(model);
    }
  }

  if (db) {
    await ensureD1Schema(db);
    try {
      const bound = db
        .prepare(
          "SELECT model, cooldown_until, reason, failure_count FROM ai_model_cooldowns WHERE cooldown_until > ?",
        )
        .bind(nowMs);
      if (typeof bound.all === "function") {
        const res = await bound.all<AiCooldownRow>();
        for (const row of res.results ?? []) {
          const untilMs = Number(row.cooldown_until);
          if (untilMs > nowMs && row.model) {
            const reason = normalizeCooldownReason(row.reason);
            activeReasons.set(row.model, reason);
            modelCooldownCache.set(row.model, {
              untilMs,
              reason,
              failureCount: Math.max(1, Number(row.failure_count) || 1),
            });
          }
        }
      }
    } catch {
      // Non-fatal D1 cooldown read error; isolate memory mirror remains active.
    }
  }

  const activeModels = new Set(activeReasons.keys());
  return {
    activeModels,
    allCooldownError: buildAllCooldownError(candidates, activeReasons),
  };
}

async function recordModelCooldown(
  model: string,
  reason: GeminiCooldownReason,
  db?: D1Database,
  nowMs = Date.now(),
): Promise<void> {
  const prevCount = modelCooldownCache.get(model)?.failureCount ?? 0;
  const nextCount = prevCount + 1;
  const cooldownUntilMs = nowMs + resolveCooldownDurationMs(reason, nextCount);
  modelCooldownCache.set(model, {
    untilMs: cooldownUntilMs,
    reason,
    failureCount: nextCount,
  });

  if (!db) return;
  try {
    await db
      .prepare(
        `INSERT INTO ai_model_cooldowns (model, cooldown_until, reason, failure_count, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(model) DO UPDATE SET
           cooldown_until = excluded.cooldown_until,
           reason = excluded.reason,
           failure_count = ai_model_cooldowns.failure_count + 1,
           updated_at = datetime('now')`,
      )
      .bind(model, cooldownUntilMs, reason, nextCount)
      .run();
  } catch {
    // Non-fatal cooldown persistence error.
  }
}

async function clearModelCooldown(model: string, db?: D1Database): Promise<void> {
  modelCooldownCache.delete(model);
  if (!db) return;
  try {
    await db.prepare("DELETE FROM ai_model_cooldowns WHERE model = ?").bind(model).run();
  } catch {
    // Non-fatal cooldown delete error.
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
    v: 2,
    q: req.question.toLowerCase(),
    lang: req.lang,
    ctx: req.currentContext ?? null,
    model: modelName,
    maxYear: maxCompleteYear,
  });

  const cachedResult = await readAiCache<AiTranslateResult>(cacheKey, "translate", c.env?.DB);
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

  const candidates = resolveCandidateModels(modelName);
  const { activeModels, allCooldownError } = await loadActiveCooldowns(candidates, c.env?.DB);

  try {
    const { parsed, model, thinkingLevel, fallbackUsed } =
      await callGeminiStructured<RawGeminiTranslatePayload>({
        apiKey,
        model: modelName,
        stage: "translate",
        systemInstruction: buildTranslationSystemInstruction(
          req.lang,
          maxCompleteYear,
          req.currentContext,
        ),
        promptText: `User question (${req.lang}): "${req.question}"`,
        jsonSchema: FILTER_TRANSLATION_JSON_SCHEMA,
        thinkingLevel: "low",
        activeCooldownModels: activeModels,
        allCooldownError,
        onModelFailure: (failedModel, reason) =>
          recordModelCooldown(failedModel, reason, c.env?.DB),
        onModelSuccess: (okModel) => clearModelCooldown(okModel, c.env?.DB),
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
      thinkingLevel,
      fallbackUsed,
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
    v: 2,
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

  const cachedResult = await readAiCache<AiInterpretResult>(cacheKey, "interpret", c.env?.DB);
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

  const candidates = resolveCandidateModels(modelName);
  const { activeModels, allCooldownError } = await loadActiveCooldowns(candidates, c.env?.DB);

  try {
    const { parsed, model, thinkingLevel, fallbackUsed } =
      await callGeminiStructured<RawGeminiInterpretPayload>({
        apiKey,
        model: modelName,
        stage: "interpret",
        systemInstruction: buildInterpretationSystemInstruction(req.lang),
        promptText: JSON.stringify(groundedInput, null, 2),
        jsonSchema: INTERPRETATION_JSON_SCHEMA,
        thinkingLevel: "xhigh",
        activeCooldownModels: activeModels,
        allCooldownError,
        onModelFailure: (failedModel, reason) =>
          recordModelCooldown(failedModel, reason, c.env?.DB),
        onModelSuccess: (okModel) => clearModelCooldown(okModel, c.env?.DB),
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
      thinkingLevel,
      fallbackUsed,
      cached: false,
    };

    await writeAiCache(cacheKey, "interpret", result, c.env?.DB);
    return c.json(result, 200);
  } catch (err) {
    return handleGeminiFailure(c, err);
  }
}
