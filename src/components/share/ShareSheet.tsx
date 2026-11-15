import { useState } from "react";
import { type Locale, useResolvedI18n } from "../../i18n/i18n.tsx";
import { useOptionalTemperatureUnit } from "../../i18n/temperatureUnit.tsx";
import {
  type AcademicCitationFormat,
  buildAcademicCitation,
  buildCitationText,
  downloadDossierCsv,
} from "../../lib/export/dossierExport.ts";
import type { TemperatureUnit } from "../../lib/temperatureUnit.ts";
import type { InvestigationResult, SavedDossier } from "../../types/investigation.ts";
import { downloadEvidenceCardPng, EvidenceCard, type EvidenceCardAspect } from "./EvidenceCard.tsx";

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
  const [shareUrl, setShareUrl] = useState<string>(() => buildInvestigationDeepLink(result));
  const [copied, setCopied] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [copiedAcademicFormat, setCopiedAcademicFormat] = useState<AcademicCitationFormat | null>(
    null,
  );

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
    const text = buildCitationText(result, resolvedLocale, resolvedTempUnit);
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2500);
    }
  }

  async function handleCopyAcademicCitation(format: AcademicCitationFormat) {
    const text = buildAcademicCitation(result, format, resolvedLocale, resolvedTempUnit, shareUrl);
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedAcademicFormat(format);
      setTimeout(() => setCopiedAcademicFormat(null), 2500);
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
        <div className="inline-flex rounded border border-[#2E2E30] p-0.5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setAspect("story")}
            className={`rounded px-3 py-1 ${
              aspect === "story" ? "bg-[#C1472E] font-bold text-[#EDEDEA]" : "text-[#9B9B98]"
            }`}
          >
            {t("share.aspectStory")}
          </button>
          <button
            type="button"
            onClick={() => setAspect("square")}
            className={`rounded px-3 py-1 ${
              aspect === "square" ? "bg-[#C1472E] font-bold text-[#EDEDEA]" : "text-[#9B9B98]"
            }`}
          >
            {t("share.aspectSquare")}
          </button>
          <button
            type="button"
            onClick={() => setAspect("paper")}
            className={`rounded px-3 py-1 ${
              aspect === "paper" ? "bg-[#C1472E] font-bold text-[#EDEDEA]" : "text-[#9B9B98]"
            }`}
          >
            {t("share.aspectPaper")}
          </button>
          <button
            type="button"
            onClick={() => setAspect("slide")}
            className={`rounded px-3 py-1 ${
              aspect === "slide" ? "bg-[#C1472E] font-bold text-[#EDEDEA]" : "text-[#9B9B98]"
            }`}
          >
            {t("share.aspectSlide")}
          </button>
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
            {copiedCitation ? t("actions.citationCopied") : t("actions.copyCitation")}
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

      <div className="mb-4 flex flex-wrap items-center gap-2 border-t border-[#2E2E30] pt-3 font-mono text-xs">
        <span className="text-[#9B9B98]">{t("share.academic.sectionTitle")}:</span>
        <button
          type="button"
          onClick={() => handleCopyAcademicCitation("bibtex")}
          className="rounded border border-[#2E2E30] bg-[#121212] px-3 py-1 font-bold text-[#EDEDEA] hover:border-[#C1472E]"
        >
          {copiedAcademicFormat === "bibtex"
            ? t("share.academic.copied")
            : t("share.academic.copyBibtex")}
        </button>
        <button
          type="button"
          onClick={() => handleCopyAcademicCitation("abnt")}
          className="rounded border border-[#2E2E30] bg-[#121212] px-3 py-1 font-bold text-[#EDEDEA] hover:border-[#C1472E]"
        >
          {copiedAcademicFormat === "abnt"
            ? t("share.academic.copied")
            : t("share.academic.copyAbnt")}
        </button>
        <button
          type="button"
          onClick={() => handleCopyAcademicCitation("apa")}
          className="rounded border border-[#2E2E30] bg-[#121212] px-3 py-1 font-bold text-[#EDEDEA] hover:border-[#C1472E]"
        >
          {copiedAcademicFormat === "apa"
            ? t("share.academic.copied")
            : t("share.academic.copyApa")}
        </button>
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
    </section>
  );
}
