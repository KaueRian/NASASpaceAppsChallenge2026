import { useState } from "react";
import { type Locale, useResolvedI18n } from "../../i18n/i18n.tsx";
import { useOptionalTemperatureUnit } from "../../i18n/temperatureUnit.tsx";
import {
  getPaletteForVariable,
  getStripeColor,
  isTemperatureVariable,
} from "../../lib/stats/stripesPalette.ts";
import {
  convertAbsoluteValue,
  getDisplayUnitLabel,
  type TemperatureUnit,
} from "../../lib/temperatureUnit.ts";
import {
  type SeriesPoint,
  VARIABLE_UNIT_MAP,
  type VariableId,
  type VariableUnit,
} from "../../types/investigation.ts";

export { getPaletteForVariable, getStripeColor, isTemperatureVariable };

export interface ClimateStripesProps {
  series: readonly SeriesPoint[];
  variable: VariableId;
  unit?: VariableUnit;
  locale?: Locale;
  tempUnit?: TemperatureUnit;
  height?: number;
  className?: string;
  tone?: "light" | "dark";
  interactive?: boolean;
  showExplanation?: boolean;
  initialActiveIndex?: number;
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

export function ClimateStripes({
  series,
  variable,
  unit,
  locale,
  tempUnit,
  height = 56,
  className = "",
  tone = "light",
  interactive = tone === "dark",
  showExplanation = tone === "dark",
  initialActiveIndex,
}: ClimateStripesProps) {
  const { t: tr, formatNumber: formatNum } = useResolvedI18n(locale);
  const contextTempUnit = useOptionalTemperatureUnit();
  const [activeIndex, setActiveIndex] = useState<number | null>(() => initialActiveIndex ?? null);

  if (series.length === 0) return null;

  const resolvedUnit = unit ?? VARIABLE_UNIT_MAP[variable];
  const resolvedTempUnit = tempUnit ?? contextTempUnit;
  const unitSuffix = getDisplayUnitLabel(resolvedUnit, resolvedTempUnit);

  const displayPointValue = (rawValue: number) =>
    convertAbsoluteValue(rawValue, resolvedUnit, resolvedTempUnit);

  const formatPointValue = (rawValue: number) =>
    `${formatNum(displayPointValue(rawValue), { maximumFractionDigits: 1 })}${unitSuffix ? ` ${unitSuffix}` : ""}`;

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
          aria-label={tr("stripes.ariaLabel", { start: firstLabel, end: lastLabel })}
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
              <title>
                {`${point.label}: ${formatPointValue(point.value)} (${tr("stripes.zScoreLabel", { z: formatSignedZScore(point.zScore, formatNum) })})`}
              </title>
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
        <span>{tr("stripes.captionLabel")}</span>
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
