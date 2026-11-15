import { type Locale, translateForLocale } from "../../i18n/translate.ts";
import type { InvestigationResult, LocationInfo } from "../../types/investigation.ts";
import type { GibsLayerId } from "../gibs.ts";
import {
  convertInvestigationResultForDisplay,
  getDisplayUnitLabel,
  type TemperatureUnit,
} from "../temperatureUnit.ts";

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a scientific CSV export of an InvestigationResult including
 * metadata comment lines and the annual/seasonal time series.
 */
export function buildDossierCsv(
  result: InvestigationResult,
  tempUnit: TemperatureUnit = "C",
): string {
  const displayResult = convertInvestigationResultForDisplay(result, tempUnit);
  const { location, variable, unit, season, stats, series, source } = displayResult;
  const csvUnit = unit === "C" && tempUnit === "F" ? "F" : unit;
  const lines: string[] = [
    `# GeoTrend — Scientific Series Export`,
    `# Location: ${location.label} (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)})`,
    `# Variable: ${variable} (${csvUnit}) | Season: ${season}`,
    `# Period: ${stats.startYear}-${stats.endYear} (n=${stats.nYears})`,
    `# Mann-Kendall S=${stats.mannKendallS}, Z=${stats.zScore.toFixed(4)}, p=${stats.pValue.toFixed(6)}, Verdict=${stats.verdict}`,
    `# Sen's Slope: ${stats.senSlopePerYear.toFixed(5)}/yr (${stats.senSlopePerDecade.toFixed(4)}/decade) | Total Change: ${stats.totalChangeOverPeriod.toFixed(3)}`,
    `# Source: ${source.provider} (${source.resolution}) | Retrieved: ${source.retrievedAt}`,
    "year,label,value,unit,trend_value,z_score,is_extreme_anomaly",
  ];

  for (const pt of series) {
    lines.push(
      [
        escapeCsvCell(pt.year),
        escapeCsvCell(pt.label),
        escapeCsvCell(pt.value),
        escapeCsvCell(csvUnit),
        escapeCsvCell(pt.trendValue),
        escapeCsvCell(pt.zScore),
        escapeCsvCell(pt.isExtremeAnomaly),
      ].join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

interface AnchorDocumentLike {
  createElement(tag: "a"): { href: string; download: string; click(): void };
}

/**
 * Triggers a browser download of the CSV file for the given investigation result.
 */
export function downloadDossierCsv(
  result: InvestigationResult,
  tempUnit: TemperatureUnit = "C",
): void {
  const doc = (globalThis as { document?: AnchorDocumentLike }).document;
  if (!doc) return;
  const csv = buildDossierCsv(result, tempUnit);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const safeName = result.location.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const a = doc.createElement("a");
  a.href = url;
  a.download = `geotrend-${safeName || "case"}-${result.variable.toLowerCase()}-${result.stats.startYear}-${result.stats.endYear}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates a ready-to-copy scientific citation and methodology summary paragraph
 * in English (`en`) or Portuguese (`pt`), including Mann-Kendall, Sen's Slope with 95% CI,
 * NASA POWER / MERRA-2 attribution, and the correlation-vs-causation caveat.
 */
export function buildCitationText(
  result: InvestigationResult,
  locale: Locale = "en",
  tempUnit: TemperatureUnit = "C",
): string {
  const displayResult = convertInvestigationResultForDisplay(result, tempUnit);
  const { location, variable, unit, season, stats, source } = displayResult;
  const unitDisplay = getDisplayUnitLabel(unit, tempUnit);
  const sign = stats.totalChangeOverPeriod > 0 ? "+" : "";
  const decSign = stats.senSlopePerDecade > 0 ? "+" : "";
  const variableLabel = `${translateForLocale(locale, `variables.${variable}.label`)} (${variable})`;
  const seasonLabel = translateForLocale(locale, `seasons.${season}`);
  const verdictLabel = translateForLocale(locale, `share.card.verdictShort.${stats.verdict}`);
  const ciPart =
    stats.senSlopeCiLowerPerDecade !== undefined && stats.senSlopeCiUpperPerDecade !== undefined
      ? locale === "pt"
        ? ` (IC 95%: [${stats.senSlopeCiLowerPerDecade.toFixed(2)}, ${stats.senSlopeCiUpperPerDecade.toFixed(2)}] ${unitDisplay}/década)`
        : ` (95% CI: [${stats.senSlopeCiLowerPerDecade.toFixed(2)}, ${stats.senSlopeCiUpperPerDecade.toFixed(2)}] ${unitDisplay}/decade)`
      : "";

  if (locale === "pt") {
    return (
      `Análise gerada via GeoTrend para ${location.label} (${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°), ` +
      `variável ${variableLabel} (${seasonLabel}, ${stats.startYear}–${stats.endYear}, n=${stats.nYears}). ` +
      `Teste não-paramétrico de Mann-Kendall: S=${stats.mannKendallS}, Z=${stats.zScore.toFixed(2)}, p=${stats.pValue.toFixed(6)} (${verdictLabel}). ` +
      `Estimador de Sen's Slope: ${decSign}${stats.senSlopePerDecade.toFixed(2)} ${unitDisplay}/década${ciPart}, mudança total de ${sign}${stats.totalChangeOverPeriod.toFixed(2)} ${unitDisplay} no período. ` +
      `Nota metodológica: a significância estatística comprova tendência direcional nos dados observados, sem implicar atribuição causal isolada. ` +
      `Fonte: ${source.provider} (${source.resolution}), consultado em ${source.retrievedAt}.`
    );
  }

  return (
    `Analysis generated via GeoTrend for ${location.label} (${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°), ` +
    `variable ${variableLabel} (${seasonLabel}, ${stats.startYear}–${stats.endYear}, n=${stats.nYears}). ` +
    `Mann-Kendall non-parametric test: S=${stats.mannKendallS}, Z=${stats.zScore.toFixed(2)}, p=${stats.pValue.toFixed(6)} (${verdictLabel}). ` +
    `Sen's Slope estimator: ${decSign}${stats.senSlopePerDecade.toFixed(2)} ${unitDisplay}/decade${ciPart}, total shift of ${sign}${stats.totalChangeOverPeriod.toFixed(2)} ${unitDisplay} over the period. ` +
    `Methodological note: statistical significance confirms a directional trend in observed reanalysis data, not single-cause physical attribution. ` +
    `Source: ${source.provider} (${source.resolution}), retrieved ${source.retrievedAt}.`
  );
}

export type AcademicCitationFormat = "summary" | "bibtex" | "abnt" | "apa";

export interface AcademicCitationOptions {
  locale?: Locale;
  tempUnit?: TemperatureUnit;
  shareUrl?: string;
}

function slugifyCitationToken(input: string): string {
  const token = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return token || "site";
}

function extractIsoDate(retrievedAt: string): {
  year: string;
  isoDate: string;
  abntPtDate: string;
} {
  const isoMatch = retrievedAt.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    const monthsPt = [
      "jan.",
      "fev.",
      "mar.",
      "abr.",
      "maio",
      "jun.",
      "jul.",
      "ago.",
      "set.",
      "out.",
      "nov.",
      "dez.",
    ];
    const monthIdx = Math.max(0, Math.min(11, Number(mm) - 1));
    return {
      year: yyyy,
      isoDate: `${yyyy}-${mm}-${dd}`,
      abntPtDate: `${Number(dd)} ${monthsPt[monthIdx]} ${yyyy}`,
    };
  }
  const yearMatch = retrievedAt.match(/(\d{4})/);
  const year = yearMatch ? yearMatch[1] : "2026";
  return {
    year,
    isoDate: `${year}-01-01`,
    abntPtDate: year,
  };
}

/**
 * Generates academic citations in Summary, ABNT (NBR 6023), APA 7th, or BibTeX format,
 * including full Mann-Kendall, Sen's Slope, R², coordinates, and NASA POWER provenance.
 */
export function buildAcademicCitation(
  result: InvestigationResult,
  format: AcademicCitationFormat = "summary",
  options: AcademicCitationOptions = {},
): string {
  const locale = options.locale ?? "en";
  const tempUnit = options.tempUnit ?? "C";
  if (format === "summary") {
    return buildCitationText(result, locale, tempUnit);
  }

  const displayResult = convertInvestigationResultForDisplay(result, tempUnit);
  const { location, variable, unit, season, stats, source } = displayResult;
  const unitDisplay = getDisplayUnitLabel(unit, tempUnit);
  const decSign = stats.senSlopePerDecade > 0 ? "+" : "";
  const variableLabel = `${translateForLocale(locale, `variables.${variable}.label`)} (${variable})`;
  const seasonLabel = translateForLocale(locale, `seasons.${season}`);
  const { year: retrievedYear, isoDate, abntPtDate } = extractIsoDate(source.retrievedAt);
  const url = options.shareUrl?.trim() || "https://geotrend.earth";
  const r2Str =
    typeof stats.rSquared === "number" && Number.isFinite(stats.rSquared)
      ? stats.rSquared.toFixed(3)
      : "—";
  const ciStr =
    stats.senSlopeCiLowerPerDecade !== undefined && stats.senSlopeCiUpperPerDecade !== undefined
      ? `95% CI [${stats.senSlopeCiLowerPerDecade.toFixed(2)}, ${stats.senSlopeCiUpperPerDecade.toFixed(2)}]`
      : "";

  if (format === "bibtex") {
    const citeKey = `geotrend_${slugifyCitationToken(location.label)}_${variable.toLowerCase()}_${stats.startYear}_${stats.endYear}`;
    const slopeSummary = `${decSign}${stats.senSlopePerDecade.toFixed(2)} ${unitDisplay}/decade${ciStr ? ` (${ciStr})` : ""}`;
    return [
      `@misc{${citeKey},`,
      `  author = {{GeoTrend Platform} and {NASA POWER / GMAO MERRA-2}},`,
      `  title = {Climate Trend Dossier: ${location.label} (${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}) -- ${variableLabel}, ${seasonLabel}, ${stats.startYear}--${stats.endYear}},`,
      `  year = {${retrievedYear}},`,
      `  howpublished = {\\url{${url}}},`,
      `  urldate = {${isoDate}},`,
      `  note = {Sen's Slope: ${slopeSummary}; Mann-Kendall S=${stats.mannKendallS}, Z=${stats.zScore.toFixed(2)}, p=${stats.pValue.toFixed(6)}; OLS R^2=${r2Str}; n=${stats.nYears} years. Source: ${source.provider} (${source.resolution}).}`,
      `}`,
    ].join("\n");
  }

  if (format === "abnt") {
    if (locale === "pt") {
      const ciAbnt = ciStr ? `, ${ciStr.replace("95% CI", "IC 95%")}` : "";
      return (
        `GEOTREND; NASA POWER / GMAO MERRA-2. ` +
        `Dossiê climático de tendência histórica: ${location.label} (${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°), ` +
        `${variableLabel}, ${seasonLabel} (${stats.startYear}–${stats.endYear}). ` +
        `Declive de Sen: ${decSign}${stats.senSlopePerDecade.toFixed(2)} ${unitDisplay}/década${ciAbnt}; ` +
        `Mann-Kendall S=${stats.mannKendallS}, Z=${stats.zScore.toFixed(2)}, p=${stats.pValue.toFixed(6)}; R²=${r2Str}; n=${stats.nYears}. ` +
        `${retrievedYear}. Disponível em: ${url}. Acesso em: ${abntPtDate}.`
      );
    }

    const ciAbntEn = ciStr ? `, ${ciStr}` : "";
    return (
      `GEOTREND; NASA POWER / GMAO MERRA-2. ` +
      `Historical climate trend dossier: ${location.label} (${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°), ` +
      `${variableLabel}, ${seasonLabel} (${stats.startYear}–${stats.endYear}). ` +
      `Sen's Slope: ${decSign}${stats.senSlopePerDecade.toFixed(2)} ${unitDisplay}/decade${ciAbntEn}; ` +
      `Mann-Kendall S=${stats.mannKendallS}, Z=${stats.zScore.toFixed(2)}, p=${stats.pValue.toFixed(6)}; R²=${r2Str}; n=${stats.nYears}. ` +
      `${retrievedYear}. Available at: ${url}. Accessed: ${isoDate}.`
    );
  }

  // APA 7th edition dataset / statistical brief format
  const apaSlope = `${decSign}${stats.senSlopePerDecade.toFixed(2)} ${unitDisplay}/decade${ciStr ? `, ${ciStr}` : ""}`;
  return (
    `GeoTrend, & NASA POWER / GMAO MERRA-2. (${retrievedYear}). ` +
    `GeoTrend climate trend dossier: ${location.label} (${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°), ` +
    `${variableLabel}, ${seasonLabel} (${stats.startYear}–${stats.endYear}) ` +
    `[Mann-Kendall S=${stats.mannKendallS}, Z=${stats.zScore.toFixed(2)}, p=${stats.pValue.toFixed(6)}; ` +
    `Sen's Slope ${apaSlope}; OLS R²=${r2Str}; n=${stats.nYears} years] ` +
    `[Data set & non-parametric trend analysis]. GeoTrend. ${url}`
  );
}

export interface SatelliteCitationInput {
  location: LocationInfo;
  layer: GibsLayerId;
  mode: "compare" | "timelapse";
  beforeYear: number;
  afterYear: number;
  selectedYear: number;
  locale?: Locale;
  shareUrl?: string;
  worldviewUrl?: string;
}

/**
 * Generates a formatted NASA GIBS / MODIS Terra satellite imagery caption & citation
 * including product name, observation date, geographic coordinates, and verification URL.
 */
export function buildSatelliteCitationText({
  location,
  layer,
  mode,
  beforeYear,
  afterYear,
  selectedYear,
  locale = "en",
  shareUrl,
  worldviewUrl,
}: SatelliteCitationInput): string {
  const isNdvi = layer === "MODIS_Terra_L3_NDVI_Monthly";
  const layerName = isNdvi
    ? locale === "pt"
      ? "MODIS/Terra Índices de Vegetação Mensal (NDVI)"
      : "MODIS/Terra Vegetation Indices Monthly (NDVI)"
    : locale === "pt"
      ? "MODIS/Terra Reflectância Corrigida (Cor Real)"
      : "MODIS/Terra Corrected Reflectance (True Color)";
  const dateSuffix = isNdvi ? "08-01" : "08-29";
  const dateRange =
    mode === "compare"
      ? `${beforeYear}-${dateSuffix} vs. ${afterYear}-${dateSuffix}`
      : `${selectedYear}-${dateSuffix}`;
  const coords = `${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°`;
  const links = [
    shareUrl ? `GeoTrend: ${shareUrl}` : null,
    worldviewUrl ? `NASA Worldview: ${worldviewUrl}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  if (locale === "pt") {
    return (
      `Evidência orbital por satélite para ${location.label} (${coords}): ${layerName}, ` +
      `composição de estação seca de agosto (${dateRange}). ` +
      `Fonte: NASA Global Imagery Browse Services (GIBS) / EOSDIS Earthdata.` +
      (links ? ` ${links}` : "")
    );
  }

  return (
    `Satellite orbital visual evidence for ${location.label} (${coords}): ${layerName}, ` +
    `August dry-season composite (${dateRange}). ` +
    `Source: NASA Global Imagery Browse Services (GIBS) / EOSDIS Earthdata.` +
    (links ? ` ${links}` : "")
  );
}
