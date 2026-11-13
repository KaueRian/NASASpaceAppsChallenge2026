import {
  DEFAULT_END_YEAR,
  DEFAULT_START_YEAR,
  type VariableId,
} from "../../types/investigation.ts";

export interface NasaPowerFetchParams {
  lat: number;
  lon: number;
  variable: VariableId;
  startYear?: number;
  endYear?: number;
  timeoutMs?: number;
}

interface NasaPowerApiResponse {
  properties?: {
    parameter?: Record<string, Record<string, number>>;
  };
}

/**
 * Fetches `temporal/monthly/point` climatology data from the official NASA POWER API.
 * Includes timeout handling and a single retry for transient upstream errors.
 */
export async function fetchNasaPowerMonthly({
  lat,
  lon,
  variable,
  startYear = DEFAULT_START_YEAR,
  endYear = DEFAULT_END_YEAR,
  timeoutMs = 12000,
}: NasaPowerFetchParams): Promise<Record<string, number>> {
  const url = new URL("https://power.larc.nasa.gov/api/temporal/monthly/point");
  url.searchParams.set("parameters", variable);
  url.searchParams.set("community", "AG");
  url.searchParams.set("longitude", lon.toFixed(4));
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("start", String(startYear));
  url.searchParams.set("end", String(endYear));
  url.searchParams.set("format", "JSON");

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        if (response.status >= 500 && attempt === 0) {
          continue;
        }
        throw new Error(`NASA_UPSTREAM_ERROR: HTTP ${response.status}`);
      }

      const payload = (await response.json()) as NasaPowerApiResponse;
      const paramMap = payload.properties?.parameter?.[variable];
      if (!paramMap || typeof paramMap !== "object") {
        throw new Error("NASA_UPSTREAM_ERROR: Missing parameter payload");
      }

      return paramMap;
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === "AbortError") {
        lastError = new Error("NASA_UPSTREAM_TIMEOUT");
      } else if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error("NASA_UPSTREAM_ERROR");
      }

      if (attempt === 0 && lastError.message === "NASA_UPSTREAM_TIMEOUT") {
        continue;
      }
      break;
    }
  }

  throw lastError ?? new Error("NASA_UPSTREAM_ERROR");
}
