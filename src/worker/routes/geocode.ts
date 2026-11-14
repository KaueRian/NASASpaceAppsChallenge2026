import type { Context } from "hono";
import { validateGeocodeQuery } from "../../lib/validation/investigate.ts";
import type { ApiErrorResponse, GeocodeCandidate } from "../../types/investigation.ts";
import type { WorkerBindings } from "../index.ts";

interface OpenMeteoResultItem {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

interface OpenMeteoResponse {
  results?: OpenMeteoResultItem[];
}

export async function handleGeocode(c: Context<{ Bindings: WorkerBindings }>) {
  const validation = validateGeocodeQuery(c.req.query("q"));
  if (!validation.ok) {
    const payload: ApiErrorResponse = {
      ok: false,
      code: validation.code,
      message: validation.message,
    };
    return c.json(payload, 400);
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", validation.query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const payload: ApiErrorResponse = {
        ok: false,
        code: "NASA_UPSTREAM_ERROR",
        message: `Geocoding upstream returned HTTP ${response.status}.`,
      };
      return c.json(payload, 502);
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const rawResults = data.results ?? [];

    if (rawResults.length === 0) {
      const payload: ApiErrorResponse = {
        ok: false,
        code: "GEOCODE_NOT_FOUND",
        message: `No matching locations found for "${validation.query}".`,
      };
      return c.json(payload, 404);
    }

    const results: GeocodeCandidate[] = rawResults.slice(0, 5).map((item) => {
      const country = item.country ?? "Unknown";
      const parts = [item.name, item.admin1, item.country].filter(Boolean);
      return {
        name: item.name,
        ...(item.admin1 ? { admin1: item.admin1 } : {}),
        country,
        label: parts.join(", "),
        lat: item.latitude,
        lon: item.longitude,
      };
    });

    return c.json({ ok: true, results }, 200);
  } catch {
    clearTimeout(timer);
    const payload: ApiErrorResponse = {
      ok: false,
      code: "NASA_UPSTREAM_TIMEOUT",
      message: "Geocoding lookup timed out.",
    };
    return c.json(payload, 504);
  }
}
