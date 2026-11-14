import { useEffect, useRef, useState } from "react";
import { getCasePresetById } from "../data/presets";
import { useI18n } from "../i18n/i18n";
import { ClientInvestigationError, investigateClientSide } from "../lib/nasa/clientInvestigate";
import { DIRECTION_ARROW, DIRECTION_COLOR, UNIT_SUFFIX } from "../lib/resultDisplay";
import type {
  CasePreset,
  CasePresetId,
  InvestigationErrorCode,
  InvestigationResult,
  SeasonId,
  VariableId,
} from "../types/investigation";
import { SEASON_IDS, VARIABLE_IDS } from "../types/investigation";
import { LocationPicker } from "./LocationPicker";
import { buildCitationText, ShareSheet } from "./share";
import { TrendChart } from "./TrendChart";

interface InvestigationProps {
  presetId: CasePresetId;
  onNavigateMethods: () => void;
}

interface InvestigationQuery {
  lat: number;
  lon: number;
  label?: string;
  variable: VariableId;
  season: SeasonId;
  startYear: number;
  endYear: number;
}

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

export function Investigation({ presetId, onNavigateMethods }: InvestigationProps) {
  const { t, formatNumber } = useI18n();
  const [methodOpen, setMethodOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [query, setQuery] = useState<InvestigationQuery>(() =>
    toQuery(getCasePresetById(presetId)),
  );
  const [result, setResult] = useState<InvestigationResult>(
    () => getCasePresetById(presetId).result,
  );
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<InvestigationErrorCode | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    requestIdRef.current += 1; // invalidate any in-flight request from the previous case
    const preset = getCasePresetById(presetId);
    setQuery(toQuery(preset));
    setResult(preset.result);
    setLoading(false);
    setErrorCode(null);
  }, [presetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const thisRequestId = ++requestIdRef.current;
    setLoading(true);
    setErrorCode(null);
    try {
      const next = await investigateClientSide(query);
      if (thisRequestId !== requestIdRef.current) return;
      setResult(next);
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return;
      setErrorCode(err instanceof ClientInvestigationError ? err.code : "NASA_UPSTREAM_ERROR");
    } finally {
      if (thisRequestId === requestIdRef.current) setLoading(false);
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

  return (
    <section id="investigation" className="border-b border-border px-6 py-10">
      <form onSubmit={handleSubmit} className="mb-8 space-y-4 border border-border bg-surface p-4">
        <LocationPicker
          lat={query.lat}
          lon={query.lon}
          onChange={(next) => setQuery((q) => ({ ...q, ...next }))}
        />

        <div className="flex flex-wrap gap-4">
          <label className="font-mono text-xs text-text-muted">
            {t("form.variableLabel")}
            <select
              value={query.variable}
              onChange={(e) => setQuery((q) => ({ ...q, variable: e.target.value as VariableId }))}
              className="ml-2 border border-border bg-bg px-2 py-1 font-sans text-sm text-text"
            >
              {VARIABLE_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(`variables.${id}.label`)}
                </option>
              ))}
            </select>
          </label>

          <label className="font-mono text-xs text-text-muted">
            {t("form.seasonLabel")}
            <select
              value={query.season}
              onChange={(e) => setQuery((q) => ({ ...q, season: e.target.value as SeasonId }))}
              className="ml-2 border border-border bg-bg px-2 py-1 font-sans text-sm text-text"
            >
              {SEASON_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(`seasons.${id}`)}
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
        </div>

        <p className="font-sans text-xs text-text-muted">{t("form.minYearsWarning")}</p>

        <button
          type="submit"
          disabled={loading}
          className="border border-accent px-4 py-2 font-mono text-xs uppercase tracking-wide text-text hover:bg-bg disabled:opacity-50"
        >
          {loading ? t("form.runningButton") : t("form.submitButton")}
        </button>

        {errorCode && <p className="font-sans text-xs text-accent">{t(`errors.${errorCode}`)}</p>}
      </form>

      <div className="mb-6 flex flex-wrap gap-x-8 gap-y-1 font-mono text-xs uppercase tracking-wide text-text-muted">
        <span>
          {t("form.locationLabel")}: {location.label}
        </span>
        <span>
          {t("form.variableLabel")}: {variableLabel}
        </span>
        <span>
          {t("form.seasonLabel")}: {seasonLabel}
        </span>
        <span>
          {t("investigation.yearsLabel")}: {stats.startYear}–{stats.endYear}
        </span>
      </div>

      <p className="max-w-2xl font-display text-xl text-text">{headline}</p>

      <p
        className={`mt-3 font-mono text-sm uppercase tracking-wide ${DIRECTION_COLOR[stats.direction]}`}
      >
        {DIRECTION_ARROW[stats.direction]} {verdictText}
      </p>

      <div className="mt-6 border border-border bg-surface p-4">
        <TrendChart series={series} unit={unit} />
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
            <p className="pt-2 text-text-muted">{buildCitationText(result)}</p>
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

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wide text-text hover:border-accent"
        >
          {t("actions.share")}
        </button>
      </div>

      {shareOpen && <ShareSheet result={result} onClose={() => setShareOpen(false)} />}
    </section>
  );
}
