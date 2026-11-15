import { type Locale, translateForLocale, useResolvedI18n } from "../../i18n/i18n.tsx";
import { useOptionalTemperatureUnit } from "../../i18n/temperatureUnit.tsx";
import {
  convertDeltaValue,
  convertInvestigationResultForDisplay,
  getDisplayUnitLabel,
  getEvidenceUnitSuffix,
  type TemperatureUnit,
} from "../../lib/temperatureUnit.ts";
import type { InvestigationResult, SeriesPoint, TrendStats } from "../../types/investigation.ts";
import { BrandLogo, drawBrandMarkOnCanvas } from "../BrandLogo.tsx";
import { ClimateStripes, getStripeColor } from "./ClimateStripes.tsx";

export type EvidenceCardAspect = "story" | "square" | "figure";

/** Reused by canvas text drawing to approximate `--color-accent` from index.css
 * (canvas fillStyle cannot resolve CSS custom properties). */
const ACCENT_COLOR = "#c1472e";

export interface EvidenceCardProps {
  result: InvestigationResult;
  aspect?: EvidenceCardAspect;
  shortUrl?: string;
  locale?: Locale;
  tempUnit?: TemperatureUnit;
}

function formatSigned(
  value: number,
  unit: InvestigationResult["unit"],
  tempUnit: TemperatureUnit = "C",
): string {
  const converted = convertDeltaValue(value, unit, tempUnit);
  const sign = converted > 0 ? "+" : "";
  const suffix = getEvidenceUnitSuffix(unit, tempUnit);
  return `${sign}${converted.toFixed(2)}${suffix}`;
}

export function buildQrMatrix(seedText: string, size = 11): boolean[][] {
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const grid: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        grid[r0 + r][c0 + c] = true;
      }
    }
    grid[r0 + 1][c0 + 1] = false;
  };
  drawFinder(0, 0);
  drawFinder(0, size - 3);
  drawFinder(size - 3, 0);

  let state = hash >>> 0 || 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if ((r < 3 && c < 3) || (r < 3 && c >= size - 3) || (r >= size - 3 && c < 3)) {
        continue;
      }
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      grid[r][c] = (state & 1) === 1;
    }
  }
  return grid;
}

function buildQrCells(seedText: string): Array<{ id: string; x: number; y: number }> {
  const matrix = buildQrMatrix(seedText);
  const cells: Array<{ id: string; x: number; y: number }> = [];
  matrix.forEach((row, y) => {
    row.forEach((on, x) => {
      if (on) cells.push({ id: `qr-${x}-${y}`, x, y });
    });
  });
  return cells;
}

export function EvidenceCard({
  result,
  aspect = "story",
  shortUrl,
  locale,
  tempUnit,
}: EvidenceCardProps) {
  const { locale: resolvedLocale, t } = useResolvedI18n(locale);
  const contextTempUnit = useOptionalTemperatureUnit();
  const resolvedTempUnit = tempUnit ?? contextTempUnit;

  if (aspect === "figure") {
    return <FigureCard result={result} locale={resolvedLocale} tempUnit={resolvedTempUnit} />;
  }

  const { location, variable, unit, season, stats, series, source } = result;
  const isStory = aspect === "story";
  const stampColor =
    stats.verdict === "STRONG_EVIDENCE"
      ? "#C83E2B"
      : stats.verdict === "EVIDENCE_CONFIRMED"
        ? "#D4A84F"
        : "#5C5346";
  const qrLabel = t("share.card.qrAriaLabel");

  return (
    <article
      className={`relative flex flex-col justify-between rounded-sm border-2 border-[#14110F] bg-[#F4EFE6] p-6 text-[#14110F] shadow-xl ${
        isStory ? "aspect-[9/16] w-full max-w-[360px]" : "aspect-square w-full max-w-[380px]"
      }`}
    >
      <header className="border-b border-[#14110F]/20 pb-3">
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest text-[#5C5346]">
          <span className="inline-flex items-center gap-1.5">
            <BrandLogo variant="mark" tone="paper" size={16} decorative />
            <span>{t("share.card.headerLabel")}</span>
          </span>
          <span>
            {stats.startYear}–{stats.endYear}
          </span>
        </div>
        <h3 className="mt-1 font-serif text-xl font-bold leading-tight">{location.label}</h3>
        <p className="font-mono text-xs text-[#5C5346]">
          {t(`variables.${variable}.label`)} ({variable}) · {t(`seasons.${season}`)}
        </p>
      </header>

      <div className="my-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-wider text-[#5C5346]">
              {t("share.card.totalShiftDom", { nYears: stats.nYears })}
            </span>
            <span className="font-mono text-3xl font-extrabold tracking-tight">
              {formatSigned(stats.totalChangeOverPeriod, unit, resolvedTempUnit)}
            </span>
          </div>
          <span
            className="rotate-[-4deg] border-2 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-widest"
            style={{ borderColor: stampColor, color: stampColor }}
          >
            {t(`share.card.verdictShort.${stats.verdict}`)}
          </span>
        </div>

        <ClimateStripes
          series={series}
          variable={variable}
          unit={unit}
          locale={resolvedLocale}
          tempUnit={resolvedTempUnit}
          height={isStory ? 72 : 48}
        />

        {isStory && (
          <dl className="grid grid-cols-2 gap-2 border-t border-[#14110F]/15 pt-3 font-mono text-xs">
            <div className="rounded bg-[#E8DFD1] p-2">
              <dt className="text-[10px] uppercase text-[#5C5346]">
                {t("share.card.senSlopeDom")}
              </dt>
              <dd className="mt-0.5 font-bold">
                {formatSigned(stats.senSlopePerDecade, unit, resolvedTempUnit)}
              </dd>
            </div>
            <div className="rounded bg-[#E8DFD1] p-2">
              <dt className="text-[10px] uppercase text-[#5C5346]">
                {t("share.card.mannKendallPValue")}
              </dt>
              <dd className="mt-0.5 font-bold">
                p = {stats.pValue < 0.0001 ? "< 0.0001" : stats.pValue.toFixed(4)}
              </dd>
            </div>
            <div className="rounded bg-[#E8DFD1] p-2">
              <dt className="text-[10px] uppercase text-[#5C5346]">
                {t("share.card.confidenceDom")}
              </dt>
              <dd className="mt-0.5 font-bold">
                {stats.confidenceLevel > 0
                  ? `${stats.confidenceLevel}%`
                  : t("share.card.inconclusive")}
              </dd>
            </div>
            <div className="rounded bg-[#E8DFD1] p-2">
              <dt className="text-[10px] uppercase text-[#5C5346]">
                {t("share.card.coordinates")}
              </dt>
              <dd className="mt-0.5 font-bold">
                {location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°
              </dd>
            </div>
          </dl>
        )}
      </div>

      <footer className="border-t border-[#14110F]/20 pt-2 font-mono text-[10px] text-[#5C5346]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div>
              {t("share.card.sourcePrefix")} {source.provider}
            </div>
            <div>
              {t("share.card.retrievedPrefix")} {source.retrievedAt}
            </div>
            {shortUrl && <div className="mt-0.5 truncate text-[#14110F]">{shortUrl}</div>}
          </div>
          {isStory && (
            <svg
              viewBox="0 0 11 11"
              className="h-10 w-10 shrink-0 border border-[#14110F] bg-[#F4EFE6] p-0.5"
              role="img"
              aria-label={qrLabel}
            >
              <title>{qrLabel}</title>
              {buildQrCells(shortUrl ?? location.label).map((cell) => (
                <rect key={cell.id} x={cell.x} y={cell.y} width={1} height={1} fill="#14110F" />
              ))}
            </svg>
          )}
        </div>
      </footer>
    </article>
  );
}

interface SubCardProps {
  result: InvestigationResult;
  locale: Locale;
  tempUnit: TemperatureUnit;
}

interface FigureGridLine {
  y: number;
  label: string;
  isZero?: boolean;
}

interface FigureChartGeometry {
  width: number;
  height: number;
  observed: Array<[number, number]>;
  trend: Array<[number, number]>;
  ciBand?: Array<[number, number]>;
  gridLines: FigureGridLine[];
  xLabels: { first: { x: number; label: string }; last: { x: number; label: string } };
}

interface FigureChartDims {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

/**
 * Builds the plot geometry for the minimalist Figure aspect, shared by the DOM preview and the
 * canvas PNG export. Handles the edge cases a shared scientific chart must get right:
 * - never forces the y-axis to start at 0 (would misrepresent a mostly-negative anomaly series);
 *   draws a labeled zero gridline only when 0 actually falls inside the data range.
 * - guards a constant/near-constant series against a zero-range divide (`range = max - min || 1`),
 *   the same guard already used by `TrendChart`'s line mode.
 * - drops any non-finite point before computing the scale or the polylines, so a gap is simply
 *   not drawn rather than interpolated across or fabricated.
 * - renders Sen's-Slope confidence interval as a shaded band (pivoted at the median-index fitted
 *   point, extrapolated using the per-year CI bounds) only when the CI is actually defined.
 */
function buildFigureChartGeometry(
  series: readonly SeriesPoint[],
  stats: TrendStats,
  formatValue: (value: number) => string,
  dims: FigureChartDims,
): FigureChartGeometry | null {
  const { width, height, padLeft, padRight, padTop, padBottom } = dims;
  const valid = series.filter((p) => Number.isFinite(p.value) && Number.isFinite(p.trendValue));
  if (valid.length === 0) return null;

  const hasCi =
    stats.senSlopeCiLowerPerYear !== undefined && stats.senSlopeCiUpperPerYear !== undefined;
  const pivot = valid[Math.floor((valid.length - 1) / 2)];
  const ciLowerValues = hasCi
    ? valid.map(
        (p) => pivot.trendValue + (stats.senSlopeCiLowerPerYear as number) * (p.year - pivot.year),
      )
    : [];
  const ciUpperValues = hasCi
    ? valid.map(
        (p) => pivot.trendValue + (stats.senSlopeCiUpperPerYear as number) * (p.year - pivot.year),
      )
    : [];

  const allValues = [
    ...valid.map((p) => p.value),
    ...valid.map((p) => p.trendValue),
    ...ciLowerValues,
    ...ciUpperValues,
  ];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const xStep = plotWidth / Math.max(valid.length - 1, 1);
  const xAt = (index: number) => padLeft + index * xStep;
  const yAt = (value: number) => padTop + plotHeight - ((value - min) / range) * plotHeight;

  const observed: Array<[number, number]> = valid.map((p, i) => [xAt(i), yAt(p.value)]);
  const trend: Array<[number, number]> = valid.map((p, i) => [xAt(i), yAt(p.trendValue)]);
  const ciBand: Array<[number, number]> | undefined = hasCi
    ? [
        ...valid.map((_p, i): [number, number] => [xAt(i), yAt(ciUpperValues[i])]),
        ...valid.map((_p, i): [number, number] => [xAt(i), yAt(ciLowerValues[i])]).reverse(),
      ]
    : undefined;

  const mid = (min + max) / 2;
  const gridLines: FigureGridLine[] = [min, mid, max].map((value) => ({
    y: yAt(value),
    label: formatValue(value),
  }));
  if (min < 0 && max > 0) {
    const zeroY = yAt(0);
    if (!gridLines.some((g) => Math.abs(g.y - zeroY) < 14)) {
      gridLines.push({ y: zeroY, label: formatValue(0), isZero: true });
    }
  }

  return {
    width,
    height,
    observed,
    trend,
    ciBand,
    gridLines,
    xLabels: {
      first: { x: xAt(0), label: valid[0].label },
      last: { x: xAt(valid.length - 1), label: valid[valid.length - 1].label },
    },
  };
}

const toPolylinePoints = (points: Array<[number, number]>) =>
  points.map(([x, y]) => `${x},${y}`).join(" ");

/** Static (non-interactive) line chart for the Figure aspect, adapted from `TrendChart`'s "line"
 * mode geometry but restyled for a plain-white, OWID/Datawrapper-style scientific figure. */
function FigureChart({ geometry }: { geometry: FigureChartGeometry }) {
  const { width, height, observed, trend, ciBand, gridLines, xLabels } = geometry;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="my-2 w-full" role="img" aria-hidden="true">
      {gridLines.map((g) => (
        <g key={`${g.y}-${g.label}`}>
          <line
            x1={0}
            x2={width}
            y1={g.y}
            y2={g.y}
            stroke={g.isZero ? "#9CA3AF" : "#E5E7EB"}
            strokeWidth={1}
            strokeDasharray={g.isZero ? "2 3" : undefined}
          />
          <text x={2} y={Math.max(9, g.y - 3)} style={{ fontSize: 9, fill: "#9CA3AF" }}>
            {g.label}
          </text>
        </g>
      ))}
      {ciBand && (
        <polygon points={toPolylinePoints(ciBand)} fill="var(--color-accent)" opacity={0.12} />
      )}
      <polyline
        points={toPolylinePoints(trend)}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <polyline points={toPolylinePoints(observed)} fill="none" stroke="#111827" strokeWidth={2} />
      <text x={xLabels.first.x} y={height - 4} style={{ fontSize: 9, fill: "#9CA3AF" }}>
        {xLabels.first.label}
      </text>
      <text
        x={xLabels.last.x}
        y={height - 4}
        textAnchor="end"
        style={{ fontSize: 9, fill: "#9CA3AF" }}
      >
        {xLabels.last.label}
      </text>
    </svg>
  );
}

/** Minimalist, OWID/Datawrapper-style scientific figure: plain white background, a plain
 * line+trend chart, a clearly separated provenance line (period/variable/location/coordinates)
 * and plain-language summary sentence, and a small, unobtrusive source/brand footer. */
function FigureCard({ result, locale, tempUnit }: SubCardProps) {
  const { t, formatNumber } = useResolvedI18n(locale);
  const display = convertInvestigationResultForDisplay(result, tempUnit);
  const { location, variable, season, stats, series, source } = display;
  const unitSuffix = getDisplayUnitLabel(display.unit, tempUnit);
  const formatPValue = (p: number) =>
    p < 0.001 ? "< 0.001" : formatNumber(p, { maximumFractionDigits: 3 });
  const geometry = buildFigureChartGeometry(
    series,
    stats,
    (value) => formatNumber(value, { maximumFractionDigits: 1 }),
    { width: 560, height: 220, padLeft: 46, padRight: 12, padTop: 12, padBottom: 26 },
  );

  const headline = t(`verdict.sentence.${stats.direction}`, {
    variable: t(`variables.${variable}.label`),
    season: t(`seasons.${season}`),
    location: location.label,
    totalChange: formatNumber(Math.abs(stats.totalChangeOverPeriod), { maximumFractionDigits: 1 }),
    unit: unitSuffix,
    startYear: stats.startYear,
    endYear: stats.endYear,
    perDecade: formatNumber(Math.abs(stats.senSlopePerDecade), { maximumFractionDigits: 1 }),
    pValue: formatPValue(stats.pValue),
  });

  return (
    <article className="flex aspect-[3/2] w-full max-w-[640px] flex-col justify-between bg-white p-6 text-[#111827]">
      <header>
        <h3 className="font-sans text-lg font-semibold leading-snug">
          {location.label} — {t(`variables.${variable}.label`)} ({t(`seasons.${season}`)})
        </h3>
        <p className="mt-0.5 font-sans text-[11px] text-[#6B7280]">
          {stats.startYear}–{stats.endYear} (n={stats.nYears}) · {location.lat.toFixed(2)}°,{" "}
          {location.lon.toFixed(2)}° · {variable}
        </p>
        <p className="mt-2 font-sans text-sm leading-snug text-[#374151]">{headline}</p>
      </header>

      {geometry && <FigureChart geometry={geometry} />}

      <footer className="flex items-end justify-between gap-3 font-sans text-[9px] leading-snug text-[#9CA3AF]">
        <div>
          <p>
            {t("share.card.sourcePrefix")} {source.provider} · {t("share.card.retrievedPrefix")}{" "}
            {source.retrievedAt}
          </p>
          <p className="mt-0.5 italic">{t("verdict.causationNote")}</p>
        </div>
        <BrandLogo variant="mark" tone="paper" size={14} decorative />
      </footer>
    </article>
  );
}

/**
 * Renders the Evidence Card directly to an HTML5 Canvas and triggers a crisp PNG download.
 */
export function downloadEvidenceCardPng(
  result: InvestigationResult,
  aspect: EvidenceCardAspect = "story",
  shortUrl?: string,
  tempUnit: TemperatureUnit = "C",
  locale: Locale = "en",
): void {
  if (aspect === "figure") {
    drawFigurePng(result, tempUnit, locale);
    return;
  }

  const tr = (key: string, params?: Record<string, string | number>) =>
    translateForLocale(locale, key, params);
  const width = 1080;
  const height = aspect === "story" ? 1920 : 1080;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Paper background & forensic border
  ctx.fillStyle = "#F4EFE6";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#14110F";
  ctx.lineWidth = 8;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Header metadata + paper brand seal
  drawBrandMarkOnCanvas(ctx, { x: 72, y: 74, size: 32, tone: "paper" });
  ctx.fillStyle = "#5C5346";
  ctx.font = "600 26px monospace";
  ctx.fillText(tr("share.card.pngHeaderLabel"), 116, 100);
  ctx.fillText(`${result.stats.startYear}-${result.stats.endYear}`, width - 220, 100);

  // Location title
  ctx.fillStyle = "#14110F";
  ctx.font = "bold 64px Georgia, serif";
  ctx.fillText(result.location.label.slice(0, 28), 72, 185);

  ctx.fillStyle = "#5C5346";
  ctx.font = "500 30px monospace";
  ctx.fillText(
    `${tr(`variables.${result.variable}.label`)} (${result.variable}) · ${tr(`seasons.${result.season}`)}`,
    72,
    238,
    width - 144,
  );

  // Headline shift + Verdict stamp
  ctx.fillStyle = "#5C5346";
  ctx.font = "600 24px monospace";
  ctx.fillText(tr("share.card.totalShiftPng", { nYears: result.stats.nYears }), 72, 330);

  ctx.fillStyle = "#14110F";
  ctx.font = "bold 92px monospace";
  ctx.fillText(formatSigned(result.stats.totalChangeOverPeriod, result.unit, tempUnit), 72, 425);

  const stampColor =
    result.stats.verdict === "STRONG_EVIDENCE"
      ? "#C83E2B"
      : result.stats.verdict === "EVIDENCE_CONFIRMED"
        ? "#D4A84F"
        : "#5C5346";
  const verdictStamp = tr(`share.card.verdictShort.${result.stats.verdict}`);
  ctx.save();
  ctx.font = "bold 26px monospace";
  const stampWidth = Math.max(340, Math.ceil(ctx.measureText(verdictStamp).width) + 44);
  ctx.translate(width - 72 - stampWidth, 355);
  ctx.rotate(-0.06);
  ctx.strokeStyle = stampColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, stampWidth, 74);
  ctx.fillStyle = stampColor;
  ctx.fillText(verdictStamp, 22, 46);
  ctx.restore();

  // Climate Stripes bar
  const stripeTop = 490;
  const stripeHeight = aspect === "story" ? 280 : 220;
  const stripeAreaWidth = width - 144;
  const barW = stripeAreaWidth / Math.max(1, result.series.length);

  result.series.forEach((pt, idx) => {
    ctx.fillStyle = getStripeColor(pt.zScore, result.variable);
    ctx.fillRect(72 + idx * barW, stripeTop, Math.ceil(barW), stripeHeight);
  });
  ctx.strokeStyle = "#14110F";
  ctx.lineWidth = 3;
  ctx.strokeRect(72, stripeTop, stripeAreaWidth, stripeHeight);

  if (aspect === "story") {
    const metricsTop = stripeTop + stripeHeight + 80;
    const rows: Array<[string, string]> = [
      [
        tr("share.card.senSlopePng"),
        formatSigned(result.stats.senSlopePerDecade, result.unit, tempUnit),
      ],
      [
        tr("share.card.mannKendallPValue"),
        `p = ${result.stats.pValue < 0.0001 ? "< 0.0001" : result.stats.pValue.toFixed(5)}`,
      ],
      [
        tr("share.card.confidencePng"),
        result.stats.confidenceLevel > 0
          ? `${result.stats.confidenceLevel}%`
          : tr("share.card.inconclusive"),
      ],
      [
        tr("share.card.coordinates"),
        `${result.location.lat.toFixed(2)}°, ${result.location.lon.toFixed(2)}°`,
      ],
    ];

    rows.forEach(([label, val], idx) => {
      const y = metricsTop + idx * 150;
      ctx.fillStyle = "#E8DFD1";
      ctx.fillRect(72, y, width - 144, 120);
      ctx.fillStyle = "#5C5346";
      ctx.font = "600 24px monospace";
      ctx.fillText(label, 100, y + 44, width - 200);
      ctx.fillStyle = "#14110F";
      ctx.font = "bold 42px monospace";
      ctx.fillText(val, 100, y + 96);
    });
  }

  // Footer attribution & QR matrix on Story card
  ctx.fillStyle = "#5C5346";
  ctx.font = "600 24px monospace";
  ctx.fillText(
    tr("share.card.pngDataLine", {
      provider: result.source.provider,
      retrievedAt: result.source.retrievedAt,
    }),
    72,
    height - 110,
    width - 280,
  );
  if (shortUrl) {
    ctx.fillStyle = "#14110F";
    ctx.fillText(shortUrl.slice(0, 48), 72, height - 68);
  }
  if (aspect === "story") {
    const qr = buildQrMatrix(shortUrl ?? result.location.label);
    const cellPx = 8;
    const qrX = width - 72 - qr.length * cellPx;
    const qrY = height - 145;
    ctx.strokeStyle = "#14110F";
    ctx.lineWidth = 2;
    ctx.strokeRect(qrX - 6, qrY - 6, qr.length * cellPx + 12, qr.length * cellPx + 12);
    ctx.fillStyle = "#14110F";
    qr.forEach((row, r) => {
      row.forEach((on, c) => {
        if (on) {
          ctx.fillRect(qrX + c * cellPx, qrY + r * cellPx, cellPx, cellPx);
        }
      });
    });
  }

  const link = document.createElement("a");
  const slug = result.location.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  link.download = `geotrend-${slug}-${result.variable.toLowerCase()}-${aspect}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function triggerPngDownload(
  canvas: HTMLCanvasElement,
  result: InvestigationResult,
  aspectSlug: string,
): void {
  const link = document.createElement("a");
  const slug = result.location.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  link.download = `geotrend-${slug}-${result.variable.toLowerCase()}-${aspectSlug}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
}

function drawFigureChartGeometry(
  ctx: CanvasRenderingContext2D,
  geometry: FigureChartGeometry,
  chartLeft: number,
  chartTop: number,
): void {
  ctx.save();
  ctx.translate(chartLeft, chartTop);

  ctx.font = "400 20px Arial, Helvetica, sans-serif";
  ctx.textAlign = "left";
  for (const g of geometry.gridLines) {
    ctx.strokeStyle = g.isZero ? "#9CA3AF" : "#E5E7EB";
    ctx.lineWidth = 1;
    ctx.setLineDash(g.isZero ? [4, 4] : []);
    ctx.beginPath();
    ctx.moveTo(0, g.y);
    ctx.lineTo(geometry.width, g.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#9CA3AF";
    ctx.fillText(g.label, 0, Math.max(14, g.y - 6));
  }

  if (geometry.ciBand) {
    ctx.fillStyle = "rgba(193, 71, 46, 0.12)";
    ctx.beginPath();
    geometry.ciBand.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  geometry.trend.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 4;
  ctx.beginPath();
  geometry.observed.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "#9CA3AF";
  ctx.font = "400 20px Arial, Helvetica, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(geometry.xLabels.first.label, geometry.xLabels.first.x, geometry.height - 4);
  ctx.textAlign = "right";
  ctx.fillText(geometry.xLabels.last.label, geometry.xLabels.last.x, geometry.height - 4);
  ctx.textAlign = "left";

  ctx.restore();
}

/** Draws the minimalist Figure aspect (plain white background, line+trend chart, clearly
 * separated provenance line + plain-language summary, small source/brand footer) to canvas and
 * downloads it. Shares its design 1:1 with `FigureCard`'s DOM preview. */
function drawFigurePng(
  result: InvestigationResult,
  tempUnit: TemperatureUnit,
  locale: Locale,
): void {
  const tr = (key: string, params?: Record<string, string | number>) =>
    translateForLocale(locale, key, params);
  const display = convertInvestigationResultForDisplay(result, tempUnit);
  const { location, variable, season, stats, series, source } = display;
  const unitSuffix = getDisplayUnitLabel(display.unit, tempUnit);

  const width = 1500;
  const height = 1000;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#111827";
  ctx.font = "600 38px Arial, Helvetica, sans-serif";
  ctx.fillText(
    `${location.label} — ${tr(`variables.${variable}.label`)} (${tr(`seasons.${season}`)})`,
    70,
    90,
    width - 140,
  );

  ctx.fillStyle = "#6B7280";
  ctx.font = "400 22px Arial, Helvetica, sans-serif";
  ctx.fillText(
    `${stats.startYear}–${stats.endYear} (n=${stats.nYears}) · ${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}° · ${variable}`,
    70,
    130,
    width - 140,
  );

  const headline = tr(`verdict.sentence.${stats.direction}`, {
    variable: tr(`variables.${variable}.label`),
    season: tr(`seasons.${season}`),
    location: location.label,
    totalChange: Math.abs(stats.totalChangeOverPeriod).toFixed(1),
    unit: unitSuffix,
    startYear: stats.startYear,
    endYear: stats.endYear,
    perDecade: Math.abs(stats.senSlopePerDecade).toFixed(1),
    pValue: stats.pValue < 0.001 ? "< 0.001" : stats.pValue.toFixed(3),
  });
  ctx.fillStyle = "#374151";
  ctx.font = "400 26px Arial, Helvetica, sans-serif";
  wrapCanvasText(ctx, headline, 70, 174, width - 140, 34);

  const chartLeft = 70;
  const chartTop = 260;
  const chartWidth = width - 140;
  const chartHeight = 560;
  const geometry = buildFigureChartGeometry(series, stats, (v) => v.toFixed(1), {
    width: chartWidth,
    height: chartHeight,
    padLeft: 80,
    padRight: 20,
    padTop: 10,
    padBottom: 40,
  });
  if (geometry) {
    drawFigureChartGeometry(ctx, geometry, chartLeft, chartTop);
  }

  const footerTop = chartTop + chartHeight + 60;
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "400 20px Arial, Helvetica, sans-serif";
  ctx.fillText(
    `${tr("share.card.sourcePrefix")} ${source.provider} · ${tr("share.card.retrievedPrefix")} ${source.retrievedAt}`,
    70,
    footerTop,
    width - 180,
  );
  ctx.font = "italic 18px Arial, Helvetica, sans-serif";
  wrapCanvasText(ctx, tr("verdict.causationNote"), 70, footerTop + 32, width - 220, 24);

  drawBrandMarkOnCanvas(ctx, { x: width - 70, y: height - 60, size: 26, tone: "paper" });

  triggerPngDownload(canvas, result, "figure");
}
