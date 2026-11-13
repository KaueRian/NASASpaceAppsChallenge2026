import {
  MIN_ANALYSIS_YEARS,
  NASA_MISSING_VALUE,
  type SeasonId,
  type VariableId,
} from "../../types/investigation";

export interface MonthlyReading {
  year: number;
  month: number;
  value: number;
}

export interface AggregatedPoint {
  year: number;
  label: string;
  value: number;
}

/** Returns exact number of days in a calendar month (1-indexed), accounting for leap years. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Parses NASA POWER `temporal/monthly/point` parameter dictionary (`YYYYMM -> value`),
 * discarding `YYYY13` annual summary entries, `-999` sentinels, and non-finite values.
 */
export function parseNasaPowerMonthly(raw: Record<string, number>): MonthlyReading[] {
  const readings: MonthlyReading[] = [];

  for (const [key, val] of Object.entries(raw)) {
    if (!/^\d{6}$/.test(key)) continue;
    const year = Number(key.slice(0, 4));
    const month = Number(key.slice(4, 6));
    if (month < 1 || month > 12) continue;
    if (!Number.isFinite(val) || val === NASA_MISSING_VALUE) continue;
    readings.push({ year, month, value: val });
  }

  readings.sort((a, b) => a.year - b.year || a.month - b.month);
  return readings;
}

function getSeasonMonths(year: number, season: SeasonId): Array<{ year: number; month: number }> {
  if (season === "annual") {
    return Array.from({ length: 12 }, (_, idx) => ({ year, month: idx + 1 }));
  }
  if (season === "oct_mar") {
    return [
      { year: year - 1, month: 10 },
      { year: year - 1, month: 11 },
      { year: year - 1, month: 12 },
      { year, month: 1 },
      { year, month: 2 },
      { year, month: 3 },
    ];
  }
  return [4, 5, 6, 7, 8, 9].map((month) => ({ year, month }));
}

function formatSeasonLabel(year: number, season: SeasonId): string {
  if (season === "oct_mar") {
    return `${year - 1}/${String(year).slice(-2)}`;
  }
  return String(year);
}

/**
 * Aggregates monthly NASA POWER readings into annual or seasonal series with canonical units:
 * - `T2M` / `T2M_MIN`: mean °C
 * - `PRECTOTCORR`: total mm (`sum(monthly mm/day * daysInMonth)`)
 * - `GWETROOT`: Soil Wetness Index 0-100 (`mean * 100`)
 *
 * Drops incomplete seasons and enforces `MIN_ANALYSIS_YEARS`.
 */
export function aggregateMonthlySeries(
  raw: Record<string, number>,
  variable: VariableId,
  season: SeasonId,
  startYear: number,
  endYear: number,
): AggregatedPoint[] {
  const readings = parseNasaPowerMonthly(raw);
  if (readings.length === 0) {
    throw new Error("NO_DATA_ALL_MISSING");
  }

  const lookup = new Map<string, number>();
  for (const r of readings) {
    lookup.set(`${r.year}-${r.month}`, r.value);
  }

  const points: AggregatedPoint[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const slots = getSeasonMonths(year, season);
    // For cross-year oct_mar, require the starting Oct-Dec year to be >= startYear
    if (season === "oct_mar" && year - 1 < startYear) {
      continue;
    }

    const slotValues: Array<{ year: number; month: number; value: number }> = [];
    let complete = true;
    for (const slot of slots) {
      const val = lookup.get(`${slot.year}-${slot.month}`);
      if (val === undefined) {
        complete = false;
        break;
      }
      slotValues.push({ year: slot.year, month: slot.month, value: val });
    }

    if (!complete) continue;

    let aggregated: number;
    if (variable === "PRECTOTCORR") {
      const totalMm = slotValues.reduce(
        (acc, item) => acc + item.value * daysInMonth(item.year, item.month),
        0,
      );
      aggregated = roundTo(totalMm, 2);
    } else {
      const mean = slotValues.reduce((acc, item) => acc + item.value, 0) / slotValues.length;
      aggregated = roundTo(variable === "GWETROOT" ? mean * 100 : mean, 2);
    }

    points.push({
      year,
      label: formatSeasonLabel(year, season),
      value: aggregated,
    });
  }

  if (points.length < MIN_ANALYSIS_YEARS) {
    throw new Error("INSUFFICIENT_YEARS");
  }

  return points;
}
