import { useState } from "react";
import { useI18n } from "../i18n/i18n";
import { UNIT_SUFFIX } from "../lib/resultDisplay";
import type { SeriesPoint, VariableUnit } from "../types/investigation";

interface TrendChartProps {
  series: readonly SeriesPoint[];
  unit: VariableUnit;
}

const WIDTH = 760;
const HEIGHT = 260;
const PADDING_LEFT = 52;
const PADDING_RIGHT = 16;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 36;

export function TrendChart({ series, unit }: TrendChartProps) {
  const { t, formatNumber } = useI18n();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (series.length === 0) {
    return null;
  }

  const allValues = series.flatMap((point) => [point.value, point.trendValue]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const xStep = plotWidth / Math.max(series.length - 1, 1);
  const xAt = (index: number) => PADDING_LEFT + index * xStep;
  const yAt = (value: number) => PADDING_TOP + plotHeight - ((value - min) / range) * plotHeight;

  const observedPoints = series
    .map((point, index) => `${xAt(index)},${yAt(point.value)}`)
    .join(" ");
  const trendPoints = series
    .map((point, index) => `${xAt(index)},${yAt(point.trendValue)}`)
    .join(" ");

  const first = series[0];
  const last = series[series.length - 1];
  const unitSuffix = UNIT_SUFFIX[unit]?.trim() ?? "";
  const formatValue = (value: number) =>
    `${formatNumber(value, { maximumFractionDigits: 1 })}${unitSuffix ? ` ${unitSuffix}` : ""}`;

  const hovered = hoveredIndex !== null ? series[hoveredIndex] : undefined;
  const tooltipLeftPct = hovered ? (xAt(hoveredIndex as number) / WIDTH) * 100 : 0;
  const tooltipTopPct = hovered ? (yAt(hovered.value) / HEIGHT) * 100 : 0;

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-wide text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-text" /> {t("chart.legendObserved")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-accent" />{" "}
          {t("chart.legendTrend")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />{" "}
          {t("chart.legendAnomaly")}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Line chart: observed values${unitSuffix ? ` in ${unitSuffix}` : ""} from ${first.label} to ${last.label}, with the Sen's Slope trend line and marked anomalies.`}
      >
        {[min, (min + max) / 2, max].map((value) => (
          <g key={value}>
            <line
              x1={PADDING_LEFT}
              y1={yAt(value)}
              x2={WIDTH - PADDING_RIGHT}
              y2={yAt(value)}
              stroke="var(--color-border)"
              strokeWidth={1}
              strokeDasharray={value === min ? undefined : "2 4"}
            />
            <text
              x={PADDING_LEFT - 8}
              y={yAt(value) + 3}
              fill="var(--color-text-muted)"
              fontSize={10}
              fontFamily="Courier Prime, monospace"
              textAnchor="end"
            >
              {formatNumber(value, { maximumFractionDigits: 0 })}
            </text>
          </g>
        ))}

        <polyline
          points={observedPoints}
          fill="none"
          stroke="var(--color-text)"
          strokeWidth={1.5}
        />
        <polyline
          points={trendPoints}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          strokeDasharray="6 5"
        />

        {series.map((point, index) => (
          <g key={point.year}>
            {point.isExtremeAnomaly && (
              <circle cx={xAt(index)} cy={yAt(point.value)} r={3.5} fill="var(--color-accent)" />
            )}
            {hoveredIndex === index && (
              <circle
                cx={xAt(index)}
                cy={yAt(point.value)}
                r={4.5}
                fill="none"
                stroke="var(--color-text)"
                strokeWidth={1.5}
              />
            )}
            {/* larger invisible hit target, easier to hover/tap than the 3.5px dot — purely
                decorative mouse-hover tooltip trigger, the data is already in the chart's aria-label */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: decorative hover-only affordance, not essential, not keyboard-reachable by design */}
            <circle
              cx={xAt(index)}
              cy={yAt(point.value)}
              r={10}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() =>
                setHoveredIndex((current) => (current === index ? null : current))
              }
            />
          </g>
        ))}

        <text
          x={PADDING_LEFT}
          y={HEIGHT - PADDING_BOTTOM + 20}
          fill="var(--color-text-muted)"
          fontSize={11}
          fontFamily="Courier Prime, monospace"
        >
          {first.label}
        </text>
        <text
          x={WIDTH - PADDING_RIGHT}
          y={HEIGHT - PADDING_BOTTOM + 20}
          fill="var(--color-text-muted)"
          fontSize={11}
          fontFamily="Courier Prime, monospace"
          textAnchor="end"
        >
          {last.label}
        </text>
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-[120%] whitespace-nowrap border border-border bg-surface px-2 py-1 font-mono text-xs text-text"
          style={{ left: `${tooltipLeftPct}%`, top: `${tooltipTopPct}%` }}
        >
          <p>
            {hovered.label}: {formatValue(hovered.value)}
          </p>
          {hovered.isExtremeAnomaly && <p className="text-accent">{t("chart.anomalyTag")}</p>}
        </div>
      )}
    </div>
  );
}
