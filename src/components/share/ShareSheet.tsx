import { useState } from "react";
import type { InvestigationResult, SavedDossier } from "../../types/investigation.ts";
import { downloadEvidenceCardPng, EvidenceCard, type EvidenceCardAspect } from "./EvidenceCard.tsx";

export interface ShareSheetProps {
  result: InvestigationResult;
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

export function ShareSheet({ result, onClose }: ShareSheetProps) {
  const [aspect, setAspect] = useState<EvidenceCardAspect>("story");
  const [shareUrl, setShareUrl] = useState<string>(() => buildInvestigationDeepLink(result));
  const [copied, setCopied] = useState(false);
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
      className="rounded-sm border border-[#D4A84F]/40 bg-[#1B1613] p-5 text-[#F4EFE6] shadow-2xl"
    >
      <div className="mb-4 flex items-center justify-between border-b border-[#F4EFE6]/15 pb-3">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#D4A84F]">
            EVIDENCE EXPORT · SHARE DOSSIER
          </span>
          <h4 className="font-serif text-lg font-bold">Forensic Evidence Card</h4>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#F4EFE6]/25 px-2.5 py-1 font-mono text-xs hover:border-[#D4A84F]"
          >
            ESC / CLOSE
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded border border-[#F4EFE6]/20 p-0.5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setAspect("story")}
            className={`rounded px-3 py-1 ${
              aspect === "story" ? "bg-[#D4A84F] font-bold text-[#14110F]" : "text-[#F4EFE6]/80"
            }`}
          >
            Story 9:16
          </button>
          <button
            type="button"
            onClick={() => setAspect("square")}
            className={`rounded px-3 py-1 ${
              aspect === "square" ? "bg-[#D4A84F] font-bold text-[#14110F]" : "text-[#F4EFE6]/80"
            }`}
          >
            Square 1:1
          </button>
        </div>

        <div className="flex flex-wrap gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={() => downloadEvidenceCardPng(result, aspect, shareUrl)}
            className="rounded bg-[#C83E2B] px-3.5 py-1.5 font-bold text-[#F4EFE6] hover:bg-[#b13322]"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={savingLink}
            className="rounded border border-[#D4A84F] px-3.5 py-1.5 font-bold text-[#D4A84F] hover:bg-[#D4A84F]/10"
          >
            {copied ? "Link Copied!" : savingLink ? "Saving..." : "Copy Case Link"}
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="rounded border border-[#F4EFE6]/30 px-3 py-1.5 text-[#F4EFE6] hover:border-[#F4EFE6]"
            >
              Share…
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-center overflow-x-auto py-2">
        <EvidenceCard result={result} aspect={aspect} shortUrl={shareUrl} />
      </div>
    </section>
  );
}
