import {
  CASE_PRESET_IDS,
  type CasePresetId,
  DEFAULT_END_YEAR,
  DEFAULT_START_YEAR,
  VARIABLE_IDS,
  type VariableId,
} from "../types/investigation.ts";
import { GIBS_MAX_YEAR, GIBS_MIN_YEAR, type GibsLayerId } from "./gibs.ts";
import {
  type ValidatedInvestigateQuery,
  validateInvestigateQuery,
} from "./validation/investigate.ts";

export interface SatelliteDeepLinkState {
  mode?: "compare" | "timelapse";
  layer?: GibsLayerId;
  year?: number;
}

export type AppRoute =
  | {
      view: "home";
      presetId: CasePresetId;
      initialLiveQuery?: ValidatedInvestigateQuery;
      scrollToInvestigation?: boolean;
      initialSatellite?: SatelliteDeepLinkState;
    }
  | { view: "methods" }
  | { view: "explore" }
  | { view: "dossier"; dossierId: string; initialSatellite?: SatelliteDeepLinkState };

function parseSatelliteQueryParams(params: URLSearchParams): SatelliteDeepLinkState | undefined {
  const result: SatelliteDeepLinkState = {};
  const rawMode = params.get("satMode");
  if (rawMode === "compare" || rawMode === "timelapse") {
    result.mode = rawMode;
  }

  const rawLayer = params.get("satLayer");
  if (rawLayer === "truecolor" || rawLayer === "MODIS_Terra_CorrectedReflectance_TrueColor") {
    result.layer = "MODIS_Terra_CorrectedReflectance_TrueColor";
  } else if (rawLayer === "ndvi" || rawLayer === "MODIS_Terra_L3_NDVI_Monthly") {
    result.layer = "MODIS_Terra_L3_NDVI_Monthly";
  }

  const rawYear = params.get("satYear");
  if (rawYear !== null && rawYear.trim() !== "") {
    const parsedYear = Number(rawYear);
    if (Number.isFinite(parsedYear)) {
      result.year = Math.max(GIBS_MIN_YEAR, Math.min(GIBS_MAX_YEAR, Math.round(parsedYear)));
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

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
  const params = new URLSearchParams(search);
  const initialSatellite = parseSatelliteQueryParams(params);

  const dossierMatch = pathname.match(/^\/dossier\/([^/]+)\/?$/);
  if (dossierMatch) {
    return {
      view: "dossier",
      dossierId: decodeURIComponent(dossierMatch[1]),
      ...(initialSatellite ? { initialSatellite } : {}),
    };
  }

  if (pathname === "/methods" || pathname === "/methods/") {
    return { view: "methods" };
  }

  if (pathname === "/explore" || pathname === "/explore/") {
    return { view: "explore" };
  }

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
        ...(initialSatellite ? { initialSatellite } : {}),
      };
    }
  }

  const rawCase = params.get("case");
  if (isPresetId(rawCase)) {
    return {
      view: "home",
      presetId: rawCase,
      scrollToInvestigation: true,
      ...(initialSatellite ? { initialSatellite } : {}),
    };
  }

  return {
    view: "home",
    presetId: "01",
    scrollToInvestigation: Boolean(initialSatellite),
    ...(initialSatellite ? { initialSatellite } : {}),
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

export function buildExplorePath(): string {
  return "/explore";
}

export function buildDossierPath(dossierId: string): string {
  return `/dossier/${encodeURIComponent(dossierId)}`;
}

export interface BuildSatelliteDeepLinkOptions {
  origin?: string;
  presetId?: CasePresetId;
  dossierId?: string;
  investigation?: ValidatedInvestigateQuery;
  satellite: {
    mode: "compare" | "timelapse";
    layer: GibsLayerId;
    year: number;
  };
}

/**
 * Builds a shareable URL preserving the current investigation or dossier route
 * alongside NASA GIBS satellite mode, MODIS Terra layer, and selected year.
 */
export function buildSatelliteDeepLink({
  origin = "",
  presetId,
  dossierId,
  investigation,
  satellite,
}: BuildSatelliteDeepLinkOptions): string {
  let basePath: string;
  if (dossierId) {
    basePath = buildDossierPath(dossierId);
  } else if (investigation) {
    basePath = buildInvestigatePath(investigation);
  } else {
    basePath = buildHomePath(presetId);
  }

  const [pathname, rawSearch = ""] = basePath.split("?");
  const params = new URLSearchParams(rawSearch);
  params.set("satMode", satellite.mode);
  params.set("satLayer", satellite.layer === "MODIS_Terra_L3_NDVI_Monthly" ? "ndvi" : "truecolor");
  const safeYear = Math.max(GIBS_MIN_YEAR, Math.min(GIBS_MAX_YEAR, Math.round(satellite.year)));
  params.set("satYear", String(safeYear));

  return `${origin}${pathname}?${params.toString()}`;
}
