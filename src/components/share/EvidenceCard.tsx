import { type Locale, translateForLocale, useResolvedI18n } from "../../i18n/i18n.tsx";
import { useOptionalTemperatureUnit } from "../../i18n/temperatureUnit.tsx";
import {
  convertDeltaValue,
  getEvidenceUnitSuffix,
  type TemperatureUnit,
} from "../../lib/temperatureUnit.ts";
import type { InvestigationResult } from "../../types/investigation.ts";
import { BrandLogo, drawBrandMarkOnCanvas } from "../BrandLogo.tsx";
import { ClimateStripes, getStripeColor } from "./ClimateStripes.tsx";

export type EvidenceCardAspect = "story" | "square" | "slide" | "paper";

export interface EvidenceCardProps {
  result: InvestigationResult;
  aspect?: EvidenceCardAspect;
  shortUrl?: string;
  locale?: Locale;
  tempUnit?: TemperatureUnit;
}

interface AcademicCardStats {
  totalShift: string;
  senSlope: string;
  senSlopeCi: string | null;
  pFormatted: string;
  mkStats: string;
  rSquared: string;
  sampleSize: string;
  confidence: string;
  coordinates: string;
}

function buildAcademicCardStats(
  result: InvestigationResult,
  tempUnit: TemperatureUnit,
  tr: (key: string, params?: Record<string, string | number>) => string,
): AcademicCardStats {
  const { location, unit, stats } = result;
  const pFormatted = stats.pValue < 0.0001 ? "< 0.0001" : stats.pValue.toFixed(4);
  const unitSuffix = getEvidenceUnitSuffix(unit, tempUnit).trim();
  const hasCi =
    stats.senSlopeCiLowerPerDecade !== undefined && stats.senSlopeCiUpperPerDecade !== undefined;

  const senSlopeCi = hasCi
    ? tr("share.card.senSlopeCi", {
        low: convertDeltaValue(stats.senSlopeCiLowerPerDecade as number, unit, tempUnit).toFixed(2),
        high: convertDeltaValue(stats.senSlopeCiUpperPerDecade as number, unit, tempUnit).toFixed(
          2,
        ),
        unit: unitSuffix,
      })
    : null;

  const rSquared =
    typeof stats.rSquared === "number" && Number.isFinite(stats.rSquared)
      ? stats.rSquared.toFixed(3)
      : "—";

  return {
    totalShift: formatSigned(stats.totalChangeOverPeriod, unit, tempUnit),
    senSlope: formatSigned(stats.senSlopePerDecade, unit, tempUnit),
    senSlopeCi,
    pFormatted,
    mkStats: tr("share.card.mannKendallStats", {
      s: stats.mannKendallS,
      z: stats.zScore.toFixed(2),
      p: pFormatted,
    }),
    rSquared,
    sampleSize: tr("share.card.sampleYearsValue", { n: stats.nYears }),
    confidence:
      stats.confidenceLevel > 0 ? `${stats.confidenceLevel}%` : tr("share.card.inconclusive"),
    coordinates: `${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°`,
  };
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
  const { location, variable, unit, season, stats, series, source } = result;
  const isStory = aspect === "story";
  const isSlide = aspect === "slide";
  const isPaper = aspect === "paper";
  const isWideAcademic = isSlide || isPaper;

  const stampColor = isPaper
    ? "#111111"
    : stats.verdict === "STRONG_EVIDENCE"
      ? "#C83E2B"
      : stats.verdict === "EVIDENCE_CONFIRMED"
        ? "#D4A84F"
        : "#5C5346";
  const qrLabel = t("share.card.qrAriaLabel");
  const academicStats = buildAcademicCardStats(result, resolvedTempUnit, t);

  const surfaceClass = isPaper
    ? "border-[#111111] bg-white text-[#111111]"
    : "border-[#14110F] bg-[#F4EFE6] text-[#14110F]";
  const mutedTextClass = isPaper ? "text-[#3D3D3D]" : "text-[#5C5346]";
  const borderMutedClass = isPaper ? "border-[#111111]/25" : "border-[#14110F]/20";
  const statCellClass = isPaper
    ? "rounded-none border border-[#111111]/25 bg-[#F8F8F8] p-2"
    : "rounded bg-[#E8DFD1] p-2";
  const aspectSizeClass = isStory
    ? "aspect-[9/16] w-full max-w-[360px]"
    : isSlide
      ? "aspect-video w-full max-w-[680px]"
      : isPaper
        ? "aspect-[16/10] w-full max-w-[680px]"
        : "aspect-square w-full max-w-[380px]";

  return (
    <article
      data-aspect={aspect}
      className={`relative flex flex-col justify-between rounded-sm border-2 p-6 shadow-xl ${surfaceClass} ${aspectSizeClass}`}
    >
      <header className={`border-b pb-3 ${borderMutedClass}`}>
        <div
          className={`flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest ${mutedTextClass}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <BrandLogo variant="mark" tone="paper" size={16} decorative />
            <span>{isPaper ? t("share.card.academicHeader") : t("share.card.headerLabel")}</span>
          </span>
          <span>
            {stats.startYear}–{stats.endYear}
          </span>
        </div>
        <h3 className="mt-1 font-serif text-xl font-bold leading-tight">
          {isPaper
            ? t("share.card.figureCaption", {
                location: location.label,
                startYear: stats.startYear,
                endYear: stats.endYear,
              })
            : location.label}
        </h3>
        <p className={`font-mono text-xs ${mutedTextClass}`}>
          {t(`variables.${variable}.label`)} ({variable}) · {t(`seasons.${season}`)}
        </p>
      </header>

      <div className="my-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span
              className={`block font-mono text-[10px] uppercase tracking-wider ${mutedTextClass}`}
            >
              {t("share.card.totalShiftDom", { nYears: stats.nYears })}
            </span>
            <span className="font-mono text-3xl font-extrabold tracking-tight">
              {academicStats.totalShift}
            </span>
          </div>
          <span
            className={`${isPaper ? "" : "rotate-[-4deg]"} border-2 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-widest`}
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
          height={isStory ? 72 : isWideAcademic ? 50 : 48}
        />

        {isStory && (
          <dl className="grid grid-cols-2 gap-2 border-t border-[#14110F]/15 pt-3 font-mono text-xs">
            <div className="rounded bg-[#E8DFD1] p-2">
              <dt className="text-[10px] uppercase text-[#5C5346]">
                {t("share.card.senSlopeDom")}
              </dt>
              <dd className="mt-0.5 font-bold">{academicStats.senSlope}</dd>
            </div>
            <div className="rounded bg-[#E8DFD1] p-2">
              <dt className="text-[10px] uppercase text-[#5C5346]">
                {t("share.card.mannKendallPValue")}
              </dt>
              <dd className="mt-0.5 font-bold">p = {academicStats.pFormatted}</dd>
            </div>
            <div className="rounded bg-[#E8DFD1] p-2">
              <dt className="text-[10px] uppercase text-[#5C5346]">
                {t("share.card.confidenceDom")}
              </dt>
              <dd className="mt-0.5 font-bold">{academicStats.confidence}</dd>
            </div>
            <div className="rounded bg-[#E8DFD1] p-2">
              <dt className="text-[10px] uppercase text-[#5C5346]">
                {t("share.card.coordinates")}
              </dt>
              <dd className="mt-0.5 font-bold">{academicStats.coordinates}</dd>
            </div>
          </dl>
        )}

        {isWideAcademic && (
          <dl
            className={`grid grid-cols-2 gap-2 border-t pt-2.5 font-mono text-[11px] sm:grid-cols-4 ${borderMutedClass}`}
          >
            <div className={statCellClass}>
              <dt className={`text-[9px] uppercase ${mutedTextClass}`}>
                {t("share.card.senSlopeDom")}
              </dt>
              <dd className="mt-0.5 font-bold">{academicStats.senSlope}</dd>
              {academicStats.senSlopeCi && (
                <dd className={`mt-0.5 text-[9px] ${mutedTextClass}`}>
                  {academicStats.senSlopeCi}
                </dd>
              )}
            </div>
            <div className={statCellClass}>
              <dt className={`text-[9px] uppercase ${mutedTextClass}`}>
                {t("share.card.mannKendallPValue")}
              </dt>
              <dd className="mt-0.5 font-bold">p = {academicStats.pFormatted}</dd>
              <dd className={`mt-0.5 text-[9px] ${mutedTextClass}`}>{academicStats.mkStats}</dd>
            </div>
            <div className={statCellClass}>
              <dt className={`text-[9px] uppercase ${mutedTextClass}`}>
                {t("share.card.rSquaredLabel")} · {t("share.card.sampleSizeLabel")}
              </dt>
              <dd className="mt-0.5 font-bold">R² = {academicStats.rSquared}</dd>
              <dd className={`mt-0.5 text-[9px] ${mutedTextClass}`}>{academicStats.sampleSize}</dd>
            </div>
            <div className={statCellClass}>
              <dt className={`text-[9px] uppercase ${mutedTextClass}`}>
                {t("share.card.confidenceDom")}
              </dt>
              <dd className="mt-0.5 font-bold">{academicStats.confidence}</dd>
              <dd className={`mt-0.5 text-[9px] ${mutedTextClass}`}>{academicStats.coordinates}</dd>
            </div>
          </dl>
        )}
      </div>

      <footer
        className={`border-t pt-2 font-mono text-[10px] ${borderMutedClass} ${mutedTextClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <div>
              {t("share.card.sourcePrefix")} {source.provider} · {t("share.card.retrievedPrefix")}{" "}
              {source.retrievedAt}
            </div>
            {isWideAcademic && (
              <div className="text-[9px] leading-snug">{t("share.card.causationCaveat")}</div>
            )}
            {shortUrl && (
              <div className={`truncate ${isPaper ? "text-[#111111]" : "text-[#14110F]"}`}>
                {shortUrl}
              </div>
            )}
          </div>
          {(isStory || isWideAcademic) && (
            <svg
              viewBox="0 0 11 11"
              className={`h-10 w-10 shrink-0 border p-0.5 ${isPaper ? "border-[#111111] bg-white" : "border-[#14110F] bg-[#F4EFE6]"}`}
              role="img"
              aria-label={qrLabel}
            >
              <title>{qrLabel}</title>
              {buildQrCells(shortUrl ?? location.label).map((cell) => (
                <rect
                  key={cell.id}
                  x={cell.x}
                  y={cell.y}
                  width={1}
                  height={1}
                  fill={isPaper ? "#111111" : "#14110F"}
                />
              ))}
            </svg>
          )}
        </div>
      </footer>
    </article>
  );
}

export function getEvidenceCardCanvasDimensions(aspect: EvidenceCardAspect): {
  width: number;
  height: number;
} {
  switch (aspect) {
    case "slide":
      return { width: 1920, height: 1080 };
    case "paper":
      return { width: 1600, height: 1000 };
    case "square":
      return { width: 1080, height: 1080 };
    default:
      return { width: 1080, height: 1920 };
  }
}

function drawQrCodeOnCanvas(
  ctx: CanvasRenderingContext2D,
  seedText: string,
  qrX: number,
  qrY: number,
  cellPx: number,
  inkColor: string,
): void {
  const qr = buildQrMatrix(seedText);
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(qrX - 6, qrY - 6, qr.length * cellPx + 12, qr.length * cellPx + 12);
  ctx.fillStyle = inkColor;
  qr.forEach((row, r) => {
    row.forEach((on, c) => {
      if (on) {
        ctx.fillRect(qrX + c * cellPx, qrY + r * cellPx, cellPx, cellPx);
      }
    });
  });
}

function drawWideAcademicCardOnCanvas(
  ctx: CanvasRenderingContext2D,
  options: {
    result: InvestigationResult;
    aspect: "slide" | "paper";
    width: number;
    height: number;
    shortUrl?: string;
    academicStats: AcademicCardStats;
    tr: (key: string, params?: Record<string, string | number>) => string;
  },
): void {
  const { result, aspect, width, height, shortUrl, academicStats, tr } = options;
  const isPaper = aspect === "paper";

  const palette = isPaper
    ? {
        bg: "#FFFFFF",
        ink: "#111111",
        muted: "#3D3D3D",
        cellBg: "#F4F4F4",
        hairline: "rgba(17, 17, 17, 0.25)",
        stamp: "#111111",
      }
    : {
        bg: "#F4EFE6",
        ink: "#14110F",
        muted: "#5C5346",
        cellBg: "#E8DFD1",
        hairline: "rgba(20, 17, 15, 0.22)",
        stamp:
          result.stats.verdict === "STRONG_EVIDENCE"
            ? "#C83E2B"
            : result.stats.verdict === "EVIDENCE_CONFIRMED"
              ? "#D4A84F"
              : "#5C5346",
      };

  const padX = isPaper ? 68 : 80;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = isPaper ? 5 : 8;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  // Header metadata + brand seal
  drawBrandMarkOnCanvas(ctx, { x: padX, y: 56, size: 34, tone: "paper" });
  ctx.fillStyle = palette.muted;
  ctx.font = "600 22px monospace";
  ctx.fillText(
    isPaper ? tr("share.card.academicHeader") : tr("share.card.pngHeaderLabel"),
    padX + 46,
    80,
  );
  ctx.fillText(`${result.stats.startYear}–${result.stats.endYear}`, width - padX - 150, 80);

  // Title + subtitle
  ctx.fillStyle = palette.ink;
  ctx.font = isPaper ? "bold 46px Georgia, serif" : "bold 54px Georgia, serif";
  const headlineTitle = isPaper
    ? tr("share.card.figureCaption", {
        location: result.location.label.slice(0, 34),
        startYear: result.stats.startYear,
        endYear: result.stats.endYear,
      })
    : result.location.label.slice(0, 38);
  ctx.fillText(headlineTitle, padX, 148, width - padX * 2);

  ctx.fillStyle = palette.muted;
  ctx.font = "500 24px monospace";
  ctx.fillText(
    `${tr(`variables.${result.variable}.label`)} (${result.variable}) · ${tr(`seasons.${result.season}`)}`,
    padX,
    190,
    width - padX * 2,
  );

  // Shift metric + verdict stamp row
  ctx.fillStyle = palette.muted;
  ctx.font = "600 20px monospace";
  ctx.fillText(tr("share.card.totalShiftPng", { nYears: result.stats.nYears }), padX, 248);

  ctx.fillStyle = palette.ink;
  ctx.font = isPaper ? "bold 68px monospace" : "bold 76px monospace";
  ctx.fillText(academicStats.totalShift, padX, 320);

  const verdictStamp = tr(`share.card.verdictShort.${result.stats.verdict}`);
  ctx.save();
  ctx.font = "bold 24px monospace";
  const stampWidth = Math.max(300, Math.ceil(ctx.measureText(verdictStamp).width) + 40);
  ctx.translate(width - padX - stampWidth, 250);
  if (!isPaper) ctx.rotate(-0.04);
  ctx.strokeStyle = palette.stamp;
  ctx.lineWidth = isPaper ? 4 : 5;
  ctx.strokeRect(0, 0, stampWidth, 64);
  ctx.fillStyle = palette.stamp;
  ctx.fillText(verdictStamp, 20, 41);
  ctx.restore();

  // Full-width Climate Stripes
  const stripeTop = 362;
  const stripeHeight = isPaper ? 185 : 215;
  const stripeWidth = width - padX * 2;
  const barW = stripeWidth / Math.max(1, result.series.length);
  result.series.forEach((pt, idx) => {
    ctx.fillStyle = getStripeColor(pt.zScore, result.variable);
    ctx.fillRect(padX + idx * barW, stripeTop, Math.ceil(barW), stripeHeight);
  });
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(padX, stripeTop, stripeWidth, stripeHeight);

  // 4-column statistical provenance bar
  const gridTop = stripeTop + stripeHeight + 34;
  const colGap = 20;
  const colW = (stripeWidth - colGap * 3) / 4;
  const colH = isPaper ? 168 : 184;

  const cards: Array<{ label: string; value: string; sub: string }> = [
    {
      label: tr("share.card.senSlopeDom"),
      value: academicStats.senSlope,
      sub: academicStats.senSlopeCi ?? "",
    },
    {
      label: tr("share.card.mannKendallPValue"),
      value: `p = ${academicStats.pFormatted}`,
      sub: academicStats.mkStats,
    },
    {
      label: `${tr("share.card.rSquaredLabel")} · ${tr("share.card.sampleSizeLabel")}`,
      value: `R² = ${academicStats.rSquared}`,
      sub: academicStats.sampleSize,
    },
    {
      label: tr("share.card.confidenceDom"),
      value: academicStats.confidence,
      sub: academicStats.coordinates,
    },
  ];

  cards.forEach((card, idx) => {
    const cx = padX + idx * (colW + colGap);
    ctx.fillStyle = palette.cellBg;
    ctx.fillRect(cx, gridTop, colW, colH);
    ctx.strokeStyle = palette.hairline;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx, gridTop, colW, colH);

    ctx.fillStyle = palette.muted;
    ctx.font = "600 18px monospace";
    ctx.fillText(card.label, cx + 18, gridTop + 36, colW - 36);

    ctx.fillStyle = palette.ink;
    ctx.font = "bold 32px monospace";
    ctx.fillText(card.value, cx + 18, gridTop + 88, colW - 36);

    if (card.sub) {
      ctx.fillStyle = palette.muted;
      ctx.font = "500 17px monospace";
      ctx.fillText(card.sub, cx + 18, gridTop + 132, colW - 36);
    }
  });

  // Footer provenance + causation caveat + QR
  const qrSizePx = 8;
  const qrX = width - padX - 11 * qrSizePx;
  const qrY = height - 150;
  drawQrCodeOnCanvas(ctx, shortUrl ?? result.location.label, qrX, qrY, qrSizePx, palette.ink);

  const footerMaxW = qrX - padX - 40;
  ctx.fillStyle = palette.muted;
  ctx.font = "600 20px monospace";
  ctx.fillText(
    tr("share.card.pngDataLine", {
      provider: result.source.provider,
      retrievedAt: result.source.retrievedAt,
    }),
    padX,
    height - 122,
    footerMaxW,
  );
  ctx.font = "500 18px monospace";
  ctx.fillText(tr("share.card.causationCaveat"), padX, height - 90, footerMaxW);
  if (shortUrl) {
    ctx.fillStyle = palette.ink;
    ctx.fillText(shortUrl.slice(0, 72), padX, height - 58, footerMaxW);
  }
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
  if (typeof document === "undefined") return;
  const tr = (key: string, params?: Record<string, string | number>) =>
    translateForLocale(locale, key, params);
  const { width, height } = getEvidenceCardCanvasDimensions(aspect);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const academicStats = buildAcademicCardStats(result, tempUnit, tr);

  if (aspect === "slide" || aspect === "paper") {
    drawWideAcademicCardOnCanvas(ctx, {
      result,
      aspect,
      width,
      height,
      shortUrl,
      academicStats,
      tr,
    });
  } else {
    // Paper background & forensic border (Story 9:16 & Square 1:1)
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
    ctx.fillText(academicStats.totalShift, 72, 425);

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
        [tr("share.card.senSlopePng"), academicStats.senSlope],
        [tr("share.card.mannKendallPValue"), `p = ${academicStats.pFormatted}`],
        [tr("share.card.confidencePng"), academicStats.confidence],
        [tr("share.card.coordinates"), academicStats.coordinates],
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
      const cellPx = 8;
      drawQrCodeOnCanvas(
        ctx,
        shortUrl ?? result.location.label,
        width - 72 - 11 * cellPx,
        height - 145,
        cellPx,
        "#14110F",
      );
    }
  }

  const link = document.createElement("a");
  const slug = result.location.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  link.download = `geotrend-${slug}-${result.variable.toLowerCase()}-${aspect}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
