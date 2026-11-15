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
    expect(json.service).toBe("geotrend");
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

    const filteredMatch = await app.request(
      "/api/dossiers?variable=T2M&season=annual&q=vilhena&startYear=1981&endYear=2025",
      {},
      buildMockEnv(),
    );
    expect(filteredMatch.status).toBe(200);
    const filteredMatchJson = (await filteredMatch.json()) as {
      ok: boolean;
      dossiers: Array<{ id: string }>;
    };
    expect(filteredMatchJson.dossiers.some((d) => d.id === created.id)).toBe(true);

    const filteredMiss = await app.request(
      "/api/dossiers?variable=PRECTOTCORR",
      {},
      buildMockEnv(),
    );
    expect(filteredMiss.status).toBe(200);
    const filteredMissJson = (await filteredMiss.json()) as {
      ok: boolean;
      dossiers: Array<{ id: string }>;
    };
    expect(filteredMissJson.dossiers.some((d) => d.id === created.id)).toBe(false);

    const badDossierFilter = await app.request(
      "/api/dossiers?variable=INVALID",
      {},
      buildMockEnv(),
    );
    expect(badDossierFilter.status).toBe(400);
    const badDossierErr = (await badDossierFilter.json()) as ApiErrorResponse;
    expect(badDossierErr.code).toBe("INVALID_VARIABLE");

    const badYearFilter = await app.request("/api/dossiers?startYear=1970", {}, buildMockEnv());
    expect(badYearFilter.status).toBe(400);
    const badYearErr = (await badYearFilter.json()) as ApiErrorResponse;
    expect(badYearErr.code).toBe("INVALID_FILTER");
  });

  it("GET /api/dossiers passes SQL WHERE filters to D1 when DB binding is present", async () => {
    const allMock = vi.fn().mockResolvedValue({ results: [] });
    const bindMock = vi.fn().mockReturnValue({ all: allMock });
    const prepareMock = vi.fn().mockReturnValue({ bind: bindMock });
    const fakeDb = { prepare: prepareMock } as unknown as D1Database;

    const res = await app.request(
      "/api/dossiers?variable=GWETROOT&season=apr_sep&startYear=1990&endYear=2025&limit=5",
      {},
      buildMockEnv(fakeDb),
    );
    expect(res.status).toBe(200);
    expect(prepareMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "WHERE variable = ? AND season = ? AND start_year >= ? AND end_year <= ?",
      ),
    );
    expect(bindMock).toHaveBeenCalledWith("GWETROOT", "apr_sep", 1990, 2025, 5);
  });

  it("GET /api/investigations returns filtered catalog entries with calibrated API paths and validates filter params", async () => {
    const allRes = await app.request("/api/investigations", {}, buildMockEnv());
    expect(allRes.status).toBe(200);
    const allJson = (await allRes.json()) as {
      ok: boolean;
      total: number;
      investigations: Array<{
        id: string;
        scale: string;
        query: { variable: string; season: string; startYear: number; endYear: number };
        investigateApiPath: string;
        investigateAppPath: string;
      }>;
    };
    expect(allJson.ok).toBe(true);
    expect(allJson.total).toBe(20);
    expect(allJson.investigations[0]?.investigateApiPath).toContain("/api/investigate?");

    const soilDryRes = await app.request(
      "/api/investigations?variable=GWETROOT&season=apr_sep",
      {},
      buildMockEnv(),
    );
    expect(soilDryRes.status).toBe(200);
    const soilDryJson = (await soilDryRes.json()) as typeof allJson;
    expect(soilDryJson.investigations.map((i) => i.id)).toEqual([
      "ro-ji-parana",
      "ba-matopiba",
      "df-brasilia",
    ]);

    const searchRes = await app.request("/api/investigations?q=sao%20paulo", {}, buildMockEnv());
    expect(searchRes.status).toBe(200);
    const searchJson = (await searchRes.json()) as typeof allJson;
    expect(searchJson.investigations.map((i) => i.id)).toEqual(["sp-sao-paulo"]);

    const presetsLimitRes = await app.request(
      "/api/investigations?presetOnly=true&limit=2",
      {},
      buildMockEnv(),
    );
    expect(presetsLimitRes.status).toBe(200);
    const presetsLimitJson = (await presetsLimitRes.json()) as typeof allJson;
    expect(presetsLimitJson.investigations.map((i) => i.id)).toEqual(["01", "02"]);

    const badScale = await app.request("/api/investigations?scale=mars", {}, buildMockEnv());
    expect(badScale.status).toBe(400);
    expect(((await badScale.json()) as ApiErrorResponse).code).toBe("INVALID_FILTER");

    const badVar = await app.request("/api/investigations?variable=WIND", {}, buildMockEnv());
    expect(badVar.status).toBe(400);
    expect(((await badVar.json()) as ApiErrorResponse).code).toBe("INVALID_VARIABLE");

    const badSeason = await app.request("/api/investigations?season=winter", {}, buildMockEnv());
    expect(badSeason.status).toBe(400);
    expect(((await badSeason.json()) as ApiErrorResponse).code).toBe("INVALID_SEASON");

    const catalogPage2 = await app.request(
      "/api/investigations?page=2&limit=8",
      {},
      buildMockEnv(),
    );
    expect(catalogPage2.status).toBe(200);
    const catalogPage2Json = (await catalogPage2.json()) as typeof allJson & {
      pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
        hasPrev: boolean;
        hasNext: boolean;
      };
    };
    expect(catalogPage2Json.total).toBe(20);
    expect(catalogPage2Json.investigations).toHaveLength(8);
    expect(catalogPage2Json.investigations[0]?.id).toBe("pa-belem");
    expect(catalogPage2Json.pagination).toEqual({
      page: 2,
      pageSize: 8,
      totalItems: 20,
      totalPages: 3,
      hasPrev: true,
      hasNext: true,
    });

    const catalogDefaultPageSize = await app.request(
      "/api/investigations?page=3",
      {},
      buildMockEnv(),
    );
    expect(catalogDefaultPageSize.status).toBe(200);
    const catalogPage3Json = (await catalogDefaultPageSize.json()) as typeof catalogPage2Json;
    expect(catalogPage3Json.investigations.map((i) => i.id)).toEqual([
      "04",
      "es-sevilla",
      "jp-tokyo",
      "ne-niamey",
    ]);
    expect(catalogPage3Json.pagination).toEqual({
      page: 3,
      pageSize: 8,
      totalItems: 20,
      totalPages: 3,
      hasPrev: true,
      hasNext: false,
    });

    const badCatalogPage = await app.request("/api/investigations?page=0", {}, buildMockEnv());
    expect(badCatalogPage.status).toBe(400);
    expect(((await badCatalogPage.json()) as ApiErrorResponse).code).toBe("INVALID_FILTER");
  });

  it("GET /api/dossiers paginates >10 items in D1 SQL and in-memory fallback and validates page params", async () => {
    const monthly = buildMonthlyPayload(1981, 2025, 22);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        async () =>
          new Response(JSON.stringify({ properties: { parameter: { T2M_MIN: monthly } } }), {
            status: 200,
          }),
      ),
    );

    const createdIds: string[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await app.request(
        "/api/dossiers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: -10 - i * 0.25,
            lon: -62.0 + i * 0.25,
            locationLabel: `Archive Station ${i + 1}`,
            variable: "T2M_MIN",
            season: "annual",
            startYear: 1981,
            endYear: 2025,
          }),
        },
        buildMockEnv(),
      );
      expect(res.status).toBe(201);
      const body = (await res.json()) as { id: string };
      createdIds.push(body.id);
    }

    const memPage1 = await app.request(
      "/api/dossiers?variable=T2M_MIN&page=1&limit=5",
      {},
      buildMockEnv(),
    );
    expect(memPage1.status).toBe(200);
    const memPage1Json = (await memPage1.json()) as {
      ok: boolean;
      total: number;
      dossiers: Array<{ id: string }>;
      pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
        hasPrev: boolean;
        hasNext: boolean;
      };
    };
    expect(memPage1Json.total).toBe(11);
    expect(memPage1Json.dossiers).toHaveLength(5);
    expect(memPage1Json.pagination).toEqual({
      page: 1,
      pageSize: 5,
      totalItems: 11,
      totalPages: 3,
      hasPrev: false,
      hasNext: true,
    });

    const memPage3 = await app.request(
      "/api/dossiers?variable=T2M_MIN&page=3&limit=5",
      {},
      buildMockEnv(),
    );
    expect(memPage3.status).toBe(200);
    const memPage3Json = (await memPage3.json()) as typeof memPage1Json;
    expect(memPage3Json.dossiers).toHaveLength(1);
    expect(memPage3Json.dossiers[0]?.id).toBe(createdIds[0]);
    expect(memPage3Json.pagination).toEqual({
      page: 3,
      pageSize: 5,
      totalItems: 11,
      totalPages: 3,
      hasPrev: true,
      hasNext: false,
    });

    const badDossierPage = await app.request("/api/dossiers?page=abc", {}, buildMockEnv());
    expect(badDossierPage.status).toBe(400);
    expect(((await badDossierPage.json()) as ApiErrorResponse).code).toBe("INVALID_FILTER");

    // Verify D1 SQL COUNT(*) and LIMIT ? OFFSET ? binding when page > 1
    const sampleResult: InvestigationResult = {
      location: { label: "Vilhena, RO, Brazil", lat: -12.74, lon: -60.15 },
      variable: "PRECTOTCORR",
      unit: "mm",
      season: "apr_sep",
      stats: {
        mannKendallS: -400,
        mannKendallVariance: 10000,
        zScore: -3.8,
        pValue: 0.000131,
        confidenceLevel: 99,
        senSlopePerYear: -5.3,
        senSlopePerDecade: -53,
        totalChangeOverPeriod: -234.5,
        fullPeriodMean: 420,
        fullPeriodStdDev: 90,
        startYear: 1981,
        endYear: 2025,
        nYears: 45,
        verdict: "STRONG_EVIDENCE",
        direction: "drier",
      },
      series: [],
      source: {
        provider: "NASA POWER / MERRA-2",
        resolution: "temporal/monthly/point",
        retrievedAt: "2026-11-15",
      },
      cached: true,
    };

    const pageBindArgs: unknown[][] = [];
    const prepareMock = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("COUNT(*)")) {
        return {
          all: vi.fn().mockResolvedValue({ results: [{ total: 12 }] }),
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [{ total: 12 }] }),
          }),
        };
      }
      return {
        bind: vi.fn().mockImplementation((...args: unknown[]) => {
          pageBindArgs.push(args);
          return {
            all: vi.fn().mockResolvedValue({
              results: Array.from({ length: 5 }, (_, idx) => ({
                id: `et-00000000${idx}`,
                created_at: `2026-11-15T10:0${idx}:00.000Z`,
                result_json: JSON.stringify(sampleResult),
              })),
            }),
          };
        }),
      };
    });
    const fakeDb = { prepare: prepareMock } as unknown as D1Database;

    const dbPage2 = await app.request("/api/dossiers?page=2&limit=5", {}, buildMockEnv(fakeDb));
    expect(dbPage2.status).toBe(200);
    const dbPage2Json = (await dbPage2.json()) as typeof memPage1Json;
    expect(dbPage2Json.dossiers).toHaveLength(5);
    expect(dbPage2Json.pagination).toEqual({
      page: 2,
      pageSize: 5,
      totalItems: 12,
      totalPages: 3,
      hasPrev: true,
      hasNext: true,
    });
    expect(prepareMock).toHaveBeenCalledWith(expect.stringContaining("COUNT(*)"));
    expect(prepareMock).toHaveBeenCalledWith(expect.stringContaining("LIMIT ? OFFSET ?"));
    expect(pageBindArgs[0]).toEqual([5, 5]);
  });
});
