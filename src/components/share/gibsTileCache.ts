import {
  buildFrameTileUrls,
  buildNasaGibsTileUrl,
  buildNasaWorldviewUrl,
  buildPriorityYears,
  GIBS_MAX_YEAR,
  GIBS_MIN_YEAR,
  type GibsComparisonWindow,
  type GibsLayerId,
  latLonToTileXY,
  resolveGibsComparisonWindow,
  TILE_OFFSETS,
} from "../../lib/gibs.ts";

export {
  buildFrameTileUrls,
  buildNasaGibsTileUrl,
  buildNasaWorldviewUrl,
  buildPriorityYears,
  GIBS_MAX_YEAR,
  GIBS_MIN_YEAR,
  type GibsComparisonWindow,
  type GibsLayerId,
  latLonToTileXY,
  resolveGibsComparisonWindow,
  TILE_OFFSETS,
};

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
