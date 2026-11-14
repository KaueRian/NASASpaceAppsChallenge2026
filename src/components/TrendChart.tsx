import { UNIT_SUFFIX } from "../lib/resultDisplay";
import type { SeriesPoint, VariableUnit } from "../types/investigation";

interface TrendChartProps {
  series: readonly SeriesPoint[];
  unit: VariableUnit;
}

const WIDTH = 760;
const HEIGHT = 220;
const PADDING = 32;

export function TrendChart({ series, unit }: TrendChartProps) {
  if (series.length === 0) {
    return null;
  }

  const allValues = series.flatMap((point) => [point.value, point.trendValue]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const xStep = (WIDTH - PADDING * 2) / Math.max(series.length - 1, 1);
  const xAt = (index: number) => PADDING + index * xStep;
  const yAt = (value: number) =>
    HEIGHT - PADDING - ((value - min) / range) * (HEIGHT - PADDING * 2);

  const observedPoints = series
    .map((point, index) => `${xAt(index)},${yAt(point.value)}`)
    .join(" ");
  const trendPoints = series
    .map((point, index) => `${xAt(index)},${yAt(point.trendValue)}`)
    .join(" ");

  const first = series[0];
  const last = series[series.length - 1];
  const unitSuffix = UNIT_SUFFIX[unit]?.trim() ?? "";

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Line chart: observed values${unitSuffix ? ` in ${unitSuffix}` : ""} from ${first.label} to ${last.label}, with the Sen's Slope trend line and marked anomalies.`}
    >
      <line
        x1={PADDING}
        y1={HEIGHT - PADDING}
        x2={WIDTH - PADDING}
        y2={HEIGHT - PADDING}
        stroke="var(--color-border)"
        strokeWidth={1}
      />
      <line
        x1={PADDING}
        y1={PADDING}
        x2={PADDING}
        y2={HEIGHT - PADDING}
        stroke="var(--color-border)"
        strokeWidth={1}
      />

      <polyline points={observedPoints} fill="none" stroke="var(--color-text)" strokeWidth={1.5} />
      <polyline
        points={trendPoints}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
        strokeDasharray="6 5"
      />

      {series.map((point, index) =>
        point.isExtremeAnomaly ? (
          <circle
            key={point.year}
            cx={xAt(index)}
            cy={yAt(point.value)}
            r={3.5}
            fill="var(--color-accent)"
          />
        ) : null,
      )}

      <text
        x={PADDING}
        y={PADDING - 10}
        fill="var(--color-text-muted)"
        fontSize={11}
        fontFamily="Courier Prime, monospace"
      >
        {unitSuffix}
      </text>
      <text
        x={PADDING}
        y={HEIGHT - PADDING + 16}
        fill="var(--color-text-muted)"
        fontSize={11}
        fontFamily="Courier Prime, monospace"
      >
        {first.label}
      </text>
      <text
        x={WIDTH - PADDING}
        y={HEIGHT - PADDING + 16}
        fill="var(--color-text-muted)"
        fontSize={11}
        fontFamily="Courier Prime, monospace"
        textAnchor="end"
      >
        {last.label}
      </text>
    </svg>
  );
}
