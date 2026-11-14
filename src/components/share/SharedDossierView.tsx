import { useEffect, useState } from "react";
import type { SavedDossier } from "../../types/investigation.ts";
import { EvidenceCard } from "./EvidenceCard.tsx";
import { SatelliteTimelapse } from "./SatelliteTimelapse.tsx";

export interface SharedDossierViewProps {
  dossierId: string;
  onStartNewInvestigation?: () => void;
}

export function SharedDossierView({ dossierId, onStartNewInvestigation }: SharedDossierViewProps) {
  const [dossier, setDossier] = useState<SavedDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/dossiers/${encodeURIComponent(dossierId)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("DOSSIER_NOT_FOUND");
        }
        return (await res.json()) as SavedDossier;
      })
      .then((data) => {
        if (active) {
          setDossier(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError("This forensic case file could not be found or has expired.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dossierId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl rounded-sm border border-[#D4A84F]/40 bg-[#1B1613] p-8 text-center font-mono text-sm text-[#F4EFE6]">
        Retrieving archived case file {dossierId}…
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="mx-auto max-w-2xl rounded-sm border border-[#C83E2B] bg-[#1B1613] p-8 text-center text-[#F4EFE6]">
        <h2 className="font-serif text-xl font-bold">Case File Not Found</h2>
        <p className="mt-2 font-mono text-xs text-[#F4EFE6]/80">{error}</p>
        <a
          href="/"
          onClick={(e) => {
            if (onStartNewInvestigation) {
              e.preventDefault();
              onStartNewInvestigation();
            }
          }}
          className="mt-4 inline-block rounded bg-[#D4A84F] px-4 py-2 font-mono text-xs font-bold text-[#14110F]"
        >
          ← Return to Case Board
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-[#D4A84F]/40 bg-[#1B1613] p-4 text-[#F4EFE6]">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#D4A84F]">
            READ-ONLY ARCHIVED DOSSIER · ID {dossier.id}
          </span>
          <h2 className="font-serif text-lg font-bold">{dossier.result.location.label}</h2>
        </div>
        <a
          href="/"
          onClick={(e) => {
            if (onStartNewInvestigation) {
              e.preventDefault();
              onStartNewInvestigation();
            }
          }}
          className="rounded bg-[#D4A84F] px-4 py-2 font-mono text-xs font-bold text-[#14110F] hover:bg-[#e0b861]"
        >
          Open Your Own Investigation →
        </a>
      </div>

      <div className="flex justify-center">
        <EvidenceCard result={dossier.result} aspect="story" />
      </div>

      <SatelliteTimelapse
        location={dossier.result.location}
        startYear={dossier.result.stats.startYear}
        endYear={dossier.result.stats.endYear}
      />
    </div>
  );
}
