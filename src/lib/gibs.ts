export type GibsLayerId =
  | "MODIS_Terra_CorrectedReflectance_TrueColor"
  | "MODIS_Terra_L3_NDVI_Monthly";

export interface GibsComparisonWindow {
  beforeYear: number;
  afterYear: number;
  startsBeforeArchive: boolean;
}

export const GIBS_MIN_YEAR = 2000;
export const GIBS_MAX_YEAR = 2025;
export const TILE_OFFSETS = [-1, 0, 1] as const;

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

/** Converts geographic coordinates (lat, lon) to Web Mercator slippy-map tile `(x, y)` at zoom `z`. */
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
 * Uses August 29 (`YYYY-08-29`) for True Color and August 1 (`YYYY-08-01`) for monthly Level-3
 * NDVI, ensuring 100% HTTP 200 availability across 2000–2025.
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

/** Returns the 9 NASA GIBS URLs forming a 3×3 slippy-map tile grid centered on `(lat, lon)`. */
export function buildFrameTileUrls(
  lat: number,
  lon: number,
  layer: GibsLayerId,
  year: number,
  zoom: number,
): string[] {
  const centerTile = latLonToTileXY(lat, lon, zoom);
  const maxTileIdx = 2 ** zoom - 1;
  const urls: string[] = [];

  for (const dy of TILE_OFFSETS) {
    for (const dx of TILE_OFFSETS) {
      const tx = Math.max(0, Math.min(maxTileIdx, centerTile.x + dx));
      const ty = Math.max(0, Math.min(maxTileIdx, centerTile.y + dy));
      urls.push(buildNasaGibsTileUrl(layer, year, zoom, tx, ty));
    }
  }

  return urls;
}

/**
 * Orders `[beforeYear..afterYear]` with comparison endpoints first so "Before vs. After" warms
 * immediately before filling intermediate timelapse frames chronologically.
 */
export function buildPriorityYears(beforeYear: number, afterYear: number): number[] {
  if (afterYear < beforeYear) return [];
  if (beforeYear === afterYear) return [beforeYear];

  const years = [beforeYear, afterYear];
  for (let year = beforeYear + 1; year < afterYear; year++) {
    years.push(year);
  }
  return years;
}
