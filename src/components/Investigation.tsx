import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { getCasePresetById } from "../data/presets";
import { useI18n } from "../i18n/i18n";
import { useOptionalTemperatureUnit } from "../i18n/temperatureUnit";
import {
  ClientAiError,
  extractExtremeYearsForAi,
  requestAiInterpret,
  requestAiTranslate,
  resolveAiLocation,
} from "../lib/ai/clientAi";
import {
  interpretWithLocalFallback,
  isAiOutageError,
  translateQuestionWithLocalFallback,
} from "../lib/ai/fallback";
import { ClientInvestigationError, investigateClientSide } from "../lib/nasa/clientInvestigate";
import {
  formatMerraGridCell,
  getRecommendedSeason,
  type MultiVariableScanItem,
  scanAllVariablesWithFdr,
} from "../lib/nasa/smartInvestigation";
import { DIRECTION_ARROW, DIRECTION_COLOR } from "../lib/resultDisplay";
import type { SatelliteDeepLinkState } from "../lib/routing";
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
  AiErrorCode,
  AiInterpretResult,
  AiScanFindingInput,
  AiTranslateResult,
} from "../types/ai";
import type {
  CasePreset,
  CasePresetId,
  InvestigationErrorCode,
  InvestigationResult,
  SeasonId,
  VariableId,
} from "../types/investigation";
import { MIN_ANALYSIS_YEARS, SEASON_IDS, VARIABLE_IDS } from "../types/investigation";
import { AiAssistantBar, type AiFailedStage, type AiPipelineStage } from "./AiAssistantBar";
import { AiSynthesisPanel } from "./AiSynthesisPanel";
import { CitySearchInput } from "./CitySearchInput";
import { buildCitationText, SatelliteTimelapse, ShareSheet } from "./share";
import { TrendChart } from "./TrendChart";

const LocationPicker = lazy(() =>
  import("./LocationPicker").then((module) => ({ default: module.LocationPicker })),
);

interface InvestigationProps {
  presetId: CasePresetId;
  presetNonce?: number;
  initialLiveQuery?: ValidatedInvestigateQuery | null;
  initialSatellite?: SatelliteDeepLinkState;
  defaultAdvancedOpen?: boolean;
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

/** Renders structured investigation filter details inside method disclosure without exposing model IDs. */
export function AiLayer1TranslationDetails({ translation }: { translation: AiTranslateResult }) {
  const { t } = useI18n();
  if (!translation.inScope) return null;

  const { filters } = translation;
  const locationDisplay =
    filters.locationQuery ||
    (filters.reuseCurrentLocation ? t("ai.filterValues.currentLocation") : "—");

  return (
    <div className="mt-3 space-y-1.5 border border-border bg-bg p-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-text">
        {t("ai.layer1DetailsTitle")}
      </p>
      {translation.initialHypothesis && (
        <p className="font-sans text-xs text-text-muted">
          <strong className="text-text">{t("ai.layer1Hypothesis")}:</strong>{" "}
          {translation.initialHypothesis}
        </p>
      )}
      {translation.reasoning && (
        <p className="font-sans text-xs text-text-muted">
          <strong className="text-text">{t("ai.layer1Reasoning")}:</strong> {translation.reasoning}
        </p>
      )}
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 border border-border bg-surface p-2 font-mono text-[11px] sm:grid-cols-2">
        <div>
          <dt className="inline text-text-muted">{t("ai.filterLabels.location")}: </dt>
          <dd className="inline text-text">{locationDisplay}</dd>
        </div>
        <div>
          <dt className="inline text-text-muted">{t("ai.filterLabels.variable")}: </dt>
          <dd className="inline text-text">{t(`variables.${filters.variable}.shortLabel`)}</dd>
        </div>
        <div>
          <dt className="inline text-text-muted">{t("ai.filterLabels.season")}: </dt>
          <dd className="inline text-text">{t(`seasons.${filters.season}`)}</dd>
        </div>
        <div>
          <dt className="inline text-text-muted">{t("ai.filterLabels.period")}: </dt>
          <dd className="inline text-text">
            {filters.startYear}–{filters.endYear}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline text-text-muted">{t("ai.filterLabels.multiScan")}: </dt>
          <dd className="inline text-text">
            {filters.runMultiVariableScan ? t("ai.filterValues.yes") : t("ai.filterValues.no")}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function Investigation({
  presetId,
  presetNonce = 0,
  initialLiveQuery = null,
  initialSatellite,
  defaultAdvancedOpen = false,
  onNavigateMethods,
}: InvestigationProps) {
  const { locale, t, formatNumber } = useI18n();
  const tempUnit = useOptionalTemperatureUnit();
  const [methodOpen, setMethodOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(
    () =>
      defaultAdvancedOpen ||
      (initialLiveQuery
        ? !isValidPeriodRange(initialLiveQuery.startYear, initialLiveQuery.endYear)
        : false),
  );
  const [customSeasonPinned, setCustomSeasonPinned] = useState(Boolean(initialLiveQuery));
  const [basePresetId, setBasePresetId] = useState<CasePresetId | null>(() =>
    initialLiveQuery ? null : presetId,
  );
  const [isDerived, setIsDerived] = useState(false);

  const [query, setQuery] = useState<InvestigationQuery>(
    () => initialLiveQuery ?? toQuery(getCasePresetById(presetId)),
  );
  const [result, setResult] = useState<InvestigationResult>(
    () => getCasePresetById(presetId).result,
  );
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<InvestigationErrorCode | null>(null);

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiStage, setAiStage] = useState<AiPipelineStage>("idle");
  const [aiFailedStage, setAiFailedStage] = useState<AiFailedStage | null>(null);
  const [aiTranslation, setAiTranslation] = useState<AiTranslateResult | null>(null);
  const [aiInterpretation, setAiInterpretation] = useState<AiInterpretResult | null>(null);
  const [aiErrorCode, setAiErrorCode] = useState<AiErrorCode | null>(null);
  const [aiFallbackActive, setAiFallbackActive] = useState(false);
  const aiAbortRef = useRef<AbortController | null>(null);

  const [scanItems, setScanItems] = useState<MultiVariableScanItem[] | null>(null);
  const [scanningAll, setScanningAll] = useState(false);
  const requestIdRef = useRef(0);
  const hasMountedRef = useRef(false);
  const liveQueryKey = initialLiveQuery ? JSON.stringify(initialLiveQuery) : null;
  const liveDispatchKey = liveQueryKey ? `${liveQueryKey}#${presetNonce}` : null;
  const lastLiveKeyRef = useRef<string | null>(null);

  const clearAiState = useCallback(() => {
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setAiStage("idle");
    setAiFailedStage(null);
    setAiTranslation(null);
    setAiInterpretation(null);
    setAiErrorCode(null);
    setAiFallbackActive(false);
  }, []);

  const resetToPreset = useCallback(
    (targetPresetId: CasePresetId) => {
      requestIdRef.current += 1;
      clearAiState();
      const preset = getCasePresetById(targetPresetId);
      setQuery(toQuery(preset));
      setResult(preset.result);
      setLoading(false);
      setErrorCode(null);
      setAdvancedOpen(defaultAdvancedOpen);
      setCustomSeasonPinned(false);
      setBasePresetId(targetPresetId);
      setIsDerived(false);
      setScanItems(null);
    },
    [clearAiState, defaultAdvancedOpen],
  );

  const applyInvestigationError = useCallback((err: unknown) => {
    const code = err instanceof ClientInvestigationError ? err.code : "NASA_UPSTREAM_ERROR";
    setErrorCode(code);
    if (code === "INVALID_COORDINATES") {
      setAdvancedOpen(true);
    }
  }, []);

  useEffect(() => {
    if (liveDispatchKey && initialLiveQuery) {
      if (lastLiveKeyRef.current === liveDispatchKey) return;
      lastLiveKeyRef.current = liveDispatchKey;
      hasMountedRef.current = true;
      clearAiState();
      setQuery(initialLiveQuery);
      setCustomSeasonPinned(true);
      setBasePresetId(null);
      setIsDerived(false);
      setScanItems(null);
      if (!isValidPeriodRange(initialLiveQuery.startYear, initialLiveQuery.endYear)) {
        setAdvancedOpen(true);
      }
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
    liveDispatchKey,
    initialLiveQuery,
    resetToPreset,
    applyInvestigationError,
    clearAiState,
  ]);

  const handleRestore = () => {
    resetToPreset(basePresetId ?? presetId);
  };

  const executeInvestigation = async (targetQuery: InvestigationQuery) => {
    const thisRequestId = ++requestIdRef.current;
    clearAiState();
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

  const handleAskAi = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed) return;

    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;
    const thisRequestId = ++requestIdRef.current;

    let currentFailedStage: AiFailedStage = "translating";
    setAiStage("translating");
    setAiFailedStage(null);
    setAiErrorCode(null);
    setErrorCode(null);
    setAiTranslation(null);
    setAiInterpretation(null);
    setAiFallbackActive(false);

    const activeContext = {
      lat: query.lat,
      lon: query.lon,
      ...(query.label ? { label: query.label } : {}),
      variable: query.variable,
      season: query.season,
      startYear: query.startYear,
      endYear: query.endYear,
    };

    try {
      const translatePayload = {
        question: trimmed,
        lang: locale,
        currentContext: activeContext,
      };
      let translation: AiTranslateResult;
      let usedFallback = false;
      let skipRemoteInterpret = false;

      try {
        translation = await requestAiTranslate(translatePayload, controller.signal);
      } catch (translateErr) {
        if (!isAiOutageError(translateErr)) {
          throw translateErr;
        }
        translation = translateQuestionWithLocalFallback(translatePayload);
        usedFallback = true;
        skipRemoteInterpret =
          translateErr instanceof ClientAiError &&
          (translateErr.code === "AI_NOT_CONFIGURED" || translateErr.code === "AI_RATE_LIMITED");
      }

      if (thisRequestId !== requestIdRef.current) return;
      setAiTranslation(translation);
      setAiFallbackActive(usedFallback);

      if (!translation.inScope) {
        setAiStage("done");
        return;
      }

      currentFailedStage = "computing";
      setAiStage("computing");
      const resolvedLocation = await resolveAiLocation(
        translation.filters,
        activeContext,
        controller.signal,
      );
      if (thisRequestId !== requestIdRef.current) return;

      const nextQuery: InvestigationQuery = {
        lat: resolvedLocation.lat,
        lon: resolvedLocation.lon,
        label: resolvedLocation.label,
        variable: translation.filters.variable,
        season: translation.filters.season,
        startYear: translation.filters.startYear,
        endYear: translation.filters.endYear,
      };
      setQuery(nextQuery);
      setCustomSeasonPinned(true);

      let nextResult: InvestigationResult;
      let scanFindings: AiScanFindingInput[] | undefined;

      if (translation.filters.runMultiVariableScan) {
        const items = await scanAllVariablesWithFdr({
          lat: nextQuery.lat,
          lon: nextQuery.lon,
          label: nextQuery.label,
          startYear: nextQuery.startYear,
          endYear: nextQuery.endYear,
          seasonOverride: nextQuery.season,
        });
        if (thisRequestId !== requestIdRef.current) return;
        setScanItems(items);
        const primaryItem = items.find((item) => item.variable === nextQuery.variable) ?? items[0];
        nextResult = primaryItem ? primaryItem.result : await investigateClientSide(nextQuery);
        scanFindings = items.map((item) => ({
          variable: item.variable,
          season: item.season,
          senSlopePerDecade: item.result.stats.senSlopePerDecade,
          pValue: item.result.stats.pValue,
          qValue: item.qValue,
          fdrSignificant: item.fdrSignificant,
          verdict: item.result.stats.verdict,
          direction: item.result.stats.direction,
        }));
      } else {
        setScanItems(null);
        nextResult = await investigateClientSide(nextQuery);
      }

      if (thisRequestId !== requestIdRef.current) return;
      setResult(nextResult);
      if (basePresetId !== null) setIsDerived(true);

      currentFailedStage = "interpreting";
      setAiStage("interpreting");
      const interpretPayload = {
        question: trimmed,
        lang: locale,
        ...(translation.limitationNotice ? { limitationNotice: translation.limitationNotice } : {}),
        location: nextResult.location,
        variable: nextResult.variable,
        unit: nextResult.unit,
        season: nextResult.season,
        stats: nextResult.stats,
        extremeYears: extractExtremeYearsForAi(nextResult.series),
        ...(scanFindings ? { scanSummary: scanFindings } : {}),
      };

      let interpretation: AiInterpretResult;
      if (skipRemoteInterpret) {
        interpretation = interpretWithLocalFallback(interpretPayload, tempUnit);
      } else {
        try {
          interpretation = await requestAiInterpret(interpretPayload, controller.signal);
        } catch (interpretErr) {
          if (!isAiOutageError(interpretErr)) {
            throw interpretErr;
          }
          usedFallback = true;
          interpretation = interpretWithLocalFallback(interpretPayload, tempUnit);
        }
      }

      if (thisRequestId !== requestIdRef.current) return;
      setAiFallbackActive(usedFallback);
      setAiInterpretation(interpretation);
      setAiStage("done");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (thisRequestId !== requestIdRef.current) return;

      if (err instanceof ClientAiError) {
        setAiErrorCode(err.code);
        setAiFailedStage(currentFailedStage);
        setAiStage("error");
        return;
      }
      if (err instanceof ClientInvestigationError) {
        applyInvestigationError(err);
        setAiFailedStage(currentFailedStage);
        setAiStage("error");
        return;
      }
      setAiErrorCode("AI_UPSTREAM_ERROR");
      setAiFailedStage(currentFailedStage);
      setAiStage("error");
    }
  };

  const applyNextQuery = (nextQuery: InvestigationQuery, options?: { clearScan?: boolean }) => {
    clearAiState();
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
    clearAiState();
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
  const isAiBusy =
    aiStage === "translating" || aiStage === "computing" || aiStage === "interpreting";
  const activeLocationDisplay = query.label ?? `${query.lat.toFixed(2)}, ${query.lon.toFixed(2)}`;
  const activeFilterSummaryLine = `${t(`variables.${query.variable}.shortLabel`)} · ${t(`seasons.${query.season}`)} · ${activeLocationDisplay} · ${query.startYear}–${query.endYear}${
    isPeriodValid ? ` (${t("form.periodSpanYears", { count: selectedSpan })})` : ""
  }`;

  return (
    <section id="investigation" className="border-b border-border px-4 py-8 sm:px-6 sm:py-10">
      {isDerived && basePresetId !== null && (
        <div className="mb-3 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wide text-text-muted">
          <span>{t("cases.derivedBanner", { id: basePresetId })}</span>
          <button type="button" onClick={handleRestore} className="text-accent hover:underline">
            {t("cases.restoreAction")}
          </button>
        </div>
      )}

      <div className="mb-8 space-y-4 border border-border bg-surface p-3 sm:p-4">
        <AiAssistantBar
          question={aiQuestion}
          onQuestionChange={setAiQuestion}
          onAskQuestion={(q) => {
            void handleAskAi(q);
          }}
          stage={aiStage}
          failedStage={aiFailedStage}
          isBusy={isAiBusy || loading}
          translation={aiTranslation}
          interpretation={aiInterpretation}
          errorCode={aiErrorCode}
          fallbackActive={aiFallbackActive}
          hasScanApplied={scanItems !== null}
          filterSummaryLine={activeFilterSummaryLine}
          advancedOpen={advancedOpen}
          onToggleAdvanced={() => setAdvancedOpen((open) => !open)}
          onOpenAdvancedForRecovery={() => setAdvancedOpen(true)}
        />

        {periodValidationMessage && (
          <p
            role="status"
            className="border border-accent/60 bg-bg px-3 py-2 font-sans text-xs text-accent"
          >
            {periodValidationMessage}
          </p>
        )}

        {advancedOpen && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t border-border pt-4">
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
                currentLabel={activeLocationDisplay}
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
                  clearAiState();
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
            </div>
          </form>
        )}

        {scanItems && (
          <div className="overflow-x-auto border border-border bg-bg p-3">
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
                        {t(`variables.${item.variable}.shortLabel`)} · {t(`seasons.${item.season}`)}
                      </td>
                      <td className={`py-1.5 pr-3 ${DIRECTION_COLOR[item.result.stats.direction]}`}>
                        {itemSlopeDecade > 0 ? "+" : ""}
                        {formatNumber(itemSlopeDecade, {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {itemUnit}
                        {t("form.scanUnitPerDecade")}
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

        {errorCode && (
          <div className="border border-accent bg-bg p-3">
            <p className="font-mono text-xs uppercase tracking-wide text-accent">
              {t("errors.title")}
            </p>
            <p className="mt-1 font-sans text-sm text-text-muted">{t(`errors.${errorCode}`)}</p>
            <p className="mt-2 font-mono text-xs text-text-muted">{t("errors.stillShowing")}</p>
          </div>
        )}
      </div>

      <p className="max-w-2xl font-display text-xl text-text">{headline}</p>

      <p
        className={`mt-3 font-mono text-sm uppercase tracking-wide ${DIRECTION_COLOR[stats.direction]}`}
      >
        {DIRECTION_ARROW[stats.direction]} {verdictText}
      </p>

      <AiSynthesisPanel
        interpretation={aiInterpretation}
        isInterpreting={aiStage === "interpreting"}
        onSelectFollowUp={(followUpText) => {
          setAiQuestion(followUpText);
          void handleAskAi(followUpText);
        }}
      />

      <div className="mt-6 border border-border bg-surface p-3 sm:p-4">
        <TrendChart series={series} unit={unit} variable={variable} />
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-3">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wide text-text hover:border-accent"
        >
          {t("actions.share")}
        </button>
      </div>

      {shareOpen && (
        <div className="mt-4">
          <ShareSheet
            result={result}
            locale={locale}
            tempUnit={tempUnit}
            onClose={() => setShareOpen(false)}
          />
        </div>
      )}

      <div className="mt-6">
        <SatelliteTimelapse
          location={location}
          startYear={stats.startYear}
          endYear={stats.endYear}
          defaultExpanded
          initialMode={initialSatellite?.mode}
          initialLayer={initialSatellite?.layer}
          initialYear={initialSatellite?.year}
          deepLinkContext={
            !isDerived && basePresetId ? { presetId: basePresetId } : { investigation: query }
          }
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
            {aiTranslation && <AiLayer1TranslationDetails translation={aiTranslation} />}
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
    </section>
  );
}
