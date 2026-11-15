import { useEffect, useState } from "react";
import {
  filterInvestigationCatalog,
  INVESTIGATION_CATALOG,
  toInvestigateQuery,
  validateCatalogFilterParams,
} from "../data/investigations";
import { CASE_PRESETS } from "../data/presets";
import { useI18n } from "../i18n/i18n";
import { clampPage, paginateSlice } from "../lib/pagination";
import { DIRECTION_ARROW, DIRECTION_COLOR } from "../lib/resultDisplay";
import { roundCoord, type ValidatedInvestigateQuery } from "../lib/validation/investigate";
import {
  type CasePresetId,
  type CatalogInvestigation,
  INVESTIGATION_SCALES,
  type InvestigationScale,
  SEASON_IDS,
  type SeasonId,
  VARIABLE_IDS,
  type VariableId,
} from "../types/investigation";
import { PaginationControls } from "./PaginationControls";

export const CASES_PAGE_SIZE = 8;

interface CasesGridProps {
  activePresetId: CasePresetId;
  activeLiveQuery?: ValidatedInvestigateQuery | null;
  initialPage?: number;
  onSelectPreset: (id: CasePresetId) => void;
  onSelectInvestigation?: (query: ValidatedInvestigateQuery) => void;
}

const SCALE_BADGE_KEY: Record<CasePresetId, string> = {
  "01": "local",
  "02": "state",
  "03": "national",
  "04": "global",
};

const VIEWED_STORAGE_KEY = "etd.viewedCases";

/** Reads persisted viewed preset IDs from localStorage, returning empty when unavailable. */
export function readViewedCases(): CasePresetId[] {
  try {
    const raw = globalThis.localStorage?.getItem(VIEWED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is CasePresetId => id === "01" || id === "02" || id === "03" || id === "04",
    );
  } catch {
    return [];
  }
}

/** Persists a viewed preset ID into localStorage and returns the updated list. */
export function markCaseViewed(id: CasePresetId, current: readonly CasePresetId[]): CasePresetId[] {
  const next = current.includes(id) ? [...current] : [...current, id];
  try {
    globalThis.localStorage?.setItem(VIEWED_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures in private browsing or restricted sandboxes
  }
  return next;
}

function isCatalogItemActive(
  item: CatalogInvestigation,
  activePresetId: CasePresetId,
  activeLiveQuery?: ValidatedInvestigateQuery | null,
): boolean {
  if (activeLiveQuery) {
    return (
      roundCoord(item.lat) === roundCoord(activeLiveQuery.lat) &&
      roundCoord(item.lon) === roundCoord(activeLiveQuery.lon) &&
      item.variable === activeLiveQuery.variable &&
      item.season === activeLiveQuery.season
    );
  }
  return item.presetId === activePresetId;
}

export function CasesGrid({
  activePresetId,
  activeLiveQuery = null,
  initialPage = 1,
  onSelectPreset,
  onSelectInvestigation,
}: CasesGridProps) {
  const { t } = useI18n();
  const [viewedIds, setViewedIds] = useState<CasePresetId[]>(() =>
    markCaseViewed(activePresetId, readViewedCases()),
  );
  const [scaleFilter, setScaleFilter] = useState<"all" | InvestigationScale>("all");
  const [variableFilter, setVariableFilter] = useState<"all" | VariableId>("all");
  const [seasonFilter, setSeasonFilter] = useState<"all" | SeasonId>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [page, setPage] = useState<number>(() =>
    clampPage(initialPage, Math.ceil(INVESTIGATION_CATALOG.length / CASES_PAGE_SIZE)),
  );

  useEffect(() => {
    if (!activeLiveQuery) {
      setViewedIds((prev) => markCaseViewed(activePresetId, prev));
    }
  }, [activePresetId, activeLiveQuery]);

  const filterValidation = validateCatalogFilterParams({
    scale: scaleFilter,
    variable: variableFilter,
    season: seasonFilter,
    q: searchFilter,
  });

  const filteredItems = filterValidation.ok
    ? filterInvestigationCatalog(filterValidation.data, (item) => [
        t(item.titleKey),
        t(item.regionKey),
        t(item.hookKey),
        t(`cases.topics.${item.topic}`),
        t(`variables.${item.variable}.label`),
      ])
    : [...INVESTIGATION_CATALOG];

  const totalPages = Math.ceil(filteredItems.length / CASES_PAGE_SIZE);
  const safePage = clampPage(page, totalPages);
  const { items: pagedItems, pagination } = paginateSlice(filteredItems, safePage, CASES_PAGE_SIZE);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const hasActiveFilters =
    scaleFilter !== "all" ||
    variableFilter !== "all" ||
    seasonFilter !== "all" ||
    searchFilter.trim() !== "";

  const resetFilters = () => {
    setScaleFilter("all");
    setVariableFilter("all");
    setSeasonFilter("all");
    setSearchFilter("");
    setPage(1);
  };

  const handleCardSelect = (item: CatalogInvestigation) => {
    if (item.presetId) {
      setViewedIds((prev) => markCaseViewed(item.presetId as CasePresetId, prev));
      onSelectPreset(item.presetId);
      return;
    }
    const query = toInvestigateQuery(item);
    if (onSelectInvestigation) {
      onSelectInvestigation(query);
    }
  };

  return (
    <section id="cases" className="border-b border-border px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
          {t("cases.sectionTitle")}
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
          {t("cases.filters.countSummary", {
            shown: filteredItems.length,
            total: INVESTIGATION_CATALOG.length,
          })}
        </span>
      </div>
      <p className="mt-1 max-w-2xl font-sans text-sm text-text-muted">
        {t("cases.sectionSubtitle")}
      </p>

      <div className="mt-5 space-y-3 border border-border bg-surface p-3 sm:p-4">
        <fieldset
          aria-label={t("cases.filters.scaleLabel")}
          className="m-0 flex flex-wrap gap-1.5 border-0 p-0"
        >
          {(["all", ...INVESTIGATION_SCALES] as const).map((scaleOption) => {
            const selected = scaleFilter === scaleOption;
            return (
              <button
                key={scaleOption}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setScaleFilter(scaleOption);
                  setPage(1);
                }}
                className={`border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors motion-reduce:transition-none ${
                  selected
                    ? "border-accent bg-bg text-accent"
                    : "border-border text-text-muted hover:border-text-muted hover:text-text"
                }`}
              >
                {t(`cases.filters.${scaleOption === "all" ? "allScales" : scaleOption}`)}
              </button>
            );
          })}
        </fieldset>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label={t("cases.filters.variableLabel")}
            value={variableFilter}
            onChange={(e) => {
              setVariableFilter(e.target.value as "all" | VariableId);
              setPage(1);
            }}
            className="border border-border bg-bg px-2.5 py-1.5 font-mono text-xs text-text"
          >
            <option value="all">{t("cases.filters.allVariables")}</option>
            {VARIABLE_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`variables.${id}.shortLabel`)}
              </option>
            ))}
          </select>

          <select
            aria-label={t("cases.filters.seasonLabel")}
            value={seasonFilter}
            onChange={(e) => {
              setSeasonFilter(e.target.value as "all" | SeasonId);
              setPage(1);
            }}
            className="border border-border bg-bg px-2.5 py-1.5 font-mono text-xs text-text"
          >
            <option value="all">{t("cases.filters.allSeasons")}</option>
            {SEASON_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`seasons.${id}`)}
              </option>
            ))}
          </select>

          <input
            type="search"
            aria-label={t("cases.filters.searchLabel")}
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.target.value);
              setPage(1);
            }}
            placeholder={t("cases.filters.searchPlaceholder")}
            className="min-w-44 flex-1 border border-border bg-bg px-2.5 py-1.5 font-sans text-xs text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="border border-border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide text-accent hover:border-accent"
            >
              {t("cases.filters.clearButton")}
            </button>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="mt-5 border border-border bg-surface p-6 text-center">
          <p className="font-sans text-sm text-text-muted">{t("cases.filters.emptyTitle")}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 border border-accent px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-accent hover:bg-bg"
          >
            {t("cases.filters.clearButton")}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pagedItems.map((item) => {
              const preset = item.presetId
                ? CASE_PRESETS.find((candidate) => candidate.id === item.presetId)
                : undefined;
              const isActive = isCatalogItemActive(item, activePresetId, activeLiveQuery);
              const isViewed = item.presetId ? viewedIds.includes(item.presetId) : false;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCardSelect(item)}
                  aria-pressed={isActive}
                  className={`flex flex-col justify-between border px-4 py-3.5 text-left transition-colors motion-reduce:transition-none ${
                    isActive ? "border-accent bg-surface" : "border-border hover:border-text-muted"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-[11px] text-text-muted">
                        {item.presetId
                          ? t(`cases.scaleBadge.${SCALE_BADGE_KEY[item.presetId]}`)
                          : `${t(`cases.scaleShortBadge.${item.scale}`)} · ${t(`cases.topics.${item.topic}`)}`}
                      </p>
                      {isViewed ? (
                        <span className="shrink-0 border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                          ✓ {t("cases.alreadyViewed")}
                        </span>
                      ) : (
                        <span className="shrink-0 border border-border/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                          {t(
                            item.presetId
                              ? "cases.filters.offlineReady"
                              : "cases.filters.liveQuery",
                          )}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 font-display text-base text-text">{t(item.titleKey)}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                      {t(item.regionKey)}
                    </p>
                    <p className="mt-2 font-sans text-xs leading-relaxed text-text-muted">
                      {t(item.hookKey)}
                    </p>
                  </div>

                  <div className="mt-3 border-t border-border/50 pt-2">
                    {preset ? (
                      <p
                        className={`font-mono text-[11px] uppercase tracking-wide ${DIRECTION_COLOR[preset.result.stats.direction]}`}
                      >
                        {DIRECTION_ARROW[preset.result.stats.direction]}{" "}
                        {t(`variables.${item.variable}.shortLabel`)}
                      </p>
                    ) : (
                      <p className="font-mono text-[11px] uppercase tracking-wide text-accent">
                        → {t(`variables.${item.variable}.shortLabel`)}
                      </p>
                    )}
                    <p className="mt-0.5 font-mono text-[10px] text-text-muted">
                      {t(`seasons.${item.season}`)} · {item.startYear}–{item.endYear}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <PaginationControls
            pagination={pagination}
            onPageChange={setPage}
            ariaLabel={t("pagination.casesNavLabel")}
          />
        </>
      )}
    </section>
  );
}
