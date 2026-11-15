import { type Locale, translateForLocale } from "../../i18n/translate.ts";
import {
  buildNasaGibsTileUrl,
  type GibsLayerId,
  latLonToTileXY,
  TILE_OFFSETS,
} from "../../lib/gibs.ts";
import type { LocationInfo } from "../../types/investigation.ts";
import { drawBrandMarkOnCanvas } from "../BrandLogo.tsx";

export interface SatellitePngExportOptions {
  location: LocationInfo;
  layer: GibsLayerId;
  mode: "compare" | "timelapse";
  beforeYear: number;
  afterYear: number;
  selectedYear: number;
  zoom: number;
  locale?: Locale;
  shareUrl?: string;
  /** Optional test hook to bypass network image fetching in unit tests. */
  loadTileFn?: (url: string) => Promise<CanvasImageSource | null>;
}

export interface SatellitePngExportResult {
  usedFallback: boolean;
  filename: string;
  width: number;
  height: number;
  loadedTiles: number;
  totalTiles: number;
}

const TILE_SIZE = 256;
const TILE_TIMEOUT_MS = 4500;

/**
 * Generates a normalized, descriptive filename for downloaded NASA GIBS figures.
 */
export function buildSatellitePngFilename(
  locationLabel: string,
  layer: GibsLayerId,
  mode: "compare" | "timelapse",
  beforeYear: number,
  afterYear: number,
  selectedYear: number,
): string {
  const safeName = locationLabel
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const layerToken = layer === "MODIS_Terra_L3_NDVI_Monthly" ? "ndvi" : "truecolor";
  const periodToken = mode === "compare" ? `${beforeYear}-vs-${afterYear}` : String(selectedYear);
  return `geotrend-satellite-${safeName || "site"}-${layerToken}-${periodToken}.png`;
}

/**
 * Loads a remote NASA GIBS tile into an isolated 256x256 canvas and probes `toDataURL()`
 * so a CORS-blocked or failing tile never taints the main export canvas.
 */
export async function loadCorsSafeTileCanvas(url: string): Promise<HTMLCanvasElement | null> {
  if (typeof Image === "undefined" || typeof document === "undefined") {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    let settled = false;

    const finish = (canvas: HTMLCanvasElement | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(canvas);
    };

    const timer = setTimeout(() => finish(null), TILE_TIMEOUT_MS);

    img.onload = () => {
      try {
        const probe = document.createElement("canvas");
        probe.width = TILE_SIZE;
        probe.height = TILE_SIZE;
        const pCtx = probe.getContext?.("2d");
        if (!pCtx) {
          finish(null);
          return;
        }
        pCtx.drawImage(img, 0, 0, TILE_SIZE, TILE_SIZE);
        // Probe taint before returning this canvas for main composition.
        probe.toDataURL("image/png");
        finish(probe);
      } catch {
        finish(null);
      }
    };

    img.onerror = () => finish(null);
    img.src = url;
  });
}

async function fetchPanelTiles(
  location: LocationInfo,
  layer: GibsLayerId,
  year: number,
  zoom: number,
  loader: (url: string) => Promise<CanvasImageSource | null>,
): Promise<Array<{ dx: number; dy: number; tile: CanvasImageSource | null }>> {
  const effectiveZoom = layer === "MODIS_Terra_L3_NDVI_Monthly" ? Math.min(7, zoom) : zoom;
  const centerTile = latLonToTileXY(location.lat, location.lon, effectiveZoom);
  const maxIdx = 2 ** effectiveZoom - 1;

  const tasks: Array<Promise<{ dx: number; dy: number; tile: CanvasImageSource | null }>> = [];
  for (const dy of TILE_OFFSETS) {
    for (const dx of TILE_OFFSETS) {
      const tx = centerTile.x + dx;
      const ty = centerTile.y + dy;
      if (tx < 0 || ty < 0 || tx > maxIdx || ty > maxIdx) {
        tasks.push(Promise.resolve({ dx, dy, tile: null }));
        continue;
      }
      const url = buildNasaGibsTileUrl(layer, year, effectiveZoom, tx, ty);
      tasks.push(
        loader(url)
          .then((tile) => ({ dx, dy, tile }))
          .catch(() => ({ dx, dy, tile: null })),
      );
    }
  }

  return Promise.all(tasks);
}

function drawPanelBackdropGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  lat: number,
  lon: number,
): void {
  ctx.save();
  ctx.fillStyle = "#161B1E";
  ctx.fillRect(x, y, width, height);

  ctx.strokeStyle = "rgba(237, 237, 234, 0.12)";
  ctx.lineWidth = 1;
  const cols = 6;
  const rows = 5;
  for (let i = 1; i < cols; i++) {
    const gx = x + (width / cols) * i;
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + height);
    ctx.stroke();
  }
  for (let j = 1; j < rows; j++) {
    const gy = y + (height / rows) * j;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + width, gy);
    ctx.stroke();
  }

  ctx.fillStyle = "#9B9B98";
  ctx.font = "500 13px 'JetBrains Mono', monospace";
  ctx.fillText(`LAT ${lat.toFixed(2)}°  LON ${lon.toFixed(2)}°`, x + 18, y + height - 20);
  ctx.restore();
}

function drawCrosshair(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = "#C1472E";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy);
  ctx.lineTo(cx + 26, cy);
  ctx.moveTo(cx, cy - 26);
  ctx.lineTo(cx, cy + 26);
  ctx.stroke();
  ctx.fillStyle = "#EDEDEA";
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSatellitePanel(
  ctx: CanvasRenderingContext2D,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    badgeText: string;
    dateText: string;
    lat: number;
    lon: number;
    tiles: Array<{ dx: number; dy: number; tile: CanvasImageSource | null }>;
  },
): { loaded: number; total: number } {
  const { x, y, width, height, badgeText, dateText, lat, lon, tiles } = options;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  drawPanelBackdropGrid(ctx, x, y, width, height, lat, lon);

  const mosaicSize = Math.max(width, height);
  const mosaicOriginX = x + (width - mosaicSize) / 2;
  const mosaicOriginY = y + (height - mosaicSize) / 2;
  const cellSize = mosaicSize / 3;

  let loaded = 0;
  for (const item of tiles) {
    if (!item.tile) continue;
    loaded++;
    const drawX = mosaicOriginX + (item.dx + 1) * cellSize;
    const drawY = mosaicOriginY + (item.dy + 1) * cellSize;
    try {
      ctx.drawImage(item.tile, drawX, drawY, cellSize, cellSize);
    } catch {
      // Ignore individual draw failures and retain vector graticule underneath.
    }
  }

  // Subtle coordinate crosshair at exact panel center
  drawCrosshair(ctx, x + width / 2, y + height / 2);

  // Top-left year badge
  ctx.fillStyle = "rgba(11, 13, 15, 0.85)";
  ctx.fillRect(x + 16, y + 16, 184, 34);
  ctx.strokeStyle = "rgba(237, 237, 234, 0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 16, y + 16, 184, 34);
  ctx.fillStyle = "#EDEDEA";
  ctx.font = "700 14px 'JetBrains Mono', monospace";
  ctx.fillText(badgeText, x + 28, y + 38);

  // Top-right observation date pill
  ctx.fillStyle = "rgba(11, 13, 15, 0.85)";
  ctx.fillRect(x + width - 148, y + 16, 132, 34);
  ctx.strokeRect(x + width - 148, y + 16, 132, 34);
  ctx.fillStyle = "#D4A373";
  ctx.font = "600 13px 'JetBrains Mono', monospace";
  ctx.fillText(dateText, x + width - 134, y + 38);

  ctx.restore();

  // Panel crisp outline
  ctx.strokeStyle = "rgba(237, 237, 234, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, width, height);

  return { loaded, total: tiles.length };
}

/**
 * Renders a publication-ready NASA GIBS / MODIS Terra visual evidence PNG figure
 * (1600x900 Before vs. After comparison or 1280x860 single-year Timelapse frame)
 * with full CORS isolation and vector graticule fallback.
 */
export async function downloadSatelliteFigurePng(
  options: SatellitePngExportOptions,
): Promise<SatellitePngExportResult> {
  const {
    location,
    layer,
    mode,
    beforeYear,
    afterYear,
    selectedYear,
    zoom,
    locale = "en",
    shareUrl,
    loadTileFn,
  } = options;

  const tr = (key: string, params?: Record<string, string | number>) =>
    translateForLocale(locale, key, params);

  const width = mode === "compare" ? 1600 : 1280;
  const height = mode === "compare" ? 900 : 860;
  const filename = buildSatellitePngFilename(
    location.label,
    layer,
    mode,
    beforeYear,
    afterYear,
    selectedYear,
  );

  const loader = loadTileFn ?? loadCorsSafeTileCanvas;

  const panels =
    mode === "compare"
      ? [
          {
            year: beforeYear,
            badge: tr("satellite.beforeLabel", { year: beforeYear }),
          },
          {
            year: afterYear,
            badge: tr("satellite.afterLabel", { year: afterYear }),
          },
        ]
      : [
          {
            year: selectedYear,
            badge: `${tr("satellite.monthTag")} · ${selectedYear}`,
          },
        ];

  const panelTileSets = await Promise.all(
    panels.map((panel) => fetchPanelTiles(location, layer, panel.year, zoom, loader)),
  );

  const doc = typeof document !== "undefined" ? document : undefined;
  const canvas = doc?.createElement("canvas");
  const ctx = canvas?.getContext?.("2d") ?? null;

  let loadedTiles = 0;
  let totalTiles = 0;

  if (canvas && ctx) {
    canvas.width = width;
    canvas.height = height;

    // Editorial observatory background
    ctx.fillStyle = "#0B0D0F";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(237, 237, 234, 0.16)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Header band
    drawBrandMarkOnCanvas(ctx, { x: 48, y: 40, size: 40, tone: "dark" });

    ctx.fillStyle = "#9B9B98";
    ctx.font = "600 15px 'JetBrains Mono', monospace";
    ctx.fillText(tr("satellite.figureHeader"), 102, 56);

    const isNdvi = layer === "MODIS_Terra_L3_NDVI_Monthly";
    const layerLabel = isNdvi ? tr("satellite.layerNdvi") : tr("satellite.layerTrueColor");
    const periodLabel =
      mode === "compare" ? `${beforeYear} vs. ${afterYear}` : String(selectedYear);

    ctx.fillStyle = "#EDEDEA";
    ctx.font = "700 32px Georgia, serif";
    ctx.fillText(`${location.label}  ·  ${periodLabel}`, 102, 92);

    ctx.fillStyle = "#D4A373";
    ctx.font = "600 14px 'JetBrains Mono', monospace";
    ctx.fillText(
      `NASA MODIS TERRA · ${layerLabel.toUpperCase()} · ${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}° · Z${zoom}`,
      48,
      128,
    );

    const dateSuffix = isNdvi ? "08-01" : "08-29";
    const topY = 152;
    const footerHeight = 96;
    const panelHeight = height - topY - footerHeight;

    if (mode === "compare") {
      const gap = 28;
      const panelW = (width - 96 - gap) / 2;
      panels.forEach((panel, idx) => {
        const res = drawSatellitePanel(ctx, {
          x: 48 + idx * (panelW + gap),
          y: topY,
          width: panelW,
          height: panelHeight,
          badgeText: panel.badge,
          dateText: `${panel.year}-${dateSuffix}`,
          lat: location.lat,
          lon: location.lon,
          tiles: panelTileSets[idx],
        });
        loadedTiles += res.loaded;
        totalTiles += res.total;
      });
    } else {
      const panelW = width - 96;
      const res = drawSatellitePanel(ctx, {
        x: 48,
        y: topY,
        width: panelW,
        height: panelHeight,
        badgeText: panels[0].badge,
        dateText: `${panels[0].year}-${dateSuffix}`,
        lat: location.lat,
        lon: location.lon,
        tiles: panelTileSets[0],
      });
      loadedTiles += res.loaded;
      totalTiles += res.total;
    }

    const usedFallback = loadedTiles < totalTiles || loadedTiles === 0;

    // Footer bar
    const footerY = height - 66;
    ctx.fillStyle = "#9B9B98";
    ctx.font = "500 14px 'JetBrains Mono', monospace";
    ctx.fillText(tr("satellite.figureAttribution"), 48, footerY);

    if (usedFallback) {
      ctx.fillStyle = "#D4A373";
      ctx.font = "500 13px 'JetBrains Mono', monospace";
      ctx.fillText(tr("satellite.pngFallbackNotice"), 48, footerY + 24);
    } else if (shareUrl) {
      ctx.fillStyle = "#9B9B98";
      ctx.font = "500 13px 'JetBrains Mono', monospace";
      const truncated = shareUrl.length > 96 ? `${shareUrl.slice(0, 93)}...` : shareUrl;
      ctx.fillText(truncated, 48, footerY + 24);
    }

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = doc?.createElement("a");
      if (a) {
        a.href = dataUrl;
        a.download = filename;
        a.click?.();
      }
    } catch {
      // Never throw unhandled SecurityError even if canvas implementation blocks toDataURL
    }

    return {
      usedFallback,
      filename,
      width,
      height,
      loadedTiles,
      totalTiles,
    };
  }

  // Headless non-canvas fallback
  for (const tileSet of panelTileSets) {
    totalTiles += tileSet.length;
    loadedTiles += tileSet.filter((item) => item.tile !== null).length;
  }
  return {
    usedFallback: true,
    filename,
    width,
    height,
    loadedTiles,
    totalTiles,
  };
}
