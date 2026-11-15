import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { getCasePresetById } from "../data/presets";
import { useI18n } from "../i18n/i18n";
import { useOptionalTemperatureUnit } from "../i18n/temperatureUnit";
import { ClientInvestigationError, investigateClientSide } from "../lib/nasa/clientInvestigate";
import {
  formatMerraGridCell,
  getRecommendedSeason,
  type MultiVariableScanItem,
  scanAllVariablesWithFdr,
} from "../lib/nasa/smartInvestigation";
import { DIRECTION_ARROW, DIRECTION_COLOR } from "../lib/resultDisplay";
import {
  convertDeltaValue,
  convertInvestigationResultForDisplay,
  getDisplayUnitLabel,
} from "../lib/temperatureUnit";
import {
  buildSelectableYears,
  getMaxCompleteYear,
  isValidPeriodRange,
  type ValidatedInvestigateQuery,
} from "../lib/validation/investigate";
import type {
  CasePreset,
  CasePresetId,
  InvestigationErrorCode,
  InvestigationResult,
  SavedDossier,
  SeasonId,
  VariableId,
} from "../types/investigation";
import { MIN_ANALYSIS_YEARS, SEASON_IDS, VARIABLE_IDS } from "../types/investigation";
import { CitySearchInput } from "./CitySearchInput";
import { buildCitationText, RecentDossiersDrawer, SatelliteTimelapse, ShareSheet } from "./share";
import { TrendChart } from "./TrendChart";

const LocationPicker = lazy(() =>
  import("./LocationPicker").then((module) => ({ default: module.LocationPicker })),
);

interface InvestigationProps {
  presetId: CasePresetId;
  presetNonce?: number;
  initialLiveQuery?: ValidatedInvestigateQuery | null;
  onNavigateMethods: () => void;
  onOpenDossierPermalink?: (dossierId: string) => void;
}

type InvestigationQuery = ValidatedInvestigateQuery;

function toQuery(preset: CasePreset): InvestigationQuery {
  return {
    lat: preset.result.location.lat,
    lon: preset.result.location.lon,
    label: preset.result.location.label,
    variable: preset.variable,
    season: preset.defaultSeason,
    startYear: preset.result.stats.startYear,
    endYear: preset.result.stats.endYear,
  };
}

export function Investigation({
  presetId,
  presetNonce = 0,
  initialLiveQuery = null,
  onNavigateMethods,
  onOpenDossierPermalink,
}: InvestigationProps) {
  const { locale, t, formatNumber } = useI18n();
  const tempUnit = useOptionalTemperatureUnit();
  const [methodOpen, setMethodOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [customSeasonPinned, setCustomSeasonPinned] = useState(false);
  const [isDerived, setIsDerived] = useState(Boolean(initialLiveQuery));

  const [query, setQuery] = useState<InvestigationQuery>(
    () => initialLiveQuery ?? toQuery(getCasePresetById(presetId)),
  );
  const [result, setResult] = useState<InvestigationResult>(
    () => getCasePresetById(presetId).result,
  );
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<InvestigationErrorCode | null>(null);

  const [scanItems, setScanItems] = useState<MultiVariableScanItem[] | null>(null);
  const [scanningAll, setScanningAll] = useState(false);
  const requestIdRef = useRef(0);
  const hasMountedRef = useRef(false);
  const liveQueryKey = initialLiveQuery ? JSON.stringify(initialLiveQuery) : null;
  const lastLiveKeyRef = useRef<string | null>(null);

  const resetToPreset = useCallback((targetPresetId: CasePresetId) => {
    requestIdRef.current += 1;
    const preset = getCasePresetById(targetPresetId);
    setQuery(toQuery(preset));
    setResult(preset.result);
    setLoading(false);
    setErrorCode(null);
    setAdvancedOpen(false);
    setCustomSeasonPinned(false);
    setIsDerived(false);
    setScanItems(null);
  }, []);

  const applyInvestigationError = useCallback((err: unknown) => {
    const code = err instanceof ClientInvestigationError ? err.code : "NASA_UPSTREAM_ERROR";
    setErrorCode(code);
    if (code === "INVALID_COORDINATES") {
      setAdvancedOpen(true);
    }
  }, []);

  useEffect(() => {
    if (liveQueryKey && initialLiveQuery) {
      if (lastLiveKeyRef.current === liveQueryKey) return;
      lastLiveKeyRef.current = liveQueryKey;
      hasMountedRef.current = true;
      setQuery(initialLiveQuery);
      setCustomSeasonPinned(true);
      setIsDerived(true);
      setScanItems(null);
      const thisRequestId = ++requestIdRef.current;
      setLoading(true);
      setErrorCode(null);
      void investigateClientSide(initialLiveQuery)
        .then((next) => {
          if (thisRequestId !== requestIdRef.current) return;
          setResult(next);
        })
        .catch((err: unknown) => {
          if (thisRequestId !== requestIdRef.current) return;
          applyInvestigationError(err);
        })
        .finally(() => {
          if (thisRequestId === requestIdRef.current) setLoading(false);
        });
      return;
    }

    lastLiveKeyRef.current = null;
    if (!hasMountedRef.current && presetNonce === 0) {
      hasMountedRef.current = true;
      return;
    }
    hasMountedRef.current = true;

    resetToPreset(presetId);
  }, [
    presetId,
    presetNonce,
    liveQueryKey,
    initialLiveQuery,
    resetToPreset,
    applyInvestigationError,
  ]);

  const handleRestore = () => {
    resetToPreset(presetId);
  };

  const handleSelectSavedDossier = (dossier: SavedDossier) => {
    requestIdRef.current += 1;
    const next = dossier.result;
    setQuery({
      lat: next.location.lat,
      lon: next.location.lon,
      label: next.location.label,
      variable: next.variable,
      season: next.season,
      startYear: next.stats.startYear,
      endYear: next.stats.endYear,
    });
    setResult(next);
    setLoading(false);
    setErrorCode(null);
    setCustomSeasonPinned(true);
    setIsDerived(true);
    setScanItems(null);
  };

  const executeInvestigation = async (targetQuery: InvestigationQuery) => {
    const thisRequestId = ++requestIdRef.current;
    setLoading(true);
    setErrorCode(null);
    try {
      const next = await investigateClientSide(targetQuery);
      if (thisRequestId !== requestIdRef.current) return;
      setResult(next);
      setIsDerived(true);
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return;
      applyInvestigationError(err);
    } finally {
      if (thisRequestId === requestIdRef.current) setLoading(false);
    }
  };

  const applyNextQuery = (nextQuery: InvestigationQuery, options?: { clearScan?: boolean }) => {
    setQuery(nextQuery);
    setErrorCode(null);
    if (options?.clearScan) {
      setScanItems(null);
    }
    if (isValidPeriodRange(nextQuery.startYear, nextQuery.endYear)) {
      void executeInvestigation(nextQuery);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPeriodRange(query.startYear, query.endYear)) return;
    await executeInvestigation(query);
  };

  const handleVariableChange = (nextVariable: VariableId) => {
    const nextSeason = customSeasonPinned
      ? query.season
      : getRecommendedSeason(nextVariable, query.lat);
    applyNextQuery({ ...query, variable: nextVariable, season: nextSeason });
  };

  const handleCitySelect = (candidate: { lat: number; lon: number; label: string }) => {
    const nextSeason = customSeasonPinned
      ? query.season
      : getRecommendedSeason(query.variable, candidate.lat);
    applyNextQuery({ ...query, ...candidate, season: nextSeason }, { clearScan: true });
  };

  const handleSeasonOverride = (nextSeason: SeasonId) => {
    const recommended = getRecommendedSeason(query.variable, query.lat);
    setCustomSeasonPinned(nextSeason !== recommended);
    applyNextQuery({ ...query, season: nextSeason });
  };

  const handleYearChange = (field: "startYear" | "endYear", nextValue: number) => {
    if (!Number.isInteger(nextValue)) return;
    applyNextQuery({ ...query, [field]: nextValue }, { clearScan: true });
  };

  const handleRunScanAll = async () => {
    if (!isValidPeriodRange(query.startYear, query.endYear)) return;
    setScanningAll(true);
    setErrorCode(null);
    try {
      const items = await scanAllVariablesWithFdr({
        lat: query.lat,
        lon: query.lon,
        label: query.label,
        startYear: query.startYear,
        endYear: query.endYear,
        seasonOverride: customSeasonPinned ? query.season : undefined,
      });
      setScanItems(items);
    } catch (err) {
      const code = err instanceof ClientInvestigationError ? err.code : "NASA_UPSTREAM_ERROR";
      setErrorCode(code);
    } finally {
      setScanningAll(false);
    }
  };

  const displayResult = convertInvestigationResultForDisplay(result, tempUnit);
  const { stats, location, variable, season, unit } = displayResult;
  const { series } = result;

  const formatPValue = (p: number) =>
    p < 0.001 ? "< 0.001" : formatNumber(p, { maximumFractionDigits: 3 });

  const unitSuffix = getDisplayUnitLabel(unit, tempUnit);
  const variableLabel = t(`variables.${variable}.label`);
  const seasonLabel = t(`seasons.${season}`);
  const verdictText = t(`verdict.${stats.verdict}`);

  const headline = t(`verdict.sentence.${stats.direction}`, {
    variable: variableLabel,
    season: seasonLabel,
    location: location.label,
    totalChange: formatNumber(Math.abs(stats.totalChangeOverPeriod), { maximumFractionDigits: 1 }),
    unit: unitSuffix,
    startYear: stats.startYear,
    endYear: stats.endYear,
    perDecade: formatNumber(Math.abs(stats.senSlopePerDecade), { maximumFractionDigits: 1 }),
    pValue: formatPValue(stats.pValue),
  });

  const maxSelectableYear = getMaxCompleteYear();
  const selectableYears = buildSelectableYears(maxSelectableYear, [query.startYear, query.endYear]);
  const selectedSpan = query.endYear - query.startYear + 1;
  const isPeriodValid = isValidPeriodRange(query.startYear, query.endYear);
  const periodValidationMessage = !isPeriodValid
    ? query.startYear > query.endYear
      ? t("form.periodOrderError", { startYear: query.startYear, endYear: query.endYear })
      : t("form.periodMinYearsError", {
          years: Math.max(0, selectedSpan),
          startYear: query.startYear,
          endYear: query.endYear,
          minYears: MIN_ANALYSIS_YEARS,
        })
    : null;
  const recommendedSeasonForCurrent = getRecommendedSeason(query.variable, query.lat);

  return (
    <section id="investigation" className="border-b border-border px-4 py-8 sm:px-6 sm:py-10">
      {isDerived && (
        <div className="mb-3 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wide text-text-muted">
          <span>{t("cases.derivedBanner", { id: presetId })}</span>
          <button type="button" onClick={handleRestore} className="text-accent hover:underline">
            {t("cases.restoreAction")}
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mb-8 space-y-3 border border-border bg-surface p-3 sm:p-4"
      >
        <div className="flex flex-wrap items-center gap-2 font-display text-base text-text sm:text-lg">
          <span className="text-text-muted">{t("form.phrasePrefix")}</span>
          <select
            aria-label={t("form.variableLabel")}
            value={query.variable}
            onChange={(e) => handleVariableChange(e.target.value as VariableId)}
            className="max-w-full border-b border-accent bg-transparent font-display text-base text-text sm:text-lg"
          >
            {VARIABLE_IDS.map((id) => {
              const autoSeason = customSeasonPinned
                ? query.season
                : getRecommendedSeason(id, query.lat);
              return (
                <option key={id} value={id} className="bg-surface text-text">
                  {t(`variables.${id}.simple`)} ({t(`seasonsSimple.${autoSeason}`)})
                </option>
              );
            })}
          </select>
          <span className="text-text-muted">{t("form.phraseIn")}</span>
          <CitySearchInput
            currentLabel={query.label ?? `${query.lat.toFixed(2)}, ${query.lon.toFixed(2)}`}
            onSelect={handleCitySelect}
            onPickOnMap={() => setAdvancedOpen(true)}
            className="min-w-36 flex-1 sm:min-w-48 sm:flex-initial"
          />
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {(
              [
                {
                  field: "startYear",
                  prefixKey: "form.phraseFrom",
                  labelKey: "form.startYearLabel",
                },
                {
                  field: "endYear",
                  prefixKey: "form.phraseTo",
                  labelKey: "form.endYearLabel",
                },
              ] as const
            ).map(({ field, prefixKey, labelKey }) => (
              <span key={field} className="inline-flex items-center gap-1.5">
                <span className="text-text-muted">{t(prefixKey)}</span>
                <select
                  aria-label={t(labelKey)}
                  value={query[field]}
                  onChange={(e) => handleYearChange(field, Number(e.target.value))}
                  className="border-b border-accent bg-transparent font-display text-base tabular-nums text-text sm:text-lg"
                >
                  {selectableYears.map((year) => (
                    <option key={year} value={year} className="bg-surface text-text">
                      {year}
                    </option>
                  ))}
                </select>
              </span>
            ))}
          </span>
          <button
            type="submit"
            disabled={loading || !isPeriodValid}
            className="w-full border border-accent px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-text hover:bg-bg disabled:opacity-50 sm:ml-auto sm:w-auto sm:py-1"
          >
            {loading ? t("form.runningButton") : `→ ${t("form.goButton")}`}
          </button>
        </div>

        {periodValidationMessage && (
          <p
            role="status"
            className="border border-accent/60 bg-bg px-3 py-2 font-sans text-xs text-accent"
          >
            {periodValidationMessage}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="font-sans text-xs text-accent hover:underline"
          >
            {advancedOpen ? "▾" : "▸"} {t("form.moreOptions")}
          </button>
          <span className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
            {t("form.seasonHintAuto", { season: t(`seasons.${query.season}`) })}
            {isPeriodValid ? ` · ${t("form.periodSpanYears", { count: selectedSpan })}` : ""}
          </span>
        </div>

        {advancedOpen && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className="font-mono text-xs text-text-muted">
                {t("form.seasonLabel")}
                <select
                  aria-label={t("form.seasonLabel")}
                  value={query.season}
                  onChange={(e) => handleSeasonOverride(e.target.value as SeasonId)}
                  className="ml-2 border border-border bg-bg px-2 py-1 font-mono text-xs text-text"
                >
                  {SEASON_IDS.map((id) => (
                    <option key={id} value={id}>
                      {t(`seasons.${id}`)}
                      {id === recommendedSeasonForCurrent
                        ? ` · ${t("form.seasonRecommendedTag")}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <span className="font-mono text-[11px] text-text-muted">
                {t("form.gridCellLabel")}: {formatMerraGridCell(query.lat, query.lon)}
              </span>
            </div>

            <p className="font-sans text-xs text-text-muted">{t("form.minYearsWarning")}</p>

            <Suspense
              fallback={
                <div className="h-56 w-full border border-border bg-bg p-4 font-mono text-xs text-text-muted sm:h-72" />
              }
            >
              <LocationPicker
                lat={query.lat}
                lon={query.lon}
                onChange={(next) => {
                  setQuery((q) => ({
                    ...q,
                    ...next,
                    season: customSeasonPinned
                      ? q.season
                      : getRecommendedSeason(q.variable, next.lat),
                  }));
                  setScanItems(null);
                }}
              />
            </Suspense>

            <div className="border-t border-border pt-3">
              <button
                type="button"
                disabled={scanningAll || !isPeriodValid}
                onClick={handleRunScanAll}
                className="border border-border bg-bg px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-accent hover:border-accent disabled:opacity-50"
              >
                {scanningAll
                  ? t("form.scanningAllVariables")
                  : `⚡ ${t("form.scanAllVariablesButton")}`}
              </button>

              {scanItems && (
                <div className="mt-3 overflow-x-auto border border-border bg-bg p-3">
                  <p className="mb-2 font-mono text-xs uppercase tracking-wide text-text-muted">
                    {t("form.scanTableTitle")}
                  </p>
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-muted">
                        <th className="py-1 pr-3">{t("form.scanColVariable")}</th>
                        <th className="py-1 pr-3">{t("form.scanColSlope")}</th>
                        <th className="py-1 pr-3">{t("form.scanColPValue")}</th>
                        <th className="py-1 pr-3">{t("form.scanColQValue")}</th>
                        <th className="py-1">{t("form.scanColAction")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanItems.map((item) => {
                        const itemUnit = getDisplayUnitLabel(item.result.unit, tempUnit);
                        const itemSlopeDecade = convertDeltaValue(
                          item.result.stats.senSlopePerDecade,
                          item.result.unit,
                          tempUnit,
                        );
                        const isActive =
                          item.variable === result.variable && item.season === result.season;
                        return (
                          <tr key={item.variable} className="border-b border-border/50">
                            <td className="py-1.5 pr-3 text-text">
                              {t(`variables.${item.variable}.shortLabel`)} ·{" "}
                              {t(`seasons.${item.season}`)}
                            </td>
                            <td
                              className={`py-1.5 pr-3 ${DIRECTION_COLOR[item.result.stats.direction]}`}
                            >
                              {itemSlopeDecade > 0 ? "+" : ""}
                              {formatNumber(itemSlopeDecade, {
                                maximumFractionDigits: 2,
                              })}{" "}
                              {itemUnit}/dec
                            </td>
                            <td className="py-1.5 pr-3 text-text-muted">
                              {formatPValue(item.result.stats.pValue)}
                            </td>
                            <td className="py-1.5 pr-3 text-text">
                              {formatPValue(item.qValue)} {item.fdrSignificant ? "✓" : ""}
                            </td>
                            <td className="py-1.5">
                              {isActive ? (
                                <span className="text-text-muted">{t("form.scanActiveBadge")}</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuery((q) => ({
                                      ...q,
                                      variable: item.variable,
                                      season: item.season,
                                    }));
                                    setResult(item.result);
                                    setIsDerived(true);
                                  }}
                                  className="text-accent hover:underline"
                                >
                                  {t("form.scanLoadAction")}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {errorCode && (
          <div className="border border-accent bg-bg p-3">
            <p className="font-mono text-xs uppercase tracking-wide text-accent">
              {t("errors.title")}
            </p>
            <p className="mt-1 font-sans text-sm text-text-muted">{t(`errors.${errorCode}`)}</p>
            <p className="mt-2 font-mono text-xs text-text-muted">{t("errors.stillShowing")}</p>
          </div>
        )}
      </form>

      <p className="max-w-2xl font-display text-xl text-text">{headline}</p>

      <p
        className={`mt-3 font-mono text-sm uppercase tracking-wide ${DIRECTION_COLOR[stats.direction]}`}
      >
        {DIRECTION_ARROW[stats.direction]} {verdictText}
      </p>

      <div className="mt-6 border border-border bg-surface p-3 sm:p-4">
        <TrendChart series={series} unit={unit} variable={variable} />
      </div>

      <div className="mt-6">
        <SatelliteTimelapse
          location={location}
          startYear={stats.startYear}
          endYear={stats.endYear}
          defaultExpanded
        />
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <p className="font-mono text-xs text-text-muted">
          {t("form.methodologyPipeline", {
            nYears: stats.nYears,
            startYear: stats.startYear,
            endYear: stats.endYear,
            verdict: verdictText,
          })}
        </p>

        <button
          type="button"
          onClick={() => setMethodOpen((open) => !open)}
          className="mt-2 font-sans text-xs text-accent hover:underline"
        >
          {methodOpen ? "▾" : "▸"} {t("form.expandMethod")}
        </button>

        {methodOpen && (
          <div className="mt-3 space-y-1 font-mono text-xs text-text-muted">
            <p>
              Z = {formatNumber(stats.zScore, { maximumFractionDigits: 2 })}, p ={" "}
              {formatPValue(stats.pValue)}
            </p>
            {stats.senSlopeCiLowerPerYear !== undefined &&
              stats.senSlopeCiUpperPerYear !== undefined && (
                <p>
                  {t("investigation.ciPerYear")}: [
                  {formatNumber(stats.senSlopeCiLowerPerYear, { maximumFractionDigits: 2 })},{" "}
                  {formatNumber(stats.senSlopeCiUpperPerYear, { maximumFractionDigits: 2 })}]{" "}
                  {unitSuffix}
                </p>
              )}
            {stats.warnings?.shortRecord && <p>{t("investigation.warnings.shortRecord")}</p>}
            {stats.warnings?.highAutocorrelation && (
              <p>{t("investigation.warnings.highAutocorrelation")}</p>
            )}
            <p className="pt-2 text-text-muted">{buildCitationText(result, locale, tempUnit)}</p>
            <button
              type="button"
              onClick={onNavigateMethods}
              className="pt-1 text-accent hover:underline"
            >
              {t("form.fullMethodLink")}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-3">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wide text-text hover:border-accent"
        >
          {t("actions.share")}
        </button>
        <RecentDossiersDrawer
          onSelectDossier={handleSelectSavedDossier}
          onOpenPermalink={onOpenDossierPermalink}
        />
      </div>

      {shareOpen && (
        <div className="mt-6">
          <ShareSheet
            result={result}
            locale={locale}
            tempUnit={tempUnit}
            onClose={() => setShareOpen(false)}
          />
        </div>
      )}
    </section>
  );
}
