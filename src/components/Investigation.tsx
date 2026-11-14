import { useState } from "react";
import { getCasePresetById } from "../data/presets";
import { useI18n } from "../i18n/i18n";
import type { CasePresetId, TrendDirection } from "../types/investigation";
import { buildCitationText, ShareSheet } from "./share";

interface InvestigationProps {
  presetId: CasePresetId;
  onNavigateMethods: () => void;
}

const UNIT_SUFFIX: Record<string, string> = { C: "°C", mm: " mm", pct: "%" };

const DIRECTION_COLOR: Record<TrendDirection, string> = {
  warming: "text-dir-warm",
  cooling: "text-dir-cool",
  wetter: "text-dir-wet",
  drier: "text-dir-dry",
  neutral: "text-text-muted",
};

const DIRECTION_ARROW: Record<TrendDirection, string> = {
  warming: "↑",
  cooling: "↓",
  wetter: "↑",
  drier: "↓",
  neutral: "–",
};

export function Investigation({ presetId, onNavigateMethods }: InvestigationProps) {
  const { t, formatNumber } = useI18n();
  const [methodOpen, setMethodOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const preset = getCasePresetById(presetId);
  const { result } = preset;
  const { stats, location, variable, season, unit } = result;

  const formatPValue = (p: number) =>
    p < 0.001 ? "< 0.001" : `= ${formatNumber(p, { maximumFractionDigits: 3 })}`;

  const unitSuffix = UNIT_SUFFIX[unit] ?? "";
  const change = formatNumber(Math.abs(stats.totalChangeOverPeriod), { maximumFractionDigits: 1 });
  const signedChange = `${stats.totalChangeOverPeriod >= 0 ? "+" : "−"}${change}${unitSuffix}`;

  const headline = t("result.headline", {
    variable: t(`variableName.${variable}`),
    location: location.label,
    change: signedChange,
    startYear: stats.startYear,
    direction: t(`direction.${stats.direction}`),
  });

  return (
    <section id="investigation" className="border-b border-border px-6 py-10">
      <div className="mb-6 flex flex-wrap gap-x-8 gap-y-1 font-mono text-xs uppercase tracking-wide text-text-muted">
        <span>
          {t("investigation.locationLabel")}: {location.label}
        </span>
        <span>
          {t("investigation.variableLabel")}: {t(`variableName.${variable}`)}
        </span>
        <span>
          {t("investigation.seasonLabel")}: {t(`season.${season}`)}
        </span>
        <span>
          {t("investigation.yearsLabel")}: {stats.startYear}–{stats.endYear}
        </span>
      </div>

      <p className="max-w-2xl font-display text-xl text-text">{headline}</p>

      <p
        className={`mt-3 font-mono text-sm uppercase tracking-wide ${DIRECTION_COLOR[stats.direction]}`}
      >
        {DIRECTION_ARROW[stats.direction]}{" "}
        {stats.verdict === "INSUFFICIENT_EVIDENCE" ? (
          t(`verdict.${stats.verdict}`)
        ) : (
          <>
            {t(`verdict.${stats.verdict}`)} · p {formatPValue(stats.pValue)}
          </>
        )}
      </p>

      <div className="mt-6 flex min-h-32 items-center justify-center border border-dashed border-border bg-surface text-sm text-text-muted">
        {t("investigation.chartPlaceholder")}
      </div>

      <div className="mt-6 border-t border-border pt-4">
        <p className="font-mono text-xs text-text-muted">
          {t("investigation.methodLine", { years: stats.nYears, headline })}
        </p>

        <button
          type="button"
          onClick={() => setMethodOpen((open) => !open)}
          className="mt-2 font-sans text-xs text-accent hover:underline"
        >
          {methodOpen ? t("investigation.hideMethod") : t("investigation.seeMethod")}
        </button>

        {methodOpen && (
          <div className="mt-3 space-y-1 font-mono text-xs text-text-muted">
            <p>
              Z = {formatNumber(stats.zScore, { maximumFractionDigits: 2 })}, p{" "}
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
              {t("investigation.fullMethod")}
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
          {t("investigation.share")}
        </button>
      </div>

      {shareOpen && <ShareSheet result={result} onClose={() => setShareOpen(false)} />}
    </section>
  );
}
