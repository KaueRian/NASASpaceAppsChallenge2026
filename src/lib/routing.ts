import {
  CASE_PRESET_IDS,
  type CasePresetId,
  DEFAULT_END_YEAR,
  DEFAULT_START_YEAR,
  VARIABLE_IDS,
  type VariableId,
} from "../types/investigation.ts";
import {
  type ValidatedInvestigateQuery,
  validateInvestigateQuery,
} from "./validation/investigate.ts";

export type AppRoute =
  | {
      view: "home";
      presetId: CasePresetId;
      initialLiveQuery?: ValidatedInvestigateQuery;
      scrollToInvestigation?: boolean;
    }
  | { view: "methods" }
  | { view: "dossier"; dossierId: string };

function isPresetId(value: string | null): value is CasePresetId {
  return value !== null && (CASE_PRESET_IDS as readonly string[]).includes(value);
}

function defaultSeasonForUrl(variable: string | null, latParam: string | null): string {
  if (variable === "PRECTOTCORR") {
    const lat = Number(latParam);
    if (Number.isFinite(lat)) {
      return lat < 0 ? "apr_sep" : "oct_mar";
    }
  }
  return "annual";
}

/**
 * Parses SPA routes produced by ShareSheet (`/?case=01`, `/investigate?...`, `/dossier/:id`)
 * and navigation views (`/methods`, `/`).
 */
export function parseAppRoute(pathname: string, search: string): AppRoute {
  const dossierMatch = pathname.match(/^\/dossier\/([^/]+)\/?$/);
  if (dossierMatch) {
    return {
      view: "dossier",
      dossierId: decodeURIComponent(dossierMatch[1]),
    };
  }

  if (pathname === "/methods" || pathname === "/methods/") {
    return { view: "methods" };
  }

  const params = new URLSearchParams(search);
  const rawLat = params.get("lat");
  const rawLon = params.get("lon");

  if (pathname === "/investigate" || pathname === "/investigate/" || (rawLat && rawLon)) {
    const rawVar = params.get("variable");
    const variable: VariableId = (VARIABLE_IDS as readonly string[]).includes(rawVar ?? "")
      ? (rawVar as VariableId)
      : "T2M";
    const season = params.get("season") ?? defaultSeasonForUrl(variable, rawLat);
    const startYear = params.get("startYear") ?? String(DEFAULT_START_YEAR);
    const endYear = params.get("endYear") ?? String(DEFAULT_END_YEAR);
    const label = params.get("label") ?? undefined;

    const validated = validateInvestigateQuery({
      lat: rawLat ?? undefined,
      lon: rawLon ?? undefined,
      variable,
      season,
      startYear,
      endYear,
      label,
    });

    if (validated.ok) {
      return {
        view: "home",
        presetId: "01",
        initialLiveQuery: {
          ...validated.data,
          label:
            label?.trim() || `${validated.data.lat.toFixed(2)}°, ${validated.data.lon.toFixed(2)}°`,
        },
        scrollToInvestigation: true,
      };
    }
  }

  const rawCase = params.get("case");
  if (isPresetId(rawCase)) {
    return {
      view: "home",
      presetId: rawCase,
      scrollToInvestigation: true,
    };
  }

  return {
    view: "home",
    presetId: "01",
    scrollToInvestigation: false,
  };
}

export function buildHomePath(caseId?: CasePresetId): string {
  return caseId ? `/?case=${encodeURIComponent(caseId)}` : "/";
}

export function buildInvestigateQueryString(query: ValidatedInvestigateQuery): string {
  const params = new URLSearchParams({
    lat: String(query.lat),
    lon: String(query.lon),
    variable: query.variable,
    season: query.season,
    startYear: String(query.startYear),
    endYear: String(query.endYear),
  });
  if (query.label) {
    params.set("label", query.label);
  }
  return params.toString();
}

export function buildInvestigatePath(query: ValidatedInvestigateQuery): string {
  return `/investigate?${buildInvestigateQueryString(query)}`;
}

export function buildInvestigateApiPath(query: ValidatedInvestigateQuery): string {
  return `/api/investigate?${buildInvestigateQueryString(query)}`;
}

export function buildMethodsPath(): string {
  return "/methods";
}

export function buildDossierPath(dossierId: string): string {
  return `/dossier/${encodeURIComponent(dossierId)}`;
}
