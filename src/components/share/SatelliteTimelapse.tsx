import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/i18n.tsx";
import type { LocationInfo } from "../../types/investigation.ts";

export type GibsLayerId =
  | "MODIS_Terra_CorrectedReflectance_TrueColor"
  | "MODIS_Terra_L3_NDVI_Monthly";
export type SatelliteViewMode = "compare" | "timelapse";

export interface SatelliteTimelapseProps {
  location: LocationInfo;
  startYear?: number;
  endYear?: number;
  defaultExpanded?: boolean;
}

export interface GibsComparisonWindow {
  beforeYear: number;
  afterYear: number;
  startsBeforeArchive: boolean;
}

const GIBS_MIN_YEAR = 2000;
const GIBS_MAX_YEAR = 2025;
const TILE_OFFSETS = [-1, 0, 1] as const;

/**
 * Resolves valid NASA GIBS MODIS Terra year bounds (`2000–2025`) for side-by-side
 * "Before vs. After" and Timelapse inspection.
 */
export function resolveGibsComparisonWindow(
  startYear?: number,
  endYear?: number,
): GibsComparisonWindow {
  const startsBeforeArchive = startYear !== undefined && startYear < GIBS_MIN_YEAR;
  const clampedStart = Math.max(GIBS_MIN_YEAR, Math.min(GIBS_MAX_YEAR, startYear ?? GIBS_MIN_YEAR));
  const clampedEnd = Math.max(GIBS_MIN_YEAR, Math.min(GIBS_MAX_YEAR, endYear ?? GIBS_MAX_YEAR));

  if (clampedStart >= clampedEnd) {
    return {
      beforeYear: GIBS_MIN_YEAR,
      afterYear: GIBS_MAX_YEAR,
      startsBeforeArchive,
    };
  }

  return {
    beforeYear: clampedStart,
    afterYear: clampedEnd,
    startsBeforeArchive,
  };
}

/**
 * Converts geographic coordinates (lat, lon) to Web Mercator slippy-map tile (x, y) at zoom `z`.
 */
export function latLonToTileXY(lat: number, lon: number, z: number): { x: number; y: number } {
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (clampedLat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

/**
 * Builds an official NASA GIBS WMTS tile URL for a given year and layer.
 * Uses August 29 (`YYYY-08-29`) for True Color (continuous 2000–2025 coverage avoiding Terra's
 * mid-August 2000 formatter outage) and August 1 (`YYYY-08-01`) for monthly Level-3 NDVI
 * (`GoogleMapsCompatible_Level7`), ensuring 100% HTTP 200 availability across 2000–2025.
 */
export function buildNasaGibsTileUrl(
  layer: GibsLayerId,
  year: number,
  z: number,
  x: number,
  y: number,
): string {
  const safeYear = Math.max(GIBS_MIN_YEAR, Math.min(GIBS_MAX_YEAR, year));
  const isNdvi = layer === "MODIS_Terra_L3_NDVI_Monthly";
  const dateStr = isNdvi ? `${safeYear}-08-01` : `${safeYear}-08-29`;
  const matrixSet = isNdvi ? "GoogleMapsCompatible_Level7" : "GoogleMapsCompatible_Level9";
  const safeZ = isNdvi ? Math.min(7, z) : z;
  const ext = isNdvi ? "png" : "jpg";
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${dateStr}/${matrixSet}/${safeZ}/${y}/${x}.${ext}`;
}

export function buildNasaWorldviewUrl(lat: number, lon: number, year: number): string {
  const minLon = (lon - 1.5).toFixed(3);
  const minLat = (lat - 1.0).toFixed(3);
  const maxLon = (lon + 1.5).toFixed(3);
  const maxLat = (lat + 1.0).toFixed(3);
  return `https://worldview.earthdata.nasa.gov/?v=${minLon},${minLat},${maxLon},${maxLat}&t=${year}-08-29-T00%3A00%3A00Z`;
}

interface SatelliteTileFrameProps {
  location: LocationInfo;
  layer: GibsLayerId;
  layerLabel: string;
  year: number;
  zoom: number;
  badgeText: string;
  monthTag: string;
  altTemplate: (year: number, layerLabel: string) => string;
  emphasis?: "before" | "after";
}

function SatelliteTileFrame({
  location,
  layer,
  layerLabel,
  year,
  zoom,
  badgeText,
  monthTag,
  altTemplate,
  emphasis,
}: SatelliteTileFrameProps) {
  const centerTile = latLonToTileXY(location.lat, location.lon, zoom);
  const maxTileIdx = 2 ** zoom - 1;
  const badgeColor =
    emphasis === "after"
      ? "border border-accent/60 bg-bg/90 text-text"
      : "border border-border bg-bg/85 text-text";

  return (
    <div className="relative aspect-video w-full overflow-hidden border border-border bg-bg">
      <div className="grid h-full w-full grid-cols-3 grid-rows-3">
        {TILE_OFFSETS.map((dy) =>
          TILE_OFFSETS.map((dx) => {
            const tx = Math.max(0, Math.min(maxTileIdx, centerTile.x + dx));
            const ty = Math.max(0, Math.min(maxTileIdx, centerTile.y + dy));
            const tileUrl = buildNasaGibsTileUrl(layer, year, zoom, tx, ty);
            return (
              <img
                key={`${zoom}-${tx}-${ty}-${year}-${layer}`}
                src={tileUrl}
                alt={altTemplate(year, layerLabel)}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            );
          }),
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent bg-accent/20 shadow" />
      </div>

      <div
        className={`absolute left-2.5 top-2.5 px-2.5 py-1 font-mono text-xs font-bold tracking-wider ${badgeColor}`}
      >
        {badgeText} · {monthTag}
      </div>

      <div className="absolute bottom-2 right-2 bg-bg/85 px-2 py-0.5 font-mono text-[10px] text-text-muted">
        {location.label} ({location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°)
      </div>
    </div>
  );
}

export function SatelliteTimelapse({
  location,
  startYear = GIBS_MIN_YEAR,
  endYear = GIBS_MAX_YEAR,
  defaultExpanded = true,
}: SatelliteTimelapseProps) {
  const { t } = useI18n();
  const { beforeYear, afterYear, startsBeforeArchive } = resolveGibsComparisonWindow(
    startYear,
    endYear,
  );

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [mode, setMode] = useState<SatelliteViewMode>("compare");
  const [year, setYear] = useState(beforeYear);
  const [playing, setPlaying] = useState(false);
  const [layer, setLayer] = useState<GibsLayerId>("MODIS_Terra_CorrectedReflectance_TrueColor");
  const [zoom, setZoom] = useState(7);

  const safeYear = Math.max(beforeYear, Math.min(afterYear, year));

  useEffect(() => {
    setYear(beforeYear);
    setPlaying(false);
  }, [beforeYear]);

  useEffect(() => {
    if (!playing || !expanded || mode !== "timelapse") return;
    const timer = setInterval(() => {
      setYear((prev) => (prev >= afterYear ? beforeYear : prev + 1));
    }, 850);
    return () => clearInterval(timer);
  }, [playing, expanded, mode, beforeYear, afterYear]);

  const maxZoomForLayer = layer === "MODIS_Terra_L3_NDVI_Monthly" ? 7 : 8;
  const effectiveZoom = Math.min(zoom, maxZoomForLayer);
  const layerLabel =
    layer === "MODIS_Terra_L3_NDVI_Monthly"
      ? t("satellite.layerNdvi")
      : t("satellite.layerTrueColor");
  const monthTag = t("satellite.monthTag");
  const worldviewYear = mode === "compare" ? afterYear : safeYear;

  return (
    <section
      aria-label={t("satellite.eyebrow")}
      className="border border-border bg-surface p-4 text-text sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
            {t("satellite.eyebrow")}
          </p>
          <h4 className="mt-1 font-display text-lg text-text">
            {t("satellite.title", { beforeYear, afterYear })}
          </h4>
          <p className="mt-1 font-sans text-xs text-text-muted">{t("satellite.subtitle")}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setExpanded((prev) => {
              const next = !prev;
              if (!next) setPlaying(false);
              return next;
            });
          }}
          className="border border-border bg-bg px-3 py-1.5 font-mono text-xs text-text hover:border-accent"
        >
          {expanded ? t("satellite.hideAction") : t("satellite.showAction")}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex border border-border bg-bg p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode("compare");
                    setPlaying(false);
                  }}
                  aria-pressed={mode === "compare"}
                  className={`px-2.5 py-1 transition-colors ${
                    mode === "compare"
                      ? "bg-accent font-bold text-bg"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {t("satellite.modeCompare")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("timelapse")}
                  aria-pressed={mode === "timelapse"}
                  className={`px-2.5 py-1 transition-colors ${
                    mode === "timelapse"
                      ? "bg-accent font-bold text-bg"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {t("satellite.modeTimelapse", { minYear: beforeYear, maxYear: afterYear })}
                </button>
              </div>

              <div className="inline-flex border border-border bg-bg p-0.5">
                <button
                  type="button"
                  onClick={() => setLayer("MODIS_Terra_CorrectedReflectance_TrueColor")}
                  aria-pressed={layer === "MODIS_Terra_CorrectedReflectance_TrueColor"}
                  className={`px-2.5 py-1 transition-colors ${
                    layer === "MODIS_Terra_CorrectedReflectance_TrueColor"
                      ? "bg-text font-bold text-bg"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {t("satellite.layerTrueColor")}
                </button>
                <button
                  type="button"
                  onClick={() => setLayer("MODIS_Terra_L3_NDVI_Monthly")}
                  aria-pressed={layer === "MODIS_Terra_L3_NDVI_Monthly"}
                  className={`px-2.5 py-1 transition-colors ${
                    layer === "MODIS_Terra_L3_NDVI_Monthly"
                      ? "bg-text font-bold text-bg"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {t("satellite.layerNdvi")}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(5, Math.min(z, maxZoomForLayer) - 1))}
                className="border border-border bg-bg px-2.5 py-1 text-text hover:border-accent"
                title={t("satellite.zoomOut")}
                aria-label={t("satellite.zoomOut")}
              >
                −
              </button>
              <span className="text-text-muted">
                {t("satellite.zoomLabel", { zoom: effectiveZoom })}
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(maxZoomForLayer, z + 1))}
                disabled={effectiveZoom >= maxZoomForLayer}
                className="border border-border bg-bg px-2.5 py-1 text-text hover:border-accent disabled:opacity-40"
                title={t("satellite.zoomIn")}
                aria-label={t("satellite.zoomIn")}
              >
                +
              </button>
            </div>
          </div>

          {mode === "compare" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <SatelliteTileFrame
                location={location}
                layer={layer}
                layerLabel={layerLabel}
                year={beforeYear}
                zoom={effectiveZoom}
                badgeText={t("satellite.beforeLabel", { year: beforeYear })}
                monthTag={monthTag}
                altTemplate={(y, l) => t("satellite.tileAlt", { year: y, layer: l })}
                emphasis="before"
              />
              <SatelliteTileFrame
                location={location}
                layer={layer}
                layerLabel={layerLabel}
                year={afterYear}
                zoom={effectiveZoom}
                badgeText={t("satellite.afterLabel", { year: afterYear })}
                monthTag={monthTag}
                altTemplate={(y, l) => t("satellite.tileAlt", { year: y, layer: l })}
                emphasis="after"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto max-w-[680px]">
                <SatelliteTileFrame
                  location={location}
                  layer={layer}
                  layerLabel={layerLabel}
                  year={safeYear}
                  zoom={effectiveZoom}
                  badgeText={String(safeYear)}
                  monthTag={monthTag}
                  altTemplate={(y, l) => t("satellite.tileAlt", { year: y, layer: l })}
                  emphasis="after"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="bg-accent px-3.5 py-1.5 font-bold text-bg hover:opacity-90"
                >
                  {playing ? `⏸ ${t("satellite.pause")}` : `▶ ${t("satellite.play")}`}
                </button>

                <input
                  type="range"
                  min={beforeYear}
                  max={afterYear}
                  value={safeYear}
                  onChange={(e) => {
                    setPlaying(false);
                    setYear(Number(e.target.value));
                  }}
                  aria-label={t("satellite.modeTimelapse", {
                    minYear: beforeYear,
                    maxYear: afterYear,
                  })}
                  className="flex-1 accent-accent"
                />

                <span className="font-bold text-text">
                  {safeYear} / {afterYear}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-text-muted">
            <span>{startsBeforeArchive ? t("satellite.archiveNote", { startYear }) : ""}</span>
            <a
              href={buildNasaWorldviewUrl(location.lat, location.lon, worldviewYear)}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {t("satellite.worldviewLink")}
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
