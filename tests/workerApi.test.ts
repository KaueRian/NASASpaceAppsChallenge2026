import type { D1Database } from "@cloudflare/workers-types";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiErrorResponse, InvestigationResult } from "../src/types/investigation.ts";
import { app, type WorkerBindings } from "../src/worker/index.ts";

function buildMockEnv(db?: D1Database): WorkerBindings {
  return {
    ASSETS: {
      fetch: async () => new Response("Not Found", { status: 404 }),
    },
    ...(db ? { DB: db } : {}),
  };
}

function buildMonthlyPayload(
  startYear: number,
  endYear: number,
  baseTemp = 24,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (let y = startYear; y <= endYear; y++) {
    const delta = (y - startYear) * 0.08;
    for (let m = 1; m <= 12; m++) {
      map[`${y}${String(m).padStart(2, "0")}`] = Number((baseTemp + delta).toFixed(2));
    }
  }
  return map;
}

describe("Worker API routes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("GET /api/health returns service status", async () => {
    const res = await app.request("/api/health", {}, buildMockEnv());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; service: string };
    expect(json.ok).toBe(true);
    expect(json.service).toBe("earthtrend-detective");
  });

  it("GET /api/investigate rejects invalid coordinates with 400", async () => {
    const res = await app.request(
      "/api/investigate?lat=95&lon=-60&variable=T2M&season=annual",
      {},
      buildMockEnv(),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as ApiErrorResponse;
    expect(json.ok).toBe(false);
    expect(json.code).toBe("INVALID_COORDINATES");
  });

  it("GET /api/investigate fetches NASA POWER, computes trend, and writes to D1 cache", async () => {
    const monthly = buildMonthlyPayload(1981, 2025);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          properties: { parameter: { T2M: monthly } },
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

    const res = await app.request(
      "/api/investigate?lat=-12.7406&lon=-60.1458&variable=T2M&season=annual&label=Vilhena",
      {},
      buildMockEnv(fakeDb),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as InvestigationResult;
    expect(body.cached).toBe(false);
    expect(body.location.label).toBe("Vilhena");
    expect(body.stats.verdict).toBe("STRONG_EVIDENCE");
    expect(body.stats.direction).toBe("warming");
    expect(body.series).toHaveLength(45);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(runMock).toHaveBeenCalledTimes(1);
  });

  it("GET /api/investigate serves from D1 cache without calling NASA POWER", async () => {
    const monthly = buildMonthlyPayload(1981, 2025);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const fakeDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            payload_json: JSON.stringify(monthly),
            retrieved_at: "2026-11-13",
          }),
        }),
      }),
    } as unknown as D1Database;

    const res = await app.request(
      "/api/investigate?lat=-12.74&lon=-60.15&variable=T2M&season=annual",
      {},
      buildMockEnv(fakeDb),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as InvestigationResult;
    expect(body.cached).toBe(true);
    expect(body.source.retrievedAt).toBe("2026-11-13");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("GET /api/investigate returns 422 NO_DATA_ALL_MISSING when all readings are -999", async () => {
    const allMissing: Record<string, number> = {};
    for (let y = 1981; y <= 2025; y++) {
      for (let m = 1; m <= 12; m++) {
        allMissing[`${y}${String(m).padStart(2, "0")}`] = -999;
      }
    }

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ properties: { parameter: { GWETROOT: allMissing } } }), {
          status: 200,
        }),
      ),
    );

    const res = await app.request(
      "/api/investigate?lat=0&lon=-140&variable=GWETROOT&season=annual",
      {},
      buildMockEnv(),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as ApiErrorResponse;
    expect(body.code).toBe("NO_DATA_ALL_MISSING");
  });

  it("GET /api/geocode returns up to 5 formatted candidates and 404 on empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                name: "Vilhena",
                admin1: "Rondônia",
                country: "Brazil",
                latitude: -12.7406,
                longitude: -60.1458,
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const okRes = await app.request("/api/geocode?q=Vilhena", {}, buildMockEnv());
    expect(okRes.status).toBe(200);
    const okJson = (await okRes.json()) as {
      ok: boolean;
      results: Array<{ label: string; lat: number; lon: number }>;
    };
    expect(okJson.ok).toBe(true);
    expect(okJson.results).toHaveLength(1);
    expect(okJson.results[0].label).toBe("Vilhena, Rondônia, Brazil");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 })),
    );
    const notFoundRes = await app.request("/api/geocode?q=XyzzyNowhere", {}, buildMockEnv());
    expect(notFoundRes.status).toBe(404);
    const errJson = (await notFoundRes.json()) as ApiErrorResponse;
    expect(errJson.code).toBe("GEOCODE_NOT_FOUND");
  });

  it("POST /api/dossiers creates a structured dossier and GET /api/dossiers/:id retrieves it", async () => {
    const monthly = buildMonthlyPayload(1981, 2025);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ properties: { parameter: { T2M: monthly } } }), {
          status: 200,
        }),
      ),
    );

    const createRes = await app.request(
      "/api/dossiers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: -12.7406,
          lon: -60.1458,
          locationLabel: "Vilhena, RO https://spam.example",
          variable: "T2M",
          season: "annual",
          startYear: 1981,
          endYear: 2025,
        }),
      },
      buildMockEnv(),
    );

    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      id: string;
      createdAt: string;
      result: InvestigationResult;
    };
    expect(created.id).toMatch(/^et-[a-f0-9]{10}$/);
    expect(created.result.location.label).toBe("Vilhena, RO");

    const getRes = await app.request(`/api/dossiers/${created.id}`, {}, buildMockEnv());
    expect(getRes.status).toBe(200);
    const fetched = (await getRes.json()) as { id: string };
    expect(fetched.id).toBe(created.id);

    const listRes = await app.request("/api/dossiers", {}, buildMockEnv());
    expect(listRes.status).toBe(200);
    const listJson = (await listRes.json()) as { ok: boolean; dossiers: Array<{ id: string }> };
    expect(listJson.ok).toBe(true);
    expect(listJson.dossiers.some((d) => d.id === created.id)).toBe(true);

    const missingRes = await app.request("/api/dossiers/et-0000000000", {}, buildMockEnv());
    expect(missingRes.status).toBe(404);
  });
});
