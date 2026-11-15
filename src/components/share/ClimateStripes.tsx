import { useState } from "react";
import { useOptionalI18n } from "../../i18n/i18n.tsx";
import { UNIT_SUFFIX } from "../../lib/resultDisplay.ts";
import {
  type SeriesPoint,
  VARIABLE_UNIT_MAP,
  type VariableId,
  type VariableUnit,
} from "../../types/investigation.ts";

export interface ClimateStripesProps {
  series: readonly SeriesPoint[];
  variable: VariableId;
  unit?: VariableUnit;
  height?: number;
  className?: string;
  tone?: "light" | "dark";
  interactive?: boolean;
  showExplanation?: boolean;
  initialActiveIndex?: number;
}

const TEMP_PALETTE = [
  "#08306B", // z <= -1.75 (deep cool blue)
  "#2171B5", // -1.75 < z <= -1.0
  "#6BAED6", // -1.0 < z <= -0.4
  "#C6DBEF", // -0.4 < z <= -0.1
  "#F4EFE6", // -0.1 < z < 0.1 (neutral paper)
  "#FCBBA1", // 0.1 <= z < 0.4
  "#FB6A4A", // 0.4 <= z < 1.0
  "#CB181D", // 1.0 <= z < 1.75
  "#67000D", // z >= 1.75 (deep warming crimson)
] as const;

const HYDRO_PALETTE = [
  "#7F2704", // z <= -1.75 (severe drought ochre)
  "#D94801", // -1.75 < z <= -1.0
  "#FD8D3C", // -1.0 < z <= -0.4
  "#FDD0A2", // -0.4 < z <= -0.1
  "#F4EFE6", // -0.1 < z < 0.1 (neutral paper)
  "#C7EAE5", // 0.1 <= z < 0.4
  "#5AB4AC", // 0.4 <= z < 1.0
  "#01665E", // 1.0 <= z < 1.75
  "#003C30", // z >= 1.75 (abundant moisture teal)
] as const;

const FALLBACK_EN: Record<string, string> = {
  "stripes.zScoreLabel": "z = {{z}}",
  "stripes.extremeAnomalyTag": "Extreme anomaly (|z| > 1.5)",
  "stripes.scaleLowTemp": "Cooler (−z)",
  "stripes.scaleHighTemp": "Warmer (+z)",
  "stripes.scaleLowHydro": "Drier (−z)",
  "stripes.scaleHighHydro": "Wetter (+z)",
  "stripes.scaleMean": "Mean (z ≈ 0)",
  "stripes.explainTemp":
    "How to read: each vertical stripe represents one year in chronological order. Blue tones indicate years cooler than the period mean; neutral stripes sit near the mean; crimson tones mark warmer years (|z| > 1.5 flags extreme anomalies). Hover or tap any stripe for exact values.",
  "stripes.explainHydro":
    "How to read: each vertical stripe represents one year or seasonal window in chronological order. Ochre tones indicate years drier than the period mean; neutral stripes sit near the mean; teal tones mark wetter years (|z| > 1.5 flags extreme anomalies). Hover or tap any stripe for exact values.",
};

export function isTemperatureVariable(variable: VariableId): boolean {
  return variable === "T2M" || variable === "T2M_MIN";
}

export function getPaletteForVariable(variable: VariableId): readonly string[] {
  return isTemperatureVariable(variable) ? TEMP_PALETTE : HYDRO_PALETTE;
}

export function getStripeColor(zScore: number, variable: VariableId): string {
  const palette = getPaletteForVariable(variable);
  if (zScore <= -1.75) return palette[0];
  if (zScore <= -1.0) return palette[1];
  if (zScore <= -0.4) return palette[2];
  if (zScore <= -0.1) return palette[3];
  if (zScore < 0.1) return palette[4];
  if (zScore < 0.4) return palette[5];
  if (zScore < 1.0) return palette[6];
  if (zScore < 1.75) return palette[7];
  return palette[8];
}

export interface StripeTooltipAnchor {
  leftPct: number;
  align: "left" | "center" | "right";
}

export function computeStripeTooltipAnchor(index: number, total: number): StripeTooltipAnchor {
  const safeTotal = Math.max(1, total);
  const leftPct = ((index + 0.5) / safeTotal) * 100;
  if (leftPct < 18) return { leftPct, align: "left" };
  if (leftPct > 82) return { leftPct, align: "right" };
  return { leftPct, align: "center" };
}

export function formatSignedZScore(
  zScore: number,
  formatNum: (value: number, options?: Intl.NumberFormatOptions) => string = (val, opts) =>
    new Intl.NumberFormat("en-US", opts).format(val),
): string {
  const rounded = Math.abs(zScore) < 0.005 ? 0 : zScore;
  const formatted = formatNum(rounded, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return rounded > 0 ? `+${formatted}` : formatted;
}

function interpolateFallback(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

export function ClimateStripes({
  series,
  variable,
  unit,
  height = 56,
  className = "",
  tone = "light",
  interactive = tone === "dark",
  showExplanation = tone === "dark",
  initialActiveIndex,
}: ClimateStripesProps) {
  const i18n = useOptionalI18n();
  const [activeIndex, setActiveIndex] = useState<number | null>(() => initialActiveIndex ?? null);

  if (series.length === 0) return null;

  const resolvedUnit = unit ?? VARIABLE_UNIT_MAP[variable];
  const unitSuffix = UNIT_SUFFIX[resolvedUnit]?.trim() ?? "";

  const formatNum =
    i18n?.formatNumber ??
    ((value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat("en-US", options).format(value));

  const tr = (key: string, params?: Record<string, string | number>) => {
    if (i18n) return i18n.t(key, params);
    return interpolateFallback(FALLBACK_EN[key] ?? key, params);
  };

  const formatPointValue = (value: number) =>
    `${formatNum(value, { maximumFractionDigits: 1 })}${unitSuffix ? ` ${unitSuffix}` : ""}`;

  const firstLabel = series[0]?.label ?? "";
  const lastLabel = series[series.length - 1]?.label ?? "";
  const borderClass = tone === "dark" ? "border-border" : "border-[#14110F]/25";
  const labelClass = tone === "dark" ? "text-text-muted" : "text-[#5C5346]";
  const isTemp = isTemperatureVariable(variable);
  const palette = getPaletteForVariable(variable);

  const clampedActiveIndex =
    interactive && activeIndex !== null && activeIndex >= 0 && activeIndex < series.length
      ? activeIndex
      : null;
  const activePoint = clampedActiveIndex !== null ? series[clampedActiveIndex] : undefined;
  const tooltipAnchor =
    clampedActiveIndex !== null
      ? computeStripeTooltipAnchor(clampedActiveIndex, series.length)
      : null;
  const alignTransformClass =
    tooltipAnchor?.align === "left"
      ? "translate-x-0"
      : tooltipAnchor?.align === "right"
        ? "-translate-x-full"
        : "-translate-x-1/2";

  return (
    <div className={className}>
      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${series.length * 10} ${height}`}
          preserveAspectRatio="none"
          className={`h-full w-full overflow-hidden rounded-sm border ${borderClass}`}
          role="img"
          aria-label={`Climate anomaly stripes from ${firstLabel} to ${lastLabel}`}
        >
          {series.map((point, index) => (
            <rect
              key={point.year}
              x={index * 10}
              y={0}
              width={10.5}
              height={height}
              fill={getStripeColor(point.zScore, variable)}
              opacity={clampedActiveIndex !== null && clampedActiveIndex !== index ? 0.45 : 1}
            >
              <title>{`${point.label}: ${point.value} (z=${point.zScore})`}</title>
            </rect>
          ))}
        </svg>

        {interactive && clampedActiveIndex !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 border border-text"
            style={{
              left: `${(clampedActiveIndex / series.length) * 100}%`,
              width: `${(1 / series.length) * 100}%`,
            }}
          />
        )}

        {interactive && (
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}
          >
            {series.map((point, index) => (
              <button
                key={point.year}
                type="button"
                aria-label={`${point.label}: ${formatPointValue(point.value)} (${tr("stripes.zScoreLabel", { z: formatSignedZScore(point.zScore, formatNum) })})`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() =>
                  setActiveIndex((current) => (current === index ? null : current))
                }
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex((current) => (current === index ? null : current))}
                onClick={() => setActiveIndex((current) => (current === index ? null : index))}
                className="h-full w-full cursor-pointer bg-transparent focus:outline-none"
              />
            ))}
          </div>
        )}

        {interactive && activePoint && tooltipAnchor && (
          <div
            role="status"
            className={`pointer-events-none absolute bottom-[calc(100%+6px)] z-20 whitespace-nowrap border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-text shadow-md ${alignTransformClass}`}
            style={{ left: `${tooltipAnchor.leftPct}%` }}
          >
            <p>
              {activePoint.label}: {formatPointValue(activePoint.value)}
            </p>
            <p className="text-text-muted">
              {tr("stripes.zScoreLabel", { z: formatSignedZScore(activePoint.zScore, formatNum) })}
            </p>
            {activePoint.isExtremeAnomaly && (
              <p className="text-accent">{tr("stripes.extremeAnomalyTag")}</p>
            )}
          </div>
        )}
      </div>

      <div className={`mt-1 flex items-center justify-between font-mono text-[11px] ${labelClass}`}>
        <span>{firstLabel}</span>
        <span>ANOMALY STRIPES (Z-SCORE)</span>
        <span>{lastLabel}</span>
      </div>

      {showExplanation && (
        <div className="mt-2.5 space-y-2 border-t border-border/70 pt-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wide text-text-muted">
              <span>{tr(isTemp ? "stripes.scaleLowTemp" : "stripes.scaleLowHydro")}</span>
              <span>{tr("stripes.scaleMean")}</span>
              <span>{tr(isTemp ? "stripes.scaleHighTemp" : "stripes.scaleHighHydro")}</span>
            </div>
            <div
              className="flex h-2 w-full overflow-hidden rounded-[1px] border border-border"
              aria-hidden="true"
            >
              {palette.map((hex) => (
                <span key={hex} className="flex-1" style={{ backgroundColor: hex }} />
              ))}
            </div>
          </div>

          <p className="font-sans text-xs leading-relaxed text-text-muted">
            {tr(isTemp ? "stripes.explainTemp" : "stripes.explainHydro")}
          </p>
        </div>
      )}
    </div>
  );
}
