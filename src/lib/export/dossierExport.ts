import type { InvestigationResult } from "../../types/investigation.ts";

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
export function buildDossierCsv(result: InvestigationResult): string {
  const { location, variable, unit, season, stats, series, source } = result;
  const lines: string[] = [
    `# EarthTrend Detective — Scientific Series Export`,
    `# Location: ${location.label} (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)})`,
    `# Variable: ${variable} (${unit}) | Season: ${season}`,
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
        escapeCsvCell(unit),
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
export function downloadDossierCsv(result: InvestigationResult): void {
  const doc = (globalThis as { document?: AnchorDocumentLike }).document;
  if (!doc) return;
  const csv = buildDossierCsv(result);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const safeName = result.location.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const a = doc.createElement("a");
  a.href = url;
  a.download = `earthtrend-${safeName || "case"}-${result.variable.toLowerCase()}-${result.stats.startYear}-${result.stats.endYear}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates a ready-to-copy scientific citation and methodology summary paragraph
 * in English (`en`) or Portuguese (`pt`), including Mann-Kendall, Sen's Slope with 95% CI,
 * NASA POWER / MERRA-2 attribution, and the correlation-vs-causation caveat.
 */
export function buildCitationText(result: InvestigationResult, locale: "en" | "pt" = "en"): string {
  const { location, variable, unit, season, stats, source } = result;
  const unitDisplay = unit === "C" ? "°C" : unit === "mm" ? "mm" : "%";
  const sign = stats.totalChangeOverPeriod > 0 ? "+" : "";
  const decSign = stats.senSlopePerDecade > 0 ? "+" : "";
  const ciPart =
    stats.senSlopeCiLowerPerDecade !== undefined && stats.senSlopeCiUpperPerDecade !== undefined
      ? ` (95% CI: [${stats.senSlopeCiLowerPerDecade.toFixed(2)}, ${stats.senSlopeCiUpperPerDecade.toFixed(2)}] ${unitDisplay}/decade)`
      : "";

  if (locale === "pt") {
    return (
      `Análise gerada via EarthTrend Detective para ${location.label} (${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°), ` +
      `variável ${variable} (${season}, ${stats.startYear}–${stats.endYear}, n=${stats.nYears}). ` +
      `Teste não-paramétrico de Mann-Kendall: S=${stats.mannKendallS}, Z=${stats.zScore.toFixed(2)}, p=${stats.pValue.toFixed(6)} (${stats.verdict}). ` +
      `Estimador de Sen's Slope: ${decSign}${stats.senSlopePerDecade.toFixed(2)} ${unitDisplay}/década${ciPart}, mudança total de ${sign}${stats.totalChangeOverPeriod.toFixed(2)} ${unitDisplay} no período. ` +
      `Nota metodológica: a significância estatística comprova tendência direcional nos dados observados, sem implicar atribuição causal isolada. ` +
      `Fonte: ${source.provider} (${source.resolution}), consultado em ${source.retrievedAt}.`
    );
  }

  return (
    `Analysis generated via EarthTrend Detective for ${location.label} (${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°), ` +
    `variable ${variable} (${season}, ${stats.startYear}–${stats.endYear}, n=${stats.nYears}). ` +
    `Mann-Kendall non-parametric test: S=${stats.mannKendallS}, Z=${stats.zScore.toFixed(2)}, p=${stats.pValue.toFixed(6)} (${stats.verdict}). ` +
    `Sen's Slope estimator: ${decSign}${stats.senSlopePerDecade.toFixed(2)} ${unitDisplay}/decade${ciPart}, total shift of ${sign}${stats.totalChangeOverPeriod.toFixed(2)} ${unitDisplay} over the period. ` +
    `Methodological note: statistical significance confirms a directional trend in observed reanalysis data, not single-cause physical attribution. ` +
    `Source: ${source.provider} (${source.resolution}), retrieved ${source.retrievedAt}.`
  );
}
