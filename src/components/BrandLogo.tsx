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
 * Shared verbatim between the React SVG component and Canvas 2D exporters.
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

const TREND_PATH_D = BRAND_MARK_GEOMETRY.trendPoints
  .map(([px, py], idx) => `${idx === 0 ? "M" : "L"}${px} ${py}`)
  .join(" ");

export interface DrawBrandMarkCanvasOptions {
  x: number;
  y: number;
  size: number;
  tone?: BrandTone;
}

/**
 * Renders the "Geo + Trend" vector seal directly onto an HTML5 2D Canvas
 * using the exact same geometry and editorial palette as <BrandLogo />.
 */
export function drawBrandMarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  { x, y, size, tone = "paper" }: DrawBrandMarkCanvasOptions,
): void {
  const palette = BRAND_PALETTE[tone];
  const scale = size / BRAND_MARK_GEOMETRY.viewBoxSize;
  const px = (coord: number) => x + coord * scale;
  const py = (coord: number) => y + coord * scale;
  const sw = (stroke: number) => Math.max(1, stroke * scale);

  const { globe, equator, meridian, trendPoints, trendStrokeWidth, terminalDot } =
    BRAND_MARK_GEOMETRY;

  ctx.save();

  // Graticule equator + elliptical meridian beneath the outer ring & trend curve
  ctx.strokeStyle = palette.graticule;
  ctx.lineWidth = sw(equator.strokeWidth);
  ctx.beginPath();
  ctx.moveTo(px(equator.x1), py(equator.y1));
  ctx.lineTo(px(equator.x2), py(equator.y2));
  ctx.stroke();

  ctx.lineWidth = sw(meridian.strokeWidth);
  ctx.beginPath();
  ctx.ellipse(
    px(meridian.cx),
    py(meridian.cy),
    meridian.rx * scale,
    meridian.ry * scale,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  // Outer planetary circumference
  ctx.strokeStyle = palette.ring;
  ctx.lineWidth = sw(globe.strokeWidth);
  ctx.beginPath();
  ctx.arc(px(globe.cx), py(globe.cy), globe.r * scale, 0, Math.PI * 2);
  ctx.stroke();

  // Ascending terracotta Sen's slope breakout trend line
  ctx.strokeStyle = palette.trend;
  ctx.lineWidth = sw(trendStrokeWidth);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  trendPoints.forEach(([tx, ty], index) => {
    if (index === 0) {
      ctx.moveTo(px(tx), py(ty));
    } else {
      ctx.lineTo(px(tx), py(ty));
    }
  });
  ctx.stroke();

  // Terminal anomalous observation node
  ctx.fillStyle = palette.trend;
  ctx.beginPath();
  ctx.arc(px(terminalDot.cx), py(terminalDot.cy), terminalDot.r * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export interface BrandLogoProps {
  variant?: BrandLogoVariant;
  tone?: BrandTone;
  size?: number;
  label?: string;
  title?: string;
  decorative?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

function BrandMarkSvg({
  tone,
  size,
  title,
  decorative,
}: {
  tone: BrandTone;
  size: number;
  title: string;
  decorative: boolean;
}) {
  const palette = BRAND_PALETTE[tone];
  const { viewBoxSize, globe, equator, meridian, trendStrokeWidth, terminalDot } =
    BRAND_MARK_GEOMETRY;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      fill="none"
      className="shrink-0"
      aria-hidden={decorative ? "true" : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
    >
      <title>{title}</title>
      <line
        x1={equator.x1}
        y1={equator.y1}
        x2={equator.x2}
        y2={equator.y2}
        stroke={palette.graticule}
        strokeWidth={equator.strokeWidth}
      />
      <ellipse
        cx={meridian.cx}
        cy={meridian.cy}
        rx={meridian.rx}
        ry={meridian.ry}
        stroke={palette.graticule}
        strokeWidth={meridian.strokeWidth}
      />
      <circle
        cx={globe.cx}
        cy={globe.cy}
        r={globe.r}
        stroke={palette.ring}
        strokeWidth={globe.strokeWidth}
      />
      <path
        d={TREND_PATH_D}
        stroke={palette.trend}
        strokeWidth={trendStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={terminalDot.cx} cy={terminalDot.cy} r={terminalDot.r} fill={palette.trend} />
    </svg>
  );
}

/**
 * Reusable Dark Editorial GeoTrend mark and Playfair Display wordmark.
 */
export function BrandLogo({
  variant = "wordmark",
  tone = "dark",
  size,
  label = "GeoTrend",
  title = "GeoTrend",
  decorative,
  className = "",
  wordmarkClassName = "font-display text-base font-semibold tracking-tight sm:text-lg",
}: BrandLogoProps) {
  const resolvedSize = size ?? (variant === "mark" ? 24 : 26);

  if (variant === "mark") {
    return (
      <BrandMarkSvg
        tone={tone}
        size={resolvedSize}
        title={title}
        decorative={decorative ?? false}
      />
    );
  }

  const palette = BRAND_PALETTE[tone];

  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <BrandMarkSvg tone={tone} size={resolvedSize} title={title} decorative={true} />
      <span className={wordmarkClassName} style={{ color: palette.text }}>
        {label}
      </span>
    </span>
  );
}
