import { normalizeSearchText } from "../lib/nasa/smartInvestigation.ts";
import { parsePositivePageParam } from "../lib/pagination.ts";
import type { ValidatedInvestigateQuery, ValidationResult } from "../lib/validation/investigate.ts";
import {
  type CatalogInvestigation,
  DEFAULT_END_YEAR,
  DEFAULT_START_YEAR,
  INVESTIGATION_SCALES,
  INVESTIGATION_TOPICS,
  type InvestigationScale,
  type InvestigationTopic,
  SEASON_IDS,
  type SeasonId,
  VARIABLE_IDS,
  type VariableId,
} from "../types/investigation.ts";
import { CASE_PRESETS } from "./presets/index.ts";

function buildPresetCatalogItem(
  presetId: "01" | "02" | "03" | "04",
  scale: InvestigationScale,
  topic: InvestigationTopic,
  tags: readonly string[],
): CatalogInvestigation {
  const preset = CASE_PRESETS.find((p) => p.id === presetId) ?? CASE_PRESETS[0];
  return {
    id: preset.id,
    presetId: preset.id,
    scale,
    topic,
    variable: preset.variable,
    season: preset.defaultSeason,
    startYear: preset.result.stats.startYear,
    endYear: preset.result.stats.endYear,
    lat: preset.result.location.lat,
    lon: preset.result.location.lon,
    label: preset.result.location.label,
    titleKey: `cases.${preset.id}.title`,
    regionKey: `cases.${preset.id}.region`,
    hookKey: preset.hookKey,
    tags,
  };
}

function buildLiveCatalogItem(params: {
  id: string;
  scale: InvestigationScale;
  topic: InvestigationTopic;
  variable: VariableId;
  season: SeasonId;
  lat: number;
  lon: number;
  label: string;
  tags: readonly string[];
}): CatalogInvestigation {
  return {
    ...params,
    startYear: DEFAULT_START_YEAR,
    endYear: DEFAULT_END_YEAR,
    titleKey: `cases.catalog.${params.id}.title`,
    regionKey: `cases.catalog.${params.id}.region`,
    hookKey: `cases.catalog.${params.id}.hook`,
  };
}

/**
 * Curated catalog of 20 scientifically verified high-interest investigations
 * (4 instant offline presets + 16 live NASA POWER queries across Rondônia, Brazil, and Global benchmarks).
 */
export const INVESTIGATION_CATALOG: readonly CatalogInvestigation[] = [
  buildPresetCatalogItem("01", "local", "agro", [
    "vilhena",
    "rondonia",
    "cone sul",
    "cerrado",
    "safrinha",
    "seca",
    "queimadas",
  ]),
  buildLiveCatalogItem({
    id: "ro-cerejeiras",
    scale: "local",
    topic: "agro",
    variable: "PRECTOTCORR",
    season: "apr_sep",
    lat: -13.19,
    lon: -60.81,
    label: "Cerejeiras, RO, Brazil",
    tags: ["cerejeiras", "cone sul", "rondonia", "soja", "safrinha", "chuva", "agro"],
  }),
  buildPresetCatalogItem("02", "state", "warming", [
    "ariquemes",
    "rondonia",
    "vale do jamari",
    "noites quentes",
    "cafe",
    "cacau",
  ]),
  buildLiveCatalogItem({
    id: "ro-porto-velho",
    scale: "state",
    topic: "warming",
    variable: "T2M",
    season: "annual",
    lat: -8.76,
    lon: -63.9,
    label: "Porto Velho, RO, Brazil",
    tags: ["porto velho", "rio madeira", "rondonia", "amazonia", "calor", "seca"],
  }),
  buildLiveCatalogItem({
    id: "ro-ji-parana",
    scale: "state",
    topic: "hydrology",
    variable: "GWETROOT",
    season: "apr_sep",
    lat: -10.88,
    lon: -61.95,
    label: "Ji-Paraná, RO, Brazil",
    tags: ["ji-parana", "bacia do machado", "rondonia", "umidade", "solo", "pastagem"],
  }),
  buildLiveCatalogItem({
    id: "ro-cacoal",
    scale: "state",
    topic: "agro",
    variable: "T2M_MIN",
    season: "annual",
    lat: -11.44,
    lon: -61.45,
    label: "Cacoal, RO, Brazil",
    tags: ["cacoal", "cafe robusta", "conilon", "rondonia", "temperatura minima", "agro"],
  }),
  buildLiveCatalogItem({
    id: "ac-rio-branco",
    scale: "state",
    topic: "warming",
    variable: "T2M",
    season: "apr_sep",
    lat: -9.97,
    lon: -67.81,
    label: "Rio Branco, AC, Brazil",
    tags: ["rio branco", "acre", "amazonia ocidental", "seca", "ondas de calor"],
  }),
  buildLiveCatalogItem({
    id: "am-manaus",
    scale: "national",
    topic: "warming",
    variable: "T2M",
    season: "annual",
    lat: -3.12,
    lon: -60.02,
    label: "Manaus, AM, Brazil",
    tags: ["manaus", "amazonas", "rio negro", "amazonia", "calor", "seca"],
  }),
  buildLiveCatalogItem({
    id: "pa-belem",
    scale: "national",
    topic: "urban",
    variable: "T2M_MIN",
    season: "annual",
    lat: -1.46,
    lon: -48.5,
    label: "Belém, PA, Brazil",
    tags: ["belem", "para", "cop30", "amazonia oriental", "noites tropicais", "urbano"],
  }),
  buildPresetCatalogItem("03", "national", "hydrology", [
    "corumba",
    "pantanal",
    "mato grosso do sul",
    "solo",
    "umidade",
    "incendios",
  ]),
  buildLiveCatalogItem({
    id: "ba-matopiba",
    scale: "national",
    topic: "agro",
    variable: "GWETROOT",
    season: "apr_sep",
    lat: -12.09,
    lon: -45.79,
    label: "Barreiras (MATOPIBA), BA, Brazil",
    tags: ["barreiras", "matopiba", "bahia", "cerrado", "solo", "agro", "soja"],
  }),
  buildLiveCatalogItem({
    id: "df-brasilia",
    scale: "national",
    topic: "hydrology",
    variable: "GWETROOT",
    season: "apr_sep",
    lat: -15.79,
    lon: -47.88,
    label: "Brasília, DF, Brazil",
    tags: ["brasilia", "distrito federal", "cerrado", "agua", "reservatorios", "seca"],
  }),
  buildLiveCatalogItem({
    id: "mt-sorriso",
    scale: "national",
    topic: "agro",
    variable: "PRECTOTCORR",
    season: "apr_sep",
    lat: -12.54,
    lon: -55.72,
    label: "Sorriso, MT, Brazil",
    tags: ["sorriso", "mato grosso", "soja", "safrinha", "agro", "chuva"],
  }),
  buildLiveCatalogItem({
    id: "sp-sao-paulo",
    scale: "national",
    topic: "urban",
    variable: "T2M_MIN",
    season: "annual",
    lat: -23.55,
    lon: -46.63,
    label: "São Paulo, SP, Brazil",
    tags: ["sao paulo", "sudeste", "metropole", "urbano", "noites quentes"],
  }),
  buildLiveCatalogItem({
    id: "pe-petrolina",
    scale: "national",
    topic: "warming",
    variable: "T2M",
    season: "annual",
    lat: -9.39,
    lon: -40.5,
    label: "Petrolina, PE, Brazil",
    tags: ["petrolina", "semiarido", "caatinga", "nordeste", "sao francisco", "calor"],
  }),
  buildLiveCatalogItem({
    id: "rs-porto-alegre",
    scale: "national",
    topic: "hydrology",
    variable: "PRECTOTCORR",
    season: "oct_mar",
    lat: -30.03,
    lon: -51.23,
    label: "Porto Alegre, RS, Brazil",
    tags: ["porto alegre", "rio grande do sul", "guaiba", "chuva", "enchentes", "sul"],
  }),
  buildPresetCatalogItem("04", "global", "benchmark", [
    "svalbard",
    "arctic",
    "artico",
    "polar amplification",
    "degelo",
  ]),
  buildLiveCatalogItem({
    id: "es-sevilla",
    scale: "global",
    topic: "warming",
    variable: "T2M",
    season: "apr_sep",
    lat: 37.39,
    lon: -5.99,
    label: "Sevilla, Spain",
    tags: ["sevilla", "seville", "spain", "espanha", "europe", "mediterranean", "summer heat"],
  }),
  buildLiveCatalogItem({
    id: "jp-tokyo",
    scale: "global",
    topic: "urban",
    variable: "T2M_MIN",
    season: "annual",
    lat: 35.68,
    lon: 139.77,
    label: "Tokyo, Japan",
    tags: ["tokyo", "toquio", "japan", "asia", "urban", "tropical nights"],
  }),
  buildLiveCatalogItem({
    id: "ne-niamey",
    scale: "global",
    topic: "benchmark",
    variable: "T2M",
    season: "annual",
    lat: 13.51,
    lon: 2.11,
    label: "Niamey (Sahel), Niger",
    tags: ["niamey", "sahel", "niger", "africa", "drylands", "warming"],
  }),
];

export interface CatalogFilterInput {
  scale?: string;
  topic?: string;
  variable?: string;
  season?: string;
  q?: string;
  presetOnly?: string;
  limit?: string;
  page?: string;
}

export interface ValidatedCatalogFilters {
  scale?: InvestigationScale;
  topic?: InvestigationTopic;
  variable?: VariableId;
  season?: SeasonId;
  q?: string;
  presetOnly?: boolean;
  limit?: number;
  page?: number;
}

function normalizeOptionalFilterValue(raw?: string): string | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "all") return undefined;
  return trimmed;
}

/**
 * Validates HTTP or UI query filter parameters for the curated investigation catalog.
 * Returns structured `ApiErrorResponse` codes (`INVALID_VARIABLE`, `INVALID_SEASON`, `INVALID_FILTER`).
 */
export function validateCatalogFilterParams(
  input: CatalogFilterInput,
): ValidationResult<ValidatedCatalogFilters> {
  const rawVariable = normalizeOptionalFilterValue(input.variable);
  if (rawVariable !== undefined && !(VARIABLE_IDS as readonly string[]).includes(rawVariable)) {
    return {
      ok: false,
      code: "INVALID_VARIABLE",
      message: `Unsupported variable filter. Allowed: ${VARIABLE_IDS.join(", ")}.`,
    };
  }

  const rawSeason = normalizeOptionalFilterValue(input.season);
  if (rawSeason !== undefined && !(SEASON_IDS as readonly string[]).includes(rawSeason)) {
    return {
      ok: false,
      code: "INVALID_SEASON",
      message: `Unsupported season filter. Allowed: ${SEASON_IDS.join(", ")}.`,
    };
  }

  const rawScale = normalizeOptionalFilterValue(input.scale);
  if (rawScale !== undefined && !(INVESTIGATION_SCALES as readonly string[]).includes(rawScale)) {
    return {
      ok: false,
      code: "INVALID_FILTER",
      message: `Unsupported scale filter. Allowed: ${INVESTIGATION_SCALES.join(", ")}.`,
    };
  }

  const rawTopic = normalizeOptionalFilterValue(input.topic);
  if (rawTopic !== undefined && !(INVESTIGATION_TOPICS as readonly string[]).includes(rawTopic)) {
    return {
      ok: false,
      code: "INVALID_FILTER",
      message: `Unsupported topic filter. Allowed: ${INVESTIGATION_TOPICS.join(", ")}.`,
    };
  }

  let presetOnly: boolean | undefined;
  if (input.presetOnly !== undefined && input.presetOnly.trim() !== "") {
    const rawBool = input.presetOnly.trim().toLowerCase();
    if (rawBool === "true") {
      presetOnly = true;
    } else if (rawBool === "false") {
      presetOnly = false;
    } else {
      return {
        ok: false,
        code: "INVALID_FILTER",
        message: "presetOnly filter must be 'true' or 'false'.",
      };
    }
  }

  let limit: number | undefined;
  if (input.limit !== undefined && input.limit.trim() !== "") {
    const parsedLimit = Number(input.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return {
        ok: false,
        code: "INVALID_FILTER",
        message: "limit filter must be an integer between 1 and 50.",
      };
    }
    limit = parsedLimit;
  }

  const pageValidation = parsePositivePageParam(input.page);
  if (!pageValidation.ok) {
    return {
      ok: false,
      code: "INVALID_FILTER",
      message: pageValidation.message,
    };
  }

  const trimmedQuery = input.q?.trim();

  return {
    ok: true,
    data: {
      ...(rawScale ? { scale: rawScale as InvestigationScale } : {}),
      ...(rawTopic ? { topic: rawTopic as InvestigationTopic } : {}),
      ...(rawVariable ? { variable: rawVariable as VariableId } : {}),
      ...(rawSeason ? { season: rawSeason as SeasonId } : {}),
      ...(trimmedQuery ? { q: trimmedQuery.slice(0, 80) } : {}),
      ...(presetOnly !== undefined ? { presetOnly } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(pageValidation.page !== undefined ? { page: pageValidation.page } : {}),
    },
  };
}

/** Filters curated investigations using validated filter parameters and accent-insensitive keyword matching. */
export function filterInvestigationCatalog(
  filters: ValidatedCatalogFilters,
  extraSearchText?: (item: CatalogInvestigation) => readonly string[],
): CatalogInvestigation[] {
  const normalizedQuery = filters.q ? normalizeSearchText(filters.q) : "";

  const matched = INVESTIGATION_CATALOG.filter((item) => {
    if (filters.scale && item.scale !== filters.scale) return false;
    if (filters.topic && item.topic !== filters.topic) return false;
    if (filters.variable && item.variable !== filters.variable) return false;
    if (filters.season && item.season !== filters.season) return false;
    if (filters.presetOnly === true && !item.presetId) return false;
    if (filters.presetOnly === false && item.presetId) return false;

    if (normalizedQuery) {
      const searchable = [
        item.id,
        item.label,
        item.variable,
        item.season,
        item.scale,
        item.topic,
        ...item.tags,
        ...(extraSearchText ? extraSearchText(item) : []),
      ];
      if (!searchable.some((token) => normalizeSearchText(token).includes(normalizedQuery))) {
        return false;
      }
    }

    return true;
  });

  if (filters.page !== undefined) {
    const pageSize = filters.limit ?? 8;
    const offset = (filters.page - 1) * pageSize;
    return matched.slice(offset, offset + pageSize);
  }

  return filters.limit !== undefined ? matched.slice(0, filters.limit) : matched;
}

/** Converts a catalog investigation into a validated query object ready for client execution or API calls. */
export function toInvestigateQuery(item: CatalogInvestigation): ValidatedInvestigateQuery {
  return {
    lat: item.lat,
    lon: item.lon,
    label: item.label,
    variable: item.variable,
    season: item.season,
    startYear: item.startYear,
    endYear: item.endYear,
  };
}
