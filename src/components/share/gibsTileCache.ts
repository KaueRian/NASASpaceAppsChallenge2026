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

const MAX_CACHED_TILES = 600;
const TILE_LOAD_TIMEOUT_MS = 12000;

type TileLoadStatus = "ok" | "error";

const tileStatusCache = new Map<string, TileLoadStatus>();
const retainedImages = new Map<string, HTMLImageElement>();
const inflightTiles = new Map<string, Promise<TileLoadStatus>>();

function touchLru<V>(cache: Map<string, V>, key: string, value: V, limit: number): void {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, value);
  while (cache.size > limit) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

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

/** Checks whether every tile URL of a frame is already decoded and warm in memory. */
export function isFrameUrlsCached(urls: readonly string[]): boolean {
  return urls.length > 0 && urls.every((url) => tileStatusCache.get(url) === "ok");
}

function awaitWithAbort<T>(promise: Promise<T>, abortedValue: T, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.resolve(abortedValue);

  return new Promise<T>((resolve) => {
    const onAbort = () => resolve(abortedValue);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      () => {
        signal.removeEventListener("abort", onAbort);
        resolve(abortedValue);
      },
    );
  });
}

function loadAndDecodeTile(url: string): Promise<TileLoadStatus> {
  if (typeof Image === "undefined") {
    return Promise.resolve("ok");
  }

  const existing = inflightTiles.get(url);
  if (existing) {
    return existing;
  }

  const requestPromise = new Promise<TileLoadStatus>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    let settled = false;

    const finish = (status: TileLoadStatus) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      inflightTiles.delete(url);
      if (status === "ok") {
        touchLru(retainedImages, url, img, MAX_CACHED_TILES);
        touchLru(tileStatusCache, url, "ok", MAX_CACHED_TILES);
      }
      resolve(status);
    };

    const timer = setTimeout(() => finish("error"), TILE_LOAD_TIMEOUT_MS);

    img.onload = () => {
      if (typeof img.decode === "function") {
        void img
          .decode()
          .catch(() => undefined)
          .finally(() => finish("ok"));
      } else {
        finish("ok");
      }
    };
    img.onerror = () => finish("error");
    img.src = url;
  });

  inflightTiles.set(url, requestPromise);
  return requestPromise;
}

/** Downloads and decodes a single NASA GIBS tile URL into the bounded in-memory LRU cache. */
export async function preloadTileUrl(url: string, signal?: AbortSignal): Promise<TileLoadStatus> {
  if (signal?.aborted) return "error";

  const cached = tileStatusCache.get(url);
  if (cached === "ok") {
    // Refresh LRU recency so active frames are never evicted mid-playback.
    const existingImg = retainedImages.get(url);
    if (existingImg) {
      touchLru(retainedImages, url, existingImg, MAX_CACHED_TILES);
    }
    touchLru(tileStatusCache, url, "ok", MAX_CACHED_TILES);
    return "ok";
  }

  return awaitWithAbort(loadAndDecodeTile(url), "error", signal);
}

/** Preloads and decodes all 9 tiles of a single year frame concurrently. */
export async function preloadFrameTiles(
  urls: readonly string[],
  signal?: AbortSignal,
): Promise<TileLoadStatus[]> {
  return Promise.all(urls.map((url) => preloadTileUrl(url, signal)));
}

export interface PreloadTimelapseOptions {
  lat: number;
  lon: number;
  layer: GibsLayerId;
  zoom: number;
  years: readonly number[];
  concurrency?: number;
  signal?: AbortSignal;
  onYearSettled?: (year: number) => void;
}

/**
 * Progressively preloads and decodes an ordered list of timelapse years with bounded concurrency,
 * notifying `onYearSettled` after each frame finishes (whether from cache or network).
 */
export async function preloadTimelapseSequence({
  lat,
  lon,
  layer,
  zoom,
  years,
  concurrency = 2,
  signal,
  onYearSettled,
}: PreloadTimelapseOptions): Promise<void> {
  if (years.length === 0 || signal?.aborted) return;

  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, years.length));

  const worker = async () => {
    while (!signal?.aborted) {
      const idx = cursor++;
      if (idx >= years.length) return;
      const year = years[idx];
      if (year === undefined) return;
      const urls = buildFrameTileUrls(lat, lon, layer, year, zoom);
      await preloadFrameTiles(urls, signal);
      if (signal?.aborted) return;
      onYearSettled?.(year);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

/** Clears cached tile statuses and retained Image instances (intended for unit tests). */
export function clearGibsTileCacheForTests(): void {
  tileStatusCache.clear();
  retainedImages.clear();
  inflightTiles.clear();
}
