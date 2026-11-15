import type {
  AiApiErrorResponse,
  AiErrorCode,
  AiExtremeYearInput,
  AiInterpretRequest,
  AiInterpretResult,
  AiTranslateContext,
  AiTranslatedFilters,
  AiTranslateRequest,
  AiTranslateResult,
} from "../../types/ai.ts";
import type { GeocodeCandidate, SeriesPoint } from "../../types/investigation.ts";
import { normalizeSearchText, QUICK_CITY_SUGGESTIONS } from "../nasa/smartInvestigation.ts";

export class ClientAiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "ClientAiError";
    this.code = code;
  }
}

async function postAiJson<Req, Res>(url: string, body: Req, signal?: AbortSignal): Promise<Res> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    throw new ClientAiError("AI_UPSTREAM_ERROR", "Unable to reach the AI assistant service.");
  }

  const parsed = (await response.json().catch(() => null)) as
    | (Res & { ok?: boolean })
    | AiApiErrorResponse
    | null;

  if (!response.ok || !parsed || parsed.ok !== true) {
    const errPayload = parsed as AiApiErrorResponse | null;
    const code: AiErrorCode = errPayload?.code ?? "AI_UPSTREAM_ERROR";
    const message = errPayload?.message ?? `AI service returned HTTP ${response.status}.`;
    throw new ClientAiError(code, message);
  }

  return parsed as Res;
}

export async function requestAiTranslate(
  payload: AiTranslateRequest,
  signal?: AbortSignal,
): Promise<AiTranslateResult> {
  return postAiJson<AiTranslateRequest, AiTranslateResult>("/api/ai/translate", payload, signal);
}

export async function requestAiInterpret(
  payload: AiInterpretRequest,
  signal?: AbortSignal,
): Promise<AiInterpretResult> {
  return postAiJson<AiInterpretRequest, AiInterpretResult>("/api/ai/interpret", payload, signal);
}

export function findCuratedCityMatch(queryText: string): GeocodeCandidate | null {
  const normalized = normalizeSearchText(queryText);
  if (!normalized) return null;

  const primaryToken = normalizeSearchText(queryText.split(",")[0] ?? "");
  for (const city of QUICK_CITY_SUGGESTIONS) {
    const cityName = normalizeSearchText(city.name);
    const cityLabel = normalizeSearchText(city.label);
    if (
      cityName === normalized ||
      cityLabel === normalized ||
      (primaryToken.length >= 3 && cityName === primaryToken)
    ) {
      return city;
    }
  }
  return null;
}

export async function resolveAiLocation(
  filters: AiTranslatedFilters,
  currentContext?: AiTranslateContext,
  signal?: AbortSignal,
): Promise<{ lat: number; lon: number; label: string }> {
  if (filters.reuseCurrentLocation && currentContext) {
    return {
      lat: currentContext.lat,
      lon: currentContext.lon,
      label:
        currentContext.label ??
        `${currentContext.lat.toFixed(2)}, ${currentContext.lon.toFixed(2)}`,
    };
  }

  const curated = findCuratedCityMatch(filters.locationQuery);
  if (curated) {
    return { lat: curated.lat, lon: curated.lon, label: curated.label };
  }

  const primaryQuery = filters.locationQuery.split(",")[0]?.trim() || filters.locationQuery;
  for (const term of Array.from(new Set([filters.locationQuery, primaryQuery].filter(Boolean)))) {
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, { signal });
      if (res.ok) {
        const data = (await res.json()) as { ok?: boolean; results?: GeocodeCandidate[] };
        const first = data.results?.[0];
        if (first && Number.isFinite(first.lat) && Number.isFinite(first.lon)) {
          return { lat: first.lat, lon: first.lon, label: first.label };
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
    }
  }

  if (
    typeof filters.lat === "number" &&
    Number.isFinite(filters.lat) &&
    typeof filters.lon === "number" &&
    Number.isFinite(filters.lon)
  ) {
    return {
      lat: filters.lat,
      lon: filters.lon,
      label: filters.locationQuery,
    };
  }

  return {
    lat: -12.74,
    lon: -60.14,
    label: "Vilhena, RO, Brazil",
  };
}

export function extractExtremeYearsForAi(
  series: readonly SeriesPoint[],
  limit = 6,
): AiExtremeYearInput[] {
  const ranked = [...series]
    .filter((pt) => Number.isFinite(pt.value) && Number.isFinite(pt.zScore))
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

  const extremes = ranked.filter((pt) => pt.isExtremeAnomaly);
  const selected = (extremes.length > 0 ? extremes : ranked).slice(0, limit);

  return selected.map((pt) => ({
    label: pt.label,
    value: Number(pt.value.toFixed(2)),
    zScore: Number(pt.zScore.toFixed(2)),
  }));
}
