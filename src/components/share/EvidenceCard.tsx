import { type Locale, translateForLocale, useResolvedI18n } from "../../i18n/i18n.tsx";
import { useOptionalTemperatureUnit } from "../../i18n/temperatureUnit.tsx";
import {
  convertDeltaValue,
  getEvidenceUnitSuffix,
  type TemperatureUnit,
} from "../../lib/temperatureUnit.ts";
import type { InvestigationResult } from "../../types/investigation.ts";
import { ClimateStripes, getStripeColor } from "./ClimateStripes.tsx";

export type EvidenceCardAspect = "story" | "square";

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

function buildQrMatrix(seedText: string, size = 11): boolean[][] {
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
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#5C5346]">
          <span>{t("share.card.headerLabel")}</span>
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

  // Header metadata
  ctx.fillStyle = "#5C5346";
  ctx.font = "600 26px monospace";
  ctx.fillText(tr("share.card.pngHeaderLabel"), 72, 100);
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
