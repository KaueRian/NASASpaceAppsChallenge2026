import { type Locale, translateForLocale } from "../../i18n/translate.ts";
import type { InvestigationResult } from "../../types/investigation.ts";
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

export type AcademicCitationFormat = "bibtex" | "abnt" | "apa";

/** Strips accents/diacritics and non-alphanumerics for a safe BibTeX citation key segment. */
function slugifyForCitationKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Generates a ready-to-copy academic reference for the investigation in BibTeX, ABNT (NBR 6023),
 * or APA (7th ed.) format — for researchers/students citing a GeoTrend result in a paper or
 * report. `url` is the shareable deep link (or saved dossier link) for this result, if available.
 */
export function buildAcademicCitation(
  result: InvestigationResult,
  format: AcademicCitationFormat,
  locale: Locale = "en",
  tempUnit: TemperatureUnit = "C",
  url?: string,
): string {
  const displayResult = convertInvestigationResultForDisplay(result, tempUnit);
  const { location, variable, season, stats, source } = displayResult;
  const unitDisplay = getDisplayUnitLabel(displayResult.unit, tempUnit);
  const decSign = stats.senSlopePerDecade > 0 ? "+" : "";
  const variableLabel = `${translateForLocale(locale, `variables.${variable}.label`)} (${variable})`;
  const seasonLabel = translateForLocale(locale, `seasons.${season}`);
  const period = `${stats.startYear}–${stats.endYear}`;
  const accessDate = source.retrievedAt;

  const title =
    locale === "pt"
      ? `${location.label} — ${variableLabel} (${seasonLabel}): análise de tendência NASA POWER, ${period} (${decSign}${stats.senSlopePerDecade.toFixed(2)} ${unitDisplay}/década)`
      : `${location.label} — ${variableLabel} (${seasonLabel}): NASA POWER trend analysis, ${period} (${decSign}${stats.senSlopePerDecade.toFixed(2)} ${unitDisplay}/decade)`;

  if (format === "bibtex") {
    const key = `geotrend_${slugifyForCitationKey(location.label)}_${variable.toLowerCase()}_${stats.endYear}`;
    const note =
      locale === "pt"
        ? `Acessado em ${accessDate}. Fonte de dados: ${source.provider} (${source.resolution}).`
        : `Accessed ${accessDate}. Data source: ${source.provider} (${source.resolution}).`;
    const lines = [
      `@misc{${key},`,
      `  author = {GeoTrend},`,
      `  title = {{${title}}},`,
      `  year = {${stats.endYear}},`,
      url ? `  url = {${url}},` : null,
      `  note = {${note}}`,
      `}`,
    ].filter((line): line is string => line !== null);
    return lines.join("\n");
  }

  if (format === "abnt") {
    const urlPart =
      url !== undefined
        ? locale === "pt"
          ? `Disponível em: ${url}. `
          : `Available at: ${url}. `
        : "";
    return locale === "pt"
      ? `GEOTREND. ${title}. [S. l.]: GeoTrend, ${stats.endYear}. ${urlPart}Acesso em: ${accessDate}.`
      : `GEOTREND. ${title}. [S. l.]: GeoTrend, ${stats.endYear}. ${urlPart}Accessed: ${accessDate}.`;
  }

  // apa
  const retrievedPart =
    url !== undefined
      ? locale === "pt"
        ? `Recuperado em ${accessDate}, de ${url}`
        : `Retrieved ${accessDate}, from ${url}`
      : locale === "pt"
        ? `Recuperado em ${accessDate}`
        : `Retrieved ${accessDate}`;
  return `GeoTrend. (${stats.endYear}). ${title}. ${retrievedPart}`;
}
