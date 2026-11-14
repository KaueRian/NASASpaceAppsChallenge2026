import { useEffect, useState } from "react";
import type { LocationInfo } from "../../types/investigation.ts";

export type GibsLayerId = "MODIS_Terra_CorrectedReflectance_TrueColor" | "MODIS_Terra_NDVI_8Day";

export interface SatelliteTimelapseProps {
  location: LocationInfo;
  startYear?: number;
  endYear?: number;
  defaultExpanded?: boolean;
}

const GIBS_MIN_YEAR = 2000;
const GIBS_MAX_YEAR = 2025;

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
 * Uses August 13 (`YYYY-08-13`), which is both an exact 8-day MODIS NDVI composite boundary
 * (day-of-year 225 in non-leap years) and low-cloud dry season in Amazonia / summer in the Arctic.
 */
export function buildNasaGibsTileUrl(
  layer: GibsLayerId,
  year: number,
  z: number,
  x: number,
  y: number,
): string {
  const safeYear = Math.max(GIBS_MIN_YEAR, Math.min(GIBS_MAX_YEAR, year));
  const dateStr = `${safeYear}-08-13`;
  const isNdvi = layer === "MODIS_Terra_NDVI_8Day";
  const ext = isNdvi ? "png" : "jpg";
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${dateStr}/GoogleMapsCompatible_Level9/${z}/${y}/${x}.${ext}`;
}

export function buildNasaWorldviewUrl(lat: number, lon: number, year: number): string {
  const minLon = (lon - 1.5).toFixed(3);
  const minLat = (lat - 1.0).toFixed(3);
  const maxLon = (lon + 1.5).toFixed(3);
  const maxLat = (lat + 1.0).toFixed(3);
  return `https://worldview.earthdata.nasa.gov/?v=${minLon},${minLat},${maxLon},${maxLat}&t=${year}-08-13-T00%3A00%3A00Z`;
}

export function SatelliteTimelapse({
  location,
  startYear = GIBS_MIN_YEAR,
  endYear = GIBS_MAX_YEAR,
  defaultExpanded = false,
}: SatelliteTimelapseProps) {
  const minYear = Math.max(GIBS_MIN_YEAR, startYear);
  const maxYear = Math.min(GIBS_MAX_YEAR, Math.max(minYear, endYear));

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [year, setYear] = useState(minYear);
  const [playing, setPlaying] = useState(false);
  const [layer, setLayer] = useState<GibsLayerId>("MODIS_Terra_CorrectedReflectance_TrueColor");
  const [zoom, setZoom] = useState(7);

  useEffect(() => {
    if (!playing || !expanded) return;
    const timer = setInterval(() => {
      setYear((prev) => (prev >= maxYear ? minYear : prev + 1));
    }, 850);
    return () => clearInterval(timer);
  }, [playing, expanded, minYear, maxYear]);

  const centerTile = latLonToTileXY(location.lat, location.lon, zoom);
  const maxTileIdx = 2 ** zoom - 1;
  const offsets = [-1, 0, 1] as const;

  return (
    <section
      aria-label="NASA GIBS Satellite Evidence Timelapse"
      className="mt-4 rounded-sm border border-[#14110F]/25 bg-[#E8DFD1] p-4 text-[#14110F]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#5C5346]">
            OPTICAL &amp; VEGETATION SATELLITE ARCHIVE · NASA GIBS / MODIS TERRA
          </span>
          <h4 className="font-serif text-base font-bold">
            Visual Landscape Evolution ({minYear}–{maxYear})
          </h4>
        </div>
        <button
          type="button"
          onClick={() => {
            setExpanded((prev) => !prev);
            if (expanded) setPlaying(false);
          }}
          className="rounded border border-[#14110F] bg-[#F4EFE6] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#D4A84F]/25"
        >
          {expanded ? "Hide Satellite Timelapse" : "Inspect Satellite Timelapse (2000–2025)"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-[#14110F]/15 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <div className="inline-flex rounded border border-[#14110F]/25 bg-[#F4EFE6] p-0.5">
              <button
                type="button"
                onClick={() => setLayer("MODIS_Terra_CorrectedReflectance_TrueColor")}
                className={`rounded px-2.5 py-1 ${
                  layer === "MODIS_Terra_CorrectedReflectance_TrueColor"
                    ? "bg-[#14110F] font-bold text-[#F4EFE6]"
                    : "text-[#5C5346]"
                }`}
              >
                True Color (MODIS)
              </button>
              <button
                type="button"
                onClick={() => setLayer("MODIS_Terra_NDVI_8Day")}
                className={`rounded px-2.5 py-1 ${
                  layer === "MODIS_Terra_NDVI_8Day"
                    ? "bg-[#14110F] font-bold text-[#F4EFE6]"
                    : "text-[#5C5346]"
                }`}
              >
                Vegetation NDVI
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(5, z - 1))}
                className="rounded border border-[#14110F]/30 bg-[#F4EFE6] px-2 py-1"
                title="Zoom out"
              >
                −
              </button>
              <span>Zoom {zoom}x</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(8, z + 1))}
                className="rounded border border-[#14110F]/30 bg-[#F4EFE6] px-2 py-1"
                title="Zoom in"
              >
                +
              </button>
            </div>
          </div>

          <div className="relative mx-auto aspect-video max-w-[640px] overflow-hidden rounded-sm border-2 border-[#14110F] bg-[#12100E]">
            <div className="grid h-full w-full grid-cols-3 grid-rows-3">
              {offsets.map((dy) =>
                offsets.map((dx) => {
                  const tx = Math.max(0, Math.min(maxTileIdx, centerTile.x + dx));
                  const ty = Math.max(0, Math.min(maxTileIdx, centerTile.y + dy));
                  const tileUrl = buildNasaGibsTileUrl(layer, year, zoom, tx, ty);
                  return (
                    <img
                      key={`${zoom}-${tx}-${ty}-${year}-${layer}`}
                      src={tileUrl}
                      alt={`NASA MODIS satellite tile (${year})`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  );
                }),
              )}
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 rounded-full border-2 border-[#C83E2B] bg-[#C83E2B]/25 shadow" />
            </div>

            <div className="absolute left-3 top-3 rounded bg-[#14110F]/85 px-2.5 py-1 font-mono text-sm font-bold text-[#F4EFE6]">
              {year} · AUG
            </div>

            <div className="absolute bottom-2 right-2 rounded bg-[#14110F]/80 px-2 py-0.5 font-mono text-[10px] text-[#F4EFE6]">
              {location.label} ({location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°)
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded bg-[#C83E2B] px-3.5 py-1.5 font-bold text-[#F4EFE6] hover:bg-[#b13322]"
            >
              {playing ? "⏸ Pause" : "▶ Play Timelapse"}
            </button>

            <input
              type="range"
              min={minYear}
              max={maxYear}
              value={year}
              onChange={(e) => {
                setPlaying(false);
                setYear(Number(e.target.value));
              }}
              aria-label="Satellite timelapse year"
              className="flex-1 accent-[#C83E2B]"
            />

            <span className="font-bold">
              {year} / {maxYear}
            </span>

            <a
              href={buildNasaWorldviewUrl(location.lat, location.lon, year)}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-[#C83E2B]"
            >
              Open in NASA Worldview ↗
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
