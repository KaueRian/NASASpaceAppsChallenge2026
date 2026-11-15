import { useState } from "react";
import { useOptionalTemperatureUnit } from "../../i18n/temperatureUnit.tsx";
import { buildCitationText, downloadDossierCsv } from "../../lib/export/dossierExport.ts";
import type { TemperatureUnit } from "../../lib/temperatureUnit.ts";
import type { InvestigationResult, SavedDossier } from "../../types/investigation.ts";
import { downloadEvidenceCardPng, EvidenceCard, type EvidenceCardAspect } from "./EvidenceCard.tsx";

export interface ShareSheetProps {
  result: InvestigationResult;
  locale?: "en" | "pt";
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

export function ShareSheet({ result, locale = "en", tempUnit, onClose }: ShareSheetProps) {
  const contextTempUnit = useOptionalTemperatureUnit();
  const resolvedTempUnit = tempUnit ?? contextTempUnit;
  const [aspect, setAspect] = useState<EvidenceCardAspect>("story");
  const [shareUrl, setShareUrl] = useState<string>(() => buildInvestigationDeepLink(result));
  const [copied, setCopied] = useState(false);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [savingLink, setSavingLink] = useState(false);

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
    const text = buildCitationText(result, locale, resolvedTempUnit);
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedCitation(true);
      setTimeout(() => setCopiedCitation(false), 2500);
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `EarthTrend Detective — ${result.location.label}`,
          text: `${result.location.label} (${result.variable}, ${result.stats.startYear}–${result.stats.endYear}): ${result.stats.verdict}`,
          url: shareUrl,
        });
      } catch {
        // User dismissed native share dialog
      }
    }
  }

  return (
    <section
      aria-label="Export and Share Forensic Evidence Card"
      className="rounded-sm border border-[#2E2E30] bg-[#1C1C1E] p-5 text-[#EDEDEA] shadow-2xl"
    >
      <div className="mb-4 flex items-center justify-between border-b border-[#2E2E30] pb-3">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#C1472E]">
            EVIDENCE EXPORT · SHARE DOSSIER
          </span>
          <h4 className="font-display text-lg font-bold">Evidence Card & Data Export</h4>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#2E2E30] px-2.5 py-1 font-mono text-xs text-[#9B9B98] hover:border-[#C1472E] hover:text-[#EDEDEA]"
          >
            ESC / CLOSE
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
            Story 9:16
          </button>
          <button
            type="button"
            onClick={() => setAspect("square")}
            className={`rounded px-3 py-1 ${
              aspect === "square" ? "bg-[#C1472E] font-bold text-[#EDEDEA]" : "text-[#9B9B98]"
            }`}
          >
            Square 1:1
          </button>
        </div>

        <div className="flex flex-wrap gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => downloadEvidenceCardPng(result, aspect, shareUrl, resolvedTempUnit)}
            className="rounded bg-[#C1472E] px-3.5 py-1.5 font-bold text-[#EDEDEA] hover:opacity-90"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={() => downloadDossierCsv(result, resolvedTempUnit)}
            className="rounded border border-[#2E2E30] bg-[#121212] px-3.5 py-1.5 font-bold text-[#EDEDEA] hover:border-[#C1472E]"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={handleCopyCitation}
            className="rounded border border-[#2E2E30] bg-[#121212] px-3.5 py-1.5 font-bold text-[#EDEDEA] hover:border-[#C1472E]"
          >
            {copiedCitation ? "Citation Copied!" : "Copy Citation"}
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={savingLink}
            className="rounded border border-[#C1472E] px-3.5 py-1.5 font-bold text-[#C1472E] hover:bg-[#C1472E]/10"
          >
            {copied ? "Link Copied!" : savingLink ? "Saving..." : "Copy Share Link"}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="rounded border border-[#2E2E30] px-3 py-1.5 text-[#EDEDEA] hover:border-[#EDEDEA]"
            >
              Share…
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-center overflow-x-auto py-2">
        <EvidenceCard
          result={result}
          aspect={aspect}
          shortUrl={shareUrl}
          tempUnit={resolvedTempUnit}
        />
      </div>
    </section>
  );
}
