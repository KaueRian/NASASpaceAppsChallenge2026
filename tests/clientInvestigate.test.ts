import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type ClientInvestigationError,
  clearClientInvestigationCache,
  investigateClientSide,
} from "../src/lib/nasa/clientInvestigate.ts";

function buildMockNasaPowerPayload(variable: string) {
  const paramMap: Record<string, number> = {};
  for (let y = 1981; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, "0");
      paramMap[`${y}${mm}`] = 22 + (y - 1981) * 0.04;
    }
    paramMap[`${y}13`] = 22 + (y - 1981) * 0.04;
  }
  return {
    properties: {
      parameter: {
        [variable]: paramMap,
      },
    },
  };
}

describe("Client-side NASA POWER investigation runner (`investigateClientSide`)", () => {
  afterEach(() => {
    clearClientInvestigationCache();
    vi.restoreAllMocks();
  });

  it("fetches NASA POWER directly, computes stats, and serves subsequent calls from browser cache", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(buildMockNasaPowerPayload("T2M")), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const first = await investigateClientSide({
      lat: -12.7406,
      lon: -60.1458,
      label: "Vilhena, RO, Brazil",
      variable: "T2M",
      season: "annual",
      enableWorkerFallback: false,
    });

    expect(first.cached).toBe(false);
    expect(first.stats.verdict).toBe("STRONG_EVIDENCE");
    expect(first.stats.senSlopeCiLowerPerDecade).toBeDefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const second = await investigateClientSide({
      lat: -12.7406,
      lon: -60.1458,
      label: "Vilhena, RO, Brazil",
      variable: "T2M",
      season: "annual",
      enableWorkerFallback: false,
    });

    expect(second.cached).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects spans shorter than 15 years with INSUFFICIENT_YEARS", async () => {
    await expect(
      investigateClientSide({
        lat: -12.74,
        lon: -60.14,
        variable: "T2M",
        startYear: 2015,
        endYear: 2024,
      }),
    ).rejects.toMatchObject({
      name: "ClientInvestigationError",
      code: "INSUFFICIENT_YEARS",
    } satisfies Partial<ClientInvestigationError>);
  });
});
