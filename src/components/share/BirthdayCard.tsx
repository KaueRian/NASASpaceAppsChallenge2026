import { DIRECTION_BG, DIRECTION_HEX } from "../../lib/resultDisplay.ts";
import type { BirthdayResult } from "../../types/birthday.ts";
import type { VariableUnit } from "../../types/investigation.ts";
import { ClimateStripes, getStripeColor } from "./ClimateStripes.tsx";

const CREAM = "#FBF6EC";

export interface BirthdayCardCopy {
  /** Pre-localized, first-person tag line, e.g. "SINCE I WAS BORN · SÃO PAULO, 1998" — written in
   * the voice of whoever is posting the card, so any viewer immediately understands it's a
   * personal story (not "my climate" as a generic app-voice label). */
  tagline: string;
  /** e.g. "October 14, 1990" / "14 de outubro de 1990" — the exact birth date, shown as a caption. */
  fullBirthDate: string;
  /** Pre-localized "every {month}" phrase, e.g. `t("explore.timeline.cardEveryMonth", {month})`. */
  monthlyLabel: string;
  /** Short phrase under the giant stat answering "+1.4°C — of what?", e.g. "warmer since 1990" /
   * "mais quente desde 1990" (`t("explore.timeline.statCaption.<direction>", {startYear})`). */
  statCaption: string;
  headlineText: string;
  badgeLabel: string;
  /** Plain-language explainer for the anomaly-stripes chart, e.g. "Each bar is one year —
   * stronger colors mark the years furthest from normal." (`t("explore.timeline.chartCaption")`). */
  chartCaption: string;
}

export interface BirthdayCardProps extends BirthdayCardCopy {
  result: BirthdayResult;
}

function formatSigned(value: number, unit: VariableUnit): string {
  const sign = value > 0 ? "+" : "";
  const suffix = unit === "C" ? "°C" : unit === "mm" ? " mm" : " pts (%)";
  return `${sign}${value.toFixed(1)}${suffix}`;
}

/** Shareable Wrapped-style card: one giant stat (with a plain-language caption explaining what it
 * means), one sentence, a briefly-explained chart, minimal footer — built for Instagram Stories
 * and for laypeople, not a technical report (the full stats live in "Modo Detetive" instead). */
export function BirthdayCard({
  result,
  tagline,
  fullBirthDate,
  monthlyLabel,
  statCaption,
  headlineText,
  badgeLabel,
  chartCaption,
}: BirthdayCardProps) {
  const { headline, location, effectiveStartYear, endYear } = result;
  const bgClass = DIRECTION_BG[headline.stats.direction];

  return (
    <article
      className={`relative flex w-full max-w-[360px] flex-col justify-between gap-6 rounded-lg p-6 shadow-2xl sm:p-7 ${bgClass}`}
      style={{ color: CREAM, minHeight: 420 }}
    >
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
          EarthTrend Detective
        </p>
        <p className="mt-2 font-display text-lg font-extrabold uppercase leading-snug tracking-tight">
          {tagline}
        </p>
        <p className="mt-1 font-mono text-xs opacity-80">{fullBirthDate}</p>
      </header>

      <div className="space-y-3">
        <div>
          <p className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
            {formatSigned(headline.stats.totalChangeOverPeriod, headline.unit)}
          </p>
          <p className="mt-1 font-sans text-sm opacity-90">{statCaption}</p>
        </div>
        <p className="max-w-[280px] font-sans text-sm leading-snug sm:text-base">{headlineText}</p>
        <span className="inline-block border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest opacity-90">
          {badgeLabel}
        </span>
      </div>

      <div>
        <div className="rounded-sm bg-black/15 p-2">
          <ClimateStripes
            series={headline.series}
            variable={headline.variable}
            height={44}
            tone="dark"
          />
        </div>
        <p className="mt-2 font-sans text-[11px] leading-snug opacity-80">{chartCaption}</p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wide opacity-70">
          {location.label} · {effectiveStartYear}–{endYear} · {monthlyLabel}
        </p>
      </div>
    </article>
  );
}

/** Draws the Wrapped-style Birthday Card to a fresh off-screen canvas (shared by download and
 * native-share paths — the on-screen JSX preview above is a separate, independently-sized
 * renderer, so this fixed 1080×1920 export always comes out crisp regardless of viewport). */
function renderBirthdayCardCanvas(
  result: BirthdayResult,
  copy: BirthdayCardCopy,
): HTMLCanvasElement | null {
  const { headline, location, effectiveStartYear, endYear } = result;
  const {
    tagline,
    fullBirthDate,
    monthlyLabel,
    statCaption,
    headlineText,
    badgeLabel,
    chartCaption,
  } = copy;
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = DIRECTION_HEX[headline.stats.direction];
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = CREAM;

  ctx.globalAlpha = 0.7;
  ctx.font = "600 26px monospace";
  ctx.fillText("EARTHTREND DETECTIVE", 72, 120);
  ctx.globalAlpha = 1;

  ctx.font = "bold 46px Georgia, serif";
  wrapText(ctx, tagline.toUpperCase(), 72, 185, width - 144, 54);

  ctx.globalAlpha = 0.8;
  ctx.font = "500 30px monospace";
  ctx.fillText(fullBirthDate, 72, 255);
  ctx.globalAlpha = 1;

  ctx.font = "bold 150px Georgia, serif";
  ctx.fillText(formatSigned(headline.stats.totalChangeOverPeriod, headline.unit), 72, 560);

  ctx.globalAlpha = 0.85;
  ctx.font = "500 32px monospace";
  ctx.fillText(statCaption, 72, 615);
  ctx.globalAlpha = 1;

  ctx.font = "400 42px Georgia, serif";
  wrapText(ctx, headlineText, 72, 700, width - 144, 56);

  ctx.strokeStyle = CREAM;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 3;
  const badgeWidth = ctx.measureText(badgeLabel.toUpperCase()).width + 60;
  ctx.font = "600 28px monospace";
  ctx.strokeRect(72, 900, badgeWidth, 64);
  ctx.fillText(badgeLabel.toUpperCase(), 102, 942);
  ctx.globalAlpha = 1;

  const stripeTop = 1500;
  const stripeHeight = 220;
  const stripeAreaWidth = width - 144;
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(56, stripeTop - 24, stripeAreaWidth + 32, stripeHeight + 48);
  const barW = stripeAreaWidth / Math.max(1, headline.series.length);
  headline.series.forEach((pt, idx) => {
    ctx.fillStyle = getStripeColor(pt.zScore, headline.variable);
    ctx.fillRect(72 + idx * barW, stripeTop, Math.ceil(barW), stripeHeight);
  });

  ctx.fillStyle = CREAM;
  ctx.globalAlpha = 0.8;
  ctx.font = "400 24px monospace";
  wrapText(ctx, chartCaption, 72, stripeTop + stripeHeight + 50, width - 144, 32);
  ctx.globalAlpha = 1;

  ctx.fillStyle = CREAM;
  ctx.globalAlpha = 0.7;
  ctx.font = "600 24px monospace";
  ctx.fillText(
    `${location.label.slice(0, 32)} · ${effectiveStartYear}–${endYear} · ${monthlyLabel}`,
    72,
    height - 70,
  );
  ctx.globalAlpha = 1;

  return canvas;
}

function slugFor(result: BirthdayResult): string {
  const slug = result.location.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `earthtrend-birthday-${slug}-${result.headline.variable.toLowerCase()}`;
}

/** Renders the Wrapped-style Birthday Card and triggers a PNG download. */
export function downloadBirthdayCardPng(result: BirthdayResult, copy: BirthdayCardCopy): void {
  const canvas = renderBirthdayCardCanvas(result, copy);
  if (!canvas) return;
  const link = document.createElement("a");
  link.download = `${slugFor(result)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/**
 * Renders the Wrapped-style Birthday Card and opens the device's native share sheet (so it can
 * go straight to Instagram/WhatsApp/etc. as an image) via the Web Share API Level 2 file-sharing
 * support. Returns `false` when the platform doesn't support sharing files (desktop browsers,
 * mostly) or the user cancels, so the caller can fall back to a plain download.
 */
export async function shareBirthdayCardPng(
  result: BirthdayResult,
  copy: BirthdayCardCopy,
): Promise<boolean> {
  const canvas = renderBirthdayCardCanvas(result, copy);
  if (!canvas || typeof navigator === "undefined" || !("share" in navigator)) return false;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return false;

  const file = new File([blob], `${slugFor(result)}.png`, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (nav.canShare && !nav.canShare({ files: [file] })) return false;

  try {
    await navigator.share({
      files: [file],
      title: "EarthTrend Detective",
      text: copy.headlineText,
    });
    return true;
  } catch {
    return false; // user cancelled, or the platform refused
  }
}

function wrapText(
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
