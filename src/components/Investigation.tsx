import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { getCasePresetById } from "../data/presets";
import { useI18n } from "../i18n/i18n";
import { ClientInvestigationError, investigateClientSide } from "../lib/nasa/clientInvestigate";
import {
  formatMerraGridCell,
  getRecommendedSeason,
  type MultiVariableScanItem,
  scanAllVariablesWithFdr,
} from "../lib/nasa/smartInvestigation";
import { DIRECTION_ARROW, DIRECTION_COLOR, UNIT_SUFFIX } from "../lib/resultDisplay";
import type { ValidatedInvestigateQuery } from "../lib/validation/investigate";
import type {
  CasePreset,
  CasePresetId,
  InvestigationErrorCode,
  InvestigationResult,
  SavedDossier,
  SeasonId,
  VariableId,
} from "../types/investigation";
import { SEASON_IDS, VARIABLE_IDS } from "../types/investigation";
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
          const code = err instanceof ClientInvestigationError ? err.code : "NASA_UPSTREAM_ERROR";
          setErrorCode(code);
          if (code === "INSUFFICIENT_YEARS" || code === "INVALID_COORDINATES") {
            setAdvancedOpen(true);
          }
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
  }, [presetId, presetNonce, liveQueryKey, initialLiveQuery, resetToPreset]);

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
      const code = err instanceof ClientInvestigationError ? err.code : "NASA_UPSTREAM_ERROR";
      setErrorCode(code);
      if (code === "INSUFFICIENT_YEARS" || code === "INVALID_COORDINATES") {
        setAdvancedOpen(true);
      }
    } finally {
      if (thisRequestId === requestIdRef.current) setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeInvestigation(query);
  };

  const handleVariableChange = (nextVariable: VariableId) => {
    const nextSeason = customSeasonPinned
      ? query.season
      : getRecommendedSeason(nextVariable, query.lat);
    const nextQuery: InvestigationQuery = {
      ...query,
      variable: nextVariable,
      season: nextSeason,
    };
    setQuery(nextQuery);
    void executeInvestigation(nextQuery);
  };

  const handleCitySelect = (candidate: { lat: number; lon: number; label: string }) => {
    const nextSeason = customSeasonPinned
      ? query.season
      : getRecommendedSeason(query.variable, candidate.lat);
    const nextQuery: InvestigationQuery = {
      ...query,
      lat: candidate.lat,
      lon: candidate.lon,
      label: candidate.label,
      season: nextSeason,
    };
    setQuery(nextQuery);
    setScanItems(null);
    void executeInvestigation(nextQuery);
  };

  const handleSeasonOverride = (nextSeason: SeasonId) => {
    const recommended = getRecommendedSeason(query.variable, query.lat);
    setCustomSeasonPinned(nextSeason !== recommended);
    const nextQuery: InvestigationQuery = {
      ...query,
      season: nextSeason,
    };
    setQuery(nextQuery);
    void executeInvestigation(nextQuery);
  };

  const handleRunScanAll = async () => {
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

  const { stats, series, location, variable, season, unit } = result;

  const formatPValue = (p: number) =>
    p < 0.001 ? "< 0.001" : formatNumber(p, { maximumFractionDigits: 3 });

  const unitSuffix = UNIT_SUFFIX[unit]?.trim() ?? "";
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

  const currentYear = new Date().getUTCFullYear();
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
            className="min-w-0 flex-1 sm:min-w-48 sm:flex-initial"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full border border-accent px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-text hover:bg-bg disabled:opacity-50 sm:ml-auto sm:w-auto sm:py-1"
          >
            {loading ? t("form.runningButton") : `→ ${t("form.goButton")}`}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="font-sans text-xs text-accent hover:underline"
          >
            {advancedOpen ? "▾" : "▸"} {t("form.moreOptions")}
          </button>
          <span className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
            {t("form.seasonHintAuto", { season: t(`seasons.${query.season}`) })} · {query.startYear}
            –{query.endYear}
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

              <label className="font-mono text-xs text-text-muted">
                {t("form.startYearLabel")}
                <input
                  type="number"
                  min={1981}
                  max={currentYear}
                  value={query.startYear}
                  onChange={(e) => setQuery((q) => ({ ...q, startYear: Number(e.target.value) }))}
                  className="ml-2 w-20 border border-border bg-bg px-2 py-1 font-mono text-sm text-text"
                />
              </label>

              <label className="font-mono text-xs text-text-muted">
                {t("form.endYearLabel")}
                <input
                  type="number"
                  min={1981}
                  max={currentYear}
                  value={query.endYear}
                  onChange={(e) => setQuery((q) => ({ ...q, endYear: Number(e.target.value) }))}
                  className="ml-2 w-20 border border-border bg-bg px-2 py-1 font-mono text-sm text-text"
                />
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
                disabled={scanningAll}
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
                        const itemUnit = UNIT_SUFFIX[item.result.unit]?.trim() ?? "";
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
                              {item.result.stats.senSlopePerDecade > 0 ? "+" : ""}
                              {formatNumber(item.result.stats.senSlopePerDecade, {
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
                  {formatNumber(stats.senSlopeCiUpperPerYear, { maximumFractionDigits: 2 })}]
                </p>
              )}
            {stats.warnings?.shortRecord && <p>{t("investigation.warnings.shortRecord")}</p>}
            {stats.warnings?.highAutocorrelation && (
              <p>{t("investigation.warnings.highAutocorrelation")}</p>
            )}
            <p className="pt-2 text-text-muted">{buildCitationText(result, locale)}</p>
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
          <ShareSheet result={result} locale={locale} onClose={() => setShareOpen(false)} />
        </div>
      )}
    </section>
  );
}
