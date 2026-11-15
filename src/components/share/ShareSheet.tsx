import { useState } from "react";
import { type Locale, useResolvedI18n } from "../../i18n/i18n.tsx";
import { useOptionalTemperatureUnit } from "../../i18n/temperatureUnit.tsx";
import {
  type AcademicCitationFormat,
  buildAcademicCitation,
  downloadDossierCsv,
} from "../../lib/export/dossierExport.ts";
import type { TemperatureUnit } from "../../lib/temperatureUnit.ts";
import type { InvestigationResult, SavedDossier } from "../../types/investigation.ts";
import { downloadEvidenceCardPng, EvidenceCard, type EvidenceCardAspect } from "./EvidenceCard.tsx";

const ASPECT_OPTIONS: ReadonlyArray<{ id: EvidenceCardAspect; labelKey: string }> = [
  { id: "story", labelKey: "share.aspectStory" },
  { id: "square", labelKey: "share.aspectSquare" },
  { id: "slide", labelKey: "share.aspectSlide" },
  { id: "paper", labelKey: "share.aspectPaper" },
];

const CITATION_FORMATS: readonly AcademicCitationFormat[] = ["summary", "abnt", "apa", "bibtex"];

export interface ShareSheetProps {
  result: InvestigationResult;
  locale?: Locale;
  tempUnit?: TemperatureUnit;
  onClose?: () => void;
}

export function buildInvestigationDeepLink(result: InvestigationResult, origin = ""): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  if (result.presetId) {
    return `${base}/?case=${result.presetId}`;
  }
  const params = new URLSearchParams({
    lat: result.location.lat.toFixed(4),
    lon: result.location.lon.toFixed(4),
    variable: result.variable,
    season: result.season,
    label: result.location.label,
  });
  return `${base}/investigate?${params.toString()}`;
}

export function ShareSheet({ result, locale, tempUnit, onClose }: ShareSheetProps) {
  const { locale: resolvedLocale, t } = useResolvedI18n(locale);
  const contextTempUnit = useOptionalTemperatureUnit();
  const resolvedTempUnit = tempUnit ?? contextTempUnit;
  const [aspect, setAspect] = useState<EvidenceCardAspect>("story");
  const [citationFormat, setCitationFormat] = useState<AcademicCitationFormat>("summary");
  const [shareUrl, setShareUrl] = useState<string>(() => buildInvestigationDeepLink(result));
  const [copied, setCopied] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [savingLink, setSavingLink] = useState(false);

  const formattedCitation = buildAcademicCitation(result, citationFormat, {
    locale: resolvedLocale,
    tempUnit: resolvedTempUnit,
    shareUrl,
  });

  async function handleCopyLink() {
    setSavingLink(true);
    let finalUrl = shareUrl;

    try {
      const res = await fetch("/api/dossiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: result.location.lat,
          lon: result.location.lon,
          locationLabel: result.location.label,
          variable: result.variable,
          season: result.season,
          startYear: result.stats.startYear,
          endYear: result.stats.endYear,
        }),
      });
      if (res.ok) {
        const saved = (await res.json()) as SavedDossier;
        finalUrl = `${window.location.origin}/dossier/${saved.id}`;
        setShareUrl(finalUrl);
      }
    } catch {
      // Offline / static fallback: keep query-string deep link
    } finally {
      setSavingLink(false);
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  async function handleCopyCitation() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(formattedCitation);
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2500);
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `GeoTrend — ${result.location.label}`,
          text: t("share.nativeShareSummary", {
            location: result.location.label,
            variable: t(`variables.${result.variable}.label`),
            startYear: result.stats.startYear,
            endYear: result.stats.endYear,
            verdict: t(`share.card.verdictShort.${result.stats.verdict}`),
          }),
          url: shareUrl,
        });
      } catch {
        // User dismissed native share dialog
      }
    }
  }

  const activeFormatLabel = t(`share.citationFormats.${citationFormat}`);
  const copyCitationLabel =
    citationFormat === "summary"
      ? copiedCitation
        ? t("actions.citationCopied")
        : t("actions.copyCitation")
      : copiedCitation
        ? t("share.citationCopiedLabel", { format: activeFormatLabel })
        : t("share.copyAcademicCitation", { format: activeFormatLabel });

  return (
    <section
      aria-label={t("share.sheetAriaLabel")}
      className="rounded-sm border border-[#2E2E30] bg-[#1C1C1E] p-5 text-[#EDEDEA] shadow-2xl"
    >
      <div className="mb-4 flex items-center justify-between border-b border-[#2E2E30] pb-3">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#C1472E]">
            {t("share.eyebrow")}
          </span>
          <h4 className="font-display text-lg font-bold">{t("share.title")}</h4>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#2E2E30] px-2.5 py-1 font-mono text-xs text-[#9B9B98] hover:border-[#C1472E] hover:text-[#EDEDEA]"
          >
            {t("share.closeButton")}
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap rounded border border-[#2E2E30] p-0.5 font-mono text-xs">
          {ASPECT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setAspect(option.id)}
              aria-pressed={aspect === option.id}
              className={`rounded px-3 py-1 ${
                aspect === option.id ? "bg-[#C1472E] font-bold text-[#EDEDEA]" : "text-[#9B9B98]"
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() =>
              downloadEvidenceCardPng(result, aspect, shareUrl, resolvedTempUnit, resolvedLocale)
            }
            className="rounded bg-[#C1472E] px-3.5 py-1.5 font-bold text-[#EDEDEA] hover:opacity-90"
          >
            {t("actions.downloadPng")}
          </button>
          <button
            type="button"
            onClick={() => downloadDossierCsv(result, resolvedTempUnit)}
            className="rounded border border-[#2E2E30] bg-[#121212] px-3.5 py-1.5 font-bold text-[#EDEDEA] hover:border-[#C1472E]"
          >
            {t("actions.downloadCsv")}
          </button>
          <button
            type="button"
            onClick={handleCopyCitation}
            className="rounded border border-[#2E2E30] bg-[#121212] px-3.5 py-1.5 font-bold text-[#EDEDEA] hover:border-[#C1472E]"
          >
            {copyCitationLabel}
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={savingLink}
            className="rounded border border-[#C1472E] px-3.5 py-1.5 font-bold text-[#C1472E] hover:bg-[#C1472E]/10"
          >
            {copied
              ? t("actions.linkCopied")
              : savingLink
                ? t("share.savingLink")
                : t("actions.copyLink")}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="rounded border border-[#2E2E30] px-3 py-1.5 text-[#EDEDEA] hover:border-[#EDEDEA]"
            >
              {t("share.nativeShare")}
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-center overflow-x-auto py-2">
        <EvidenceCard
          result={result}
          aspect={aspect}
          shortUrl={shareUrl}
          locale={resolvedLocale}
          tempUnit={resolvedTempUnit}
        />
      </div>

      <div className="mt-4 rounded border border-[#2E2E30] bg-[#121212] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#9B9B98]">
            {t("share.citationFormatLabel")}
          </span>
          <div className="inline-flex rounded border border-[#2E2E30] p-0.5 font-mono text-xs">
            {CITATION_FORMATS.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => {
                  setCitationFormat(fmt);
                  setCopiedCitation(false);
                }}
                aria-pressed={citationFormat === fmt}
                className={`rounded px-2.5 py-1 ${
                  citationFormat === fmt
                    ? "bg-[#C1472E] font-bold text-[#EDEDEA]"
                    : "text-[#9B9B98] hover:text-[#EDEDEA]"
                }`}
              >
                {t(`share.citationFormats.${fmt}`)}
              </button>
            ))}
          </div>
        </div>
        <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[#EDEDEA]/90">
          {formattedCitation}
        </pre>
      </div>
    </section>
  );
}
