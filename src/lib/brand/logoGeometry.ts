export type BrandLogoVariant = "mark" | "wordmark";
export type BrandTone = "dark" | "paper";

export const BRAND_PALETTE: Record<
  BrandTone,
  { ring: string; graticule: string; trend: string; text: string }
> = {
  dark: {
    ring: "#EDEDEA",
    graticule: "#9B9B98",
    trend: "#C1472E",
    text: "#EDEDEA",
  },
  paper: {
    ring: "#14110F",
    graticule: "#5C5346",
    trend: "#C1472E",
    text: "#14110F",
  },
};

/**
 * Canonical 32x32 coordinate geometry for the "Geo + Trend" emblem.
 * Shared verbatim across the React SVG component, HTML slide generator, and Canvas exporters.
 */
export const BRAND_MARK_GEOMETRY = {
  viewBoxSize: 32,
  globe: { cx: 15.2, cy: 16.8, r: 10.2, strokeWidth: 1.85 },
  equator: { x1: 5.2, y1: 16.8, x2: 25.2, y2: 16.8, strokeWidth: 1.2 },
  meridian: { cx: 15.2, cy: 16.8, rx: 4.7, ry: 10.2, strokeWidth: 1.2 },
  trendPoints: [
    [5.5, 22.5],
    [11.8, 17.2],
    [15.8, 18.8],
    [26.2, 6.2],
  ] as const,
  trendStrokeWidth: 2.5,
  terminalDot: { cx: 26.2, cy: 6.2, r: 2.6 },
} as const;

export const BRAND_TREND_PATH_D = BRAND_MARK_GEOMETRY.trendPoints
  .map(([px, py], idx) => `${idx === 0 ? "M" : "L"}${px} ${py}`)
  .join(" ");

export function renderBrandMarkElements(tone: BrandTone = "dark"): string {
  const palette = BRAND_PALETTE[tone];
  const { globe, equator, meridian, trendStrokeWidth, terminalDot } = BRAND_MARK_GEOMETRY;
  return `<line x1="${equator.x1}" y1="${equator.y1}" x2="${equator.x2}" y2="${equator.y2}" stroke="${palette.graticule}" stroke-width="${equator.strokeWidth}" />
  <ellipse cx="${meridian.cx}" cy="${meridian.cy}" rx="${meridian.rx}" ry="${meridian.ry}" stroke="${palette.graticule}" stroke-width="${meridian.strokeWidth}" />
  <circle cx="${globe.cx}" cy="${globe.cy}" r="${globe.r}" stroke="${palette.ring}" stroke-width="${globe.strokeWidth}" />
  <path d="${BRAND_TREND_PATH_D}" stroke="${palette.trend}" stroke-width="${trendStrokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="${terminalDot.cx}" cy="${terminalDot.cy}" r="${terminalDot.r}" fill="${palette.trend}" />`;
}

export function renderBrandMarkSvg(options?: {
  size?: number;
  tone?: BrandTone;
  className?: string;
  decorative?: boolean;
}): string {
  const size = options?.size ?? 32;
  const tone = options?.tone ?? "dark";
  const { viewBoxSize } = BRAND_MARK_GEOMETRY;
  const classAttr = options?.className ? ` class="${options.className}"` : "";
  const ariaAttr =
    options?.decorative === false ? ' role="img" aria-label="GeoTrend"' : ' aria-hidden="true"';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${size}" height="${size}" fill="none"${classAttr}${ariaAttr}>
  ${renderBrandMarkElements(tone)}
</svg>`;
}
