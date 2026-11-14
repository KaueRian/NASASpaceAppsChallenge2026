import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { aggregateMonthlySeries } from "../src/lib/nasa/aggregate.ts";
import { fetchNasaPowerMonthly } from "../src/lib/nasa/powerClient.ts";
import { analyzeTrend } from "../src/lib/stats/analyzeTrend.ts";
import {
  type CasePreset,
  type CasePresetId,
  DEFAULT_END_YEAR,
  DEFAULT_START_YEAR,
  type SeasonId,
  VARIABLE_UNIT_MAP,
  type VariableId,
} from "../src/types/investigation.ts";

interface PresetSeedConfig {
  id: CasePresetId;
  label: string;
  lat: number;
  lon: number;
  variable: VariableId;
  defaultSeason: SeasonId;
  hookKey: string;
}

const PRESET_CONFIGS: PresetSeedConfig[] = [
  {
    id: "01",
    label: "Vilhena, RO, Brazil",
    lat: -12.74,
    lon: -60.14,
    variable: "PRECTOTCORR",
    defaultSeason: "apr_sep",
    hookKey: "cases.01.hook",
  },
  {
    id: "02",
    label: "Ariquemes, RO, Brazil",
    lat: -9.91,
    lon: -63.04,
    variable: "T2M_MIN",
    defaultSeason: "annual",
    hookKey: "cases.02.hook",
  },
  {
    id: "03",
    label: "Corumbá (Pantanal), MS, Brazil",
    lat: -19.01,
    lon: -57.65,
    variable: "GWETROOT",
    defaultSeason: "annual",
    hookKey: "cases.03.hook",
  },
  {
    id: "04",
    label: "Svalbard, Arctic",
    lat: 78.22,
    lon: 15.65,
    variable: "T2M",
    defaultSeason: "annual",
    hookKey: "cases.04.hook",
  },
];

async function main() {
  const outDir = path.resolve("src/data/presets");
  await mkdir(outDir, { recursive: true });
  const retrievedAt = new Date().toISOString().slice(0, 10);

  console.log(`Fetching NASA POWER monthly data (${DEFAULT_START_YEAR}-${DEFAULT_END_YEAR})...\n`);

  for (const cfg of PRESET_CONFIGS) {
    const raw = await fetchNasaPowerMonthly({
      lat: cfg.lat,
      lon: cfg.lon,
      variable: cfg.variable,
      startYear: DEFAULT_START_YEAR,
      endYear: DEFAULT_END_YEAR,
    });

    const aggregated = aggregateMonthlySeries(
      raw,
      cfg.variable,
      cfg.defaultSeason,
      DEFAULT_START_YEAR,
      DEFAULT_END_YEAR,
    );

    const { stats, series } = analyzeTrend(aggregated, cfg.variable);

    const preset: CasePreset = {
      id: cfg.id,
      location: {
        label: cfg.label,
        lat: cfg.lat,
        lon: cfg.lon,
      },
      variable: cfg.variable,
      defaultSeason: cfg.defaultSeason,
      hookKey: cfg.hookKey,
      result: {
        presetId: cfg.id,
        location: {
          label: cfg.label,
          lat: cfg.lat,
          lon: cfg.lon,
        },
        variable: cfg.variable,
        unit: VARIABLE_UNIT_MAP[cfg.variable],
        season: cfg.defaultSeason,
        stats,
        series,
        source: {
          provider: "NASA POWER / MERRA-2",
          resolution: "temporal/monthly/point",
          retrievedAt,
        },
        cached: true,
      },
    };

    const filePath = path.join(outDir, `case-${cfg.id}.json`);
    await writeFile(filePath, `${JSON.stringify(preset, null, 2)}\n`, "utf-8");

    console.log(
      `Case #${cfg.id} | ${cfg.label} | ${cfg.variable} (${cfg.defaultSeason}) -> ` +
        `verdict=${stats.verdict}, dir=${stats.direction}, p=${stats.pValue}, ` +
        `total=${stats.totalChangeOverPeriod} ${VARIABLE_UNIT_MAP[cfg.variable]}, ` +
        `decade=${stats.senSlopePerDecade}, years=${stats.startYear}-${stats.endYear} (n=${stats.nYears})`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
