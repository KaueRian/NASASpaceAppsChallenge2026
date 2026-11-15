import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n/i18n.tsx";
import type { LocationInfo } from "../../types/investigation.ts";
import {
  buildFrameTileUrls,
  buildNasaGibsTileUrl,
  buildNasaWorldviewUrl,
  buildPriorityYears,
  GIBS_MAX_YEAR,
  GIBS_MIN_YEAR,
  type GibsComparisonWindow,
  type GibsLayerId,
  isFrameUrlsCached,
  latLonToTileXY,
  preloadFrameTiles,
  preloadTimelapseSequence,
  resolveGibsComparisonWindow,
} from "./gibsTileCache.ts";

export {
  buildNasaGibsTileUrl,
  buildNasaWorldviewUrl,
  type GibsComparisonWindow,
  type GibsLayerId,
  latLonToTileXY,
  resolveGibsComparisonWindow,
};

export type SatelliteViewMode = "compare" | "timelapse";

export interface SatelliteTimelapseProps {
  location: LocationInfo;
  startYear?: number;
  endYear?: number;
  defaultExpanded?: boolean;
}

const TILE_SLOT_IDS = ["nw", "n", "ne", "w", "c", "e", "sw", "s", "se"] as const;
const TIMELAPSE_TICK_MS = 750;
const SLOT_PAINT_TIMEOUT_MS = 3000;

interface FrameBuffer {
  key: string;
  year: number;
  urls: string[];
}

function buildFrameKey(
  location: LocationInfo,
  layer: GibsLayerId,
  zoom: number,
  year: number,
): string {
  return `${location.lat.toFixed(4)}:${location.lon.toFixed(4)}:${layer}:${zoom}:${year}`;
}

async function waitForSlotPaint(container: HTMLDivElement, signal: AbortSignal): Promise<void> {
  const imgs = Array.from(container.querySelectorAll("img"));

  await Promise.all(
    imgs.map((img) => {
      if (img.complete) {
        if (typeof img.decode === "function" && img.naturalWidth > 0) {
          return img.decode().catch(() => undefined);
        }
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          signal.removeEventListener("abort", finish);
          img.removeEventListener("load", finish);
          img.removeEventListener("error", finish);
          if (typeof img.decode === "function" && img.naturalWidth > 0) {
            void img
              .decode()
              .catch(() => undefined)
              .finally(resolve);
          } else {
            resolve();
          }
        };

        const timeout = setTimeout(finish, SLOT_PAINT_TIMEOUT_MS);
        signal.addEventListener("abort", finish, { once: true });
        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", finish, { once: true });
      });
    }),
  );

  if (signal.aborted) return;

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      if (signal.aborted) {
        resolve();
        return;
      }
      requestAnimationFrame(() => resolve());
    });
  });
}

function TileGridLayer({
  urls,
  alt,
  isFront,
  containerRef,
}: {
  urls: readonly string[];
  alt: string;
  isFront: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={containerRef}
      aria-hidden={!isFront}
      className={`absolute inset-0 grid h-full w-full grid-cols-3 grid-rows-3 ${
        isFront ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
      }`}
    >
      {urls.map((tileUrl, idx) => (
        <img
          key={TILE_SLOT_IDS[idx]}
          src={tileUrl}
          alt={isFront ? alt : ""}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ))}
    </div>
  );
}

interface SatelliteTileFrameProps {
  location: LocationInfo;
  layer: GibsLayerId;
  layerLabel: string;
  year: number;
  zoom: number;
  monthTag: string;
  updatingLabel: string;
  formatBadge: (frameYear: number) => string;
  altTemplate: (frameYear: number, layerLabel: string) => string;
  emphasis?: "before" | "after";
}

function SatelliteTileFrame({
  location,
  layer,
  layerLabel,
  year,
  zoom,
  monthTag,
  updatingLabel,
  formatBadge,
  altTemplate,
  emphasis,
}: SatelliteTileFrameProps) {
  const targetKey = buildFrameKey(location, layer, zoom, year);
  const targetUrls = useMemo(
    () => buildFrameTileUrls(location.lat, location.lon, layer, year, zoom),
    [location.lat, location.lon, layer, year, zoom],
  );

  // Double-buffered slots keep the active decoded mosaic visible while the next frame loads & paints.
  const [slots, setSlots] = useState<[FrameBuffer, FrameBuffer | null]>(() => [
    { key: targetKey, year, urls: targetUrls },
    null,
  ]);
  const [frontIndex, setFrontIndex] = useState<0 | 1>(0);
  const [isUpdatingFrame, setIsUpdatingFrame] = useState(false);

  const slot0Ref = useRef<HTMLDivElement | null>(null);
  const slot1Ref = useRef<HTMLDivElement | null>(null);

  const frontSlot = slots[frontIndex] ?? slots[0];
  const backIndex: 0 | 1 = frontIndex === 0 ? 1 : 0;
  const backSlot = slots[backIndex];

  useEffect(() => {
    if (frontSlot.key === targetKey) {
      setIsUpdatingFrame(false);
      return;
    }

    const controller = new AbortController();
    setIsUpdatingFrame(!isFrameUrlsCached(targetUrls));

    void preloadFrameTiles(targetUrls, controller.signal).then(() => {
      if (controller.signal.aborted) return;
      setSlots((prev) => {
        if (prev[backIndex]?.key === targetKey) return prev;
        const next: [FrameBuffer, FrameBuffer | null] = [...prev];
        next[backIndex] = { key: targetKey, year, urls: targetUrls };
        return next;
      });
    });

    return () => controller.abort();
  }, [targetKey, targetUrls, year, frontSlot.key, backIndex]);

  useEffect(() => {
    if (!backSlot || backSlot.key !== targetKey || frontSlot.key === targetKey) {
      return;
    }

    const backContainer = backIndex === 0 ? slot0Ref.current : slot1Ref.current;
    if (!backContainer) return;

    const controller = new AbortController();

    void waitForSlotPaint(backContainer, controller.signal).then(() => {
      if (controller.signal.aborted) return;
      setFrontIndex(backIndex);
      setIsUpdatingFrame(false);
    });

    return () => controller.abort();
  }, [backSlot, backIndex, frontSlot.key, targetKey]);

  const badgeColor =
    emphasis === "after"
      ? "border border-accent/60 bg-bg/90 text-text"
      : "border border-border bg-bg/85 text-text";
  const displayedAlt = altTemplate(frontSlot.year, layerLabel);

  return (
    <div className="relative aspect-video w-full overflow-hidden border border-border bg-bg">
      <TileGridLayer
        urls={slots[0].urls}
        alt={displayedAlt}
        isFront={frontIndex === 0}
        containerRef={slot0Ref}
      />

      {slots[1] && (
        <TileGridLayer
          urls={slots[1].urls}
          alt={displayedAlt}
          isFront={frontIndex === 1}
          containerRef={slot1Ref}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent bg-accent/20 shadow" />
      </div>

      <div
        className={`absolute left-2.5 top-2.5 z-20 px-2.5 py-1 font-mono text-xs font-bold tracking-wider ${badgeColor}`}
      >
        {formatBadge(frontSlot.year)} · {monthTag}
      </div>

      {isUpdatingFrame && (
        <div
          role="status"
          className="absolute bottom-2 left-2 z-20 border border-border bg-bg/90 px-2 py-0.5 font-mono text-[10px] text-accent"
        >
          {updatingLabel}
        </div>
      )}

      <div className="absolute bottom-2 right-2 z-20 bg-bg/85 px-2 py-0.5 font-mono text-[10px] text-text-muted">
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
  const [layer, setLayer] = useState<GibsLayerId>("MODIS_Terra_CorrectedReflectance_TrueColor");
  const [zoom, setZoom] = useState(7);

  const safeYear = Math.max(beforeYear, Math.min(afterYear, year));
  const maxZoomForLayer = layer === "MODIS_Terra_L3_NDVI_Monthly" ? 7 : 8;
  const effectiveZoom = Math.min(zoom, maxZoomForLayer);

  const priorityYears = useMemo(
    () => buildPriorityYears(beforeYear, afterYear),
    [beforeYear, afterYear],
  );
  const totalYears = priorityYears.length;
  const preloadSignature = `${location.lat.toFixed(4)}:${location.lon.toFixed(4)}:${layer}:${effectiveZoom}:${beforeYear}:${afterYear}`;

  const [playSession, setPlaySession] = useState<{ signature: string; active: boolean }>({
    signature: preloadSignature,
    active: false,
  });
  const [preloadState, setPreloadState] = useState<{ signature: string; count: number }>(() => ({
    signature: preloadSignature,
    count: 0,
  }));
  const settledYearsRef = useRef<{ signature: string; years: Set<number> }>({
    signature: preloadSignature,
    years: new Set(),
  });

  const playRequested = playSession.signature === preloadSignature && playSession.active;
  const readyCount = preloadState.signature === preloadSignature ? preloadState.count : 0;
  const allFramesReady = totalYears > 0 && readyCount >= totalYears;
  const isPlaying = playRequested && allFramesReady && expanded && mode === "timelapse";
  const isBufferingToPlay = playRequested && !allFramesReady && expanded && mode === "timelapse";

  useEffect(() => {
    setYear(beforeYear);
  }, [beforeYear]);

  useEffect(() => {
    if (!expanded) return;

    if (settledYearsRef.current.signature !== preloadSignature) {
      settledYearsRef.current = { signature: preloadSignature, years: new Set() };
    }

    for (const candidateYear of priorityYears) {
      if (settledYearsRef.current.years.has(candidateYear)) continue;
      const urls = buildFrameTileUrls(
        location.lat,
        location.lon,
        layer,
        candidateYear,
        effectiveZoom,
      );
      if (isFrameUrlsCached(urls)) {
        settledYearsRef.current.years.add(candidateYear);
      }
    }

    setPreloadState({
      signature: preloadSignature,
      count: settledYearsRef.current.years.size,
    });

    const pendingYears = priorityYears.filter((y) => !settledYearsRef.current.years.has(y));
    if (pendingYears.length === 0) return;

    const controller = new AbortController();
    const concurrency = mode === "timelapse" || playRequested ? 4 : 2;

    void preloadTimelapseSequence({
      lat: location.lat,
      lon: location.lon,
      layer,
      zoom: effectiveZoom,
      years: pendingYears,
      concurrency,
      signal: controller.signal,
      onYearSettled: (settledYear) => {
        if (controller.signal.aborted) return;
        settledYearsRef.current.years.add(settledYear);
        setPreloadState({
          signature: preloadSignature,
          count: settledYearsRef.current.years.size,
        });
      },
    });

    return () => controller.abort();
  }, [
    expanded,
    preloadSignature,
    priorityYears,
    location.lat,
    location.lon,
    layer,
    effectiveZoom,
    mode,
    playRequested,
  ]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setYear((prev) => (prev >= afterYear ? beforeYear : prev + 1));
    }, TIMELAPSE_TICK_MS);
    return () => clearInterval(timer);
  }, [isPlaying, beforeYear, afterYear]);

  const layerLabel =
    layer === "MODIS_Terra_L3_NDVI_Monthly"
      ? t("satellite.layerNdvi")
      : t("satellite.layerTrueColor");
  const monthTag = t("satellite.monthTag");
  const worldviewYear = mode === "compare" ? afterYear : safeYear;
  const preloadPercent = Math.min(100, Math.round((readyCount / Math.max(1, totalYears)) * 100));

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
              if (!next) setPlaySession({ signature: preloadSignature, active: false });
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
                    setPlaySession({ signature: preloadSignature, active: false });
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
                monthTag={monthTag}
                updatingLabel={t("satellite.frameUpdating", { year: beforeYear })}
                formatBadge={(frameYear) => t("satellite.beforeLabel", { year: frameYear })}
                altTemplate={(y, l) => t("satellite.tileAlt", { year: y, layer: l })}
                emphasis="before"
              />
              <SatelliteTileFrame
                location={location}
                layer={layer}
                layerLabel={layerLabel}
                year={afterYear}
                zoom={effectiveZoom}
                monthTag={monthTag}
                updatingLabel={t("satellite.frameUpdating", { year: afterYear })}
                formatBadge={(frameYear) => t("satellite.afterLabel", { year: frameYear })}
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
                  monthTag={monthTag}
                  updatingLabel={t("satellite.frameUpdating", { year: safeYear })}
                  formatBadge={(frameYear) => String(frameYear)}
                  altTemplate={(y, l) => t("satellite.tileAlt", { year: y, layer: l })}
                  emphasis="after"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setPlaySession((prev) => ({
                        signature: preloadSignature,
                        active: !(prev.signature === preloadSignature && prev.active),
                      }))
                    }
                    className="bg-accent px-3.5 py-1.5 font-bold text-bg hover:opacity-90"
                  >
                    {isPlaying
                      ? `⏸ ${t("satellite.pause")}`
                      : isBufferingToPlay
                        ? `⏳ ${t("satellite.buffering", { ready: readyCount, total: totalYears })}`
                        : `▶ ${t("satellite.play")}`}
                  </button>

                  <input
                    type="range"
                    min={beforeYear}
                    max={afterYear}
                    value={safeYear}
                    onChange={(e) => {
                      setPlaySession({ signature: preloadSignature, active: false });
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

                <div className="space-y-1 font-mono text-[11px] text-text-muted">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {allFramesReady
                        ? t("satellite.preloadReady", { total: totalYears })
                        : t("satellite.preloadProgress", { ready: readyCount, total: totalYears })}
                    </span>
                    <span>{preloadPercent}%</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden bg-bg">
                    <div
                      className="h-full bg-accent transition-[width] duration-200"
                      style={{ width: `${preloadPercent}%` }}
                    />
                  </div>
                </div>
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
