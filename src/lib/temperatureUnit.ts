import type {
  InvestigationResult,
  SeriesPoint,
  TrendStats,
  VariableUnit,
} from "../types/investigation.ts";

export type TemperatureUnit = "C" | "F";

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

export function celsiusDeltaToFahrenheit(deltaCelsius: number): number {
  return (deltaCelsius * 9) / 5;
}

export function shouldConvertTemperature(
  canonicalUnit: VariableUnit,
  tempUnit: TemperatureUnit,
): boolean {
  return canonicalUnit === "C" && tempUnit === "F";
}

export function convertAbsoluteValue(
  value: number,
  canonicalUnit: VariableUnit,
  tempUnit: TemperatureUnit,
): number {
  return shouldConvertTemperature(canonicalUnit, tempUnit) ? celsiusToFahrenheit(value) : value;
}

export function convertDeltaValue(
  value: number,
  canonicalUnit: VariableUnit,
  tempUnit: TemperatureUnit,
): number {
  return shouldConvertTemperature(canonicalUnit, tempUnit)
    ? celsiusDeltaToFahrenheit(value)
    : value;
}

export function getDisplayUnitLabel(
  canonicalUnit: VariableUnit,
  tempUnit: TemperatureUnit,
): string {
  if (canonicalUnit === "C") {
    return tempUnit === "F" ? "°F" : "°C";
  }
  return canonicalUnit === "mm" ? "mm" : "%";
}

export function getEvidenceUnitSuffix(
  canonicalUnit: VariableUnit,
  tempUnit: TemperatureUnit,
): string {
  if (canonicalUnit === "C") {
    return tempUnit === "F" ? "°F" : "°C";
  }
  return canonicalUnit === "mm" ? " mm" : " pts (%)";
}

export function convertSeriesForDisplay(
  series: readonly SeriesPoint[],
  canonicalUnit: VariableUnit,
  tempUnit: TemperatureUnit,
): SeriesPoint[] {
  if (!shouldConvertTemperature(canonicalUnit, tempUnit)) {
    return series as SeriesPoint[];
  }
  return series.map((point) => ({
    ...point,
    value: celsiusToFahrenheit(point.value),
    trendValue: celsiusToFahrenheit(point.trendValue),
  }));
}

export function convertStatsForDisplay(
  stats: TrendStats,
  canonicalUnit: VariableUnit,
  tempUnit: TemperatureUnit,
): TrendStats {
  if (!shouldConvertTemperature(canonicalUnit, tempUnit)) {
    return stats;
  }
  return {
    ...stats,
    senSlopePerYear: celsiusDeltaToFahrenheit(stats.senSlopePerYear),
    senSlopePerDecade: celsiusDeltaToFahrenheit(stats.senSlopePerDecade),
    senSlopeCiLowerPerYear:
      stats.senSlopeCiLowerPerYear !== undefined
        ? celsiusDeltaToFahrenheit(stats.senSlopeCiLowerPerYear)
        : undefined,
    senSlopeCiUpperPerYear:
      stats.senSlopeCiUpperPerYear !== undefined
        ? celsiusDeltaToFahrenheit(stats.senSlopeCiUpperPerYear)
        : undefined,
    senSlopeCiLowerPerDecade:
      stats.senSlopeCiLowerPerDecade !== undefined
        ? celsiusDeltaToFahrenheit(stats.senSlopeCiLowerPerDecade)
        : undefined,
    senSlopeCiUpperPerDecade:
      stats.senSlopeCiUpperPerDecade !== undefined
        ? celsiusDeltaToFahrenheit(stats.senSlopeCiUpperPerDecade)
        : undefined,
    totalChangeOverPeriod: celsiusDeltaToFahrenheit(stats.totalChangeOverPeriod),
    olsSlopePerYear:
      stats.olsSlopePerYear !== undefined
        ? celsiusDeltaToFahrenheit(stats.olsSlopePerYear)
        : undefined,
    fullPeriodMean: celsiusToFahrenheit(stats.fullPeriodMean),
    fullPeriodStdDev: celsiusDeltaToFahrenheit(stats.fullPeriodStdDev),
  };
}

export function convertInvestigationResultForDisplay(
  result: InvestigationResult,
  tempUnit: TemperatureUnit,
): InvestigationResult {
  if (!shouldConvertTemperature(result.unit, tempUnit)) {
    return result;
  }
  return {
    ...result,
    stats: convertStatsForDisplay(result.stats, result.unit, tempUnit),
    series: convertSeriesForDisplay(result.series, result.unit, tempUnit),
  };
}
