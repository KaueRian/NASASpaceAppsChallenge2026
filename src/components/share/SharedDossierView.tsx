import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/i18n.tsx";
import { useOptionalTemperatureUnit } from "../../i18n/temperatureUnit.tsx";
import type { SatelliteDeepLinkState } from "../../lib/routing.ts";
import type { SavedDossier } from "../../types/investigation.ts";
import { EvidenceCard } from "./EvidenceCard.tsx";
import { SatelliteTimelapse } from "./SatelliteTimelapse.tsx";

export interface SharedDossierViewProps {
  dossierId: string;
  initialSatellite?: SatelliteDeepLinkState;
  onStartNewInvestigation?: () => void;
}

export function SharedDossierView({
  dossierId,
  initialSatellite,
  onStartNewInvestigation,
}: SharedDossierViewProps) {
  const { t } = useI18n();
  const tempUnit = useOptionalTemperatureUnit();
  const [dossier, setDossier] = useState<SavedDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

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
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dossierId]);

  if (loading) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="border border-border bg-surface p-8 text-center font-mono text-sm text-text-muted">
          {t("dossier.sharedLoading", { id: dossierId })}
        </div>
      </section>
    );
  }

  if (error || !dossier) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="border border-accent bg-surface p-8 text-center text-text">
          <h2 className="font-display text-2xl">{t("dossier.sharedNotFoundTitle")}</h2>
          <p className="mt-2 font-sans text-sm text-text-muted">
            {t("dossier.sharedNotFoundBody")}
          </p>
          <a
            href="/"
            onClick={(e) => {
              if (onStartNewInvestigation) {
                e.preventDefault();
                onStartNewInvestigation();
              }
            }}
            className="mt-5 inline-block border border-border bg-bg px-4 py-2 font-mono text-xs uppercase tracking-wider text-text hover:border-accent"
          >
            {t("dossier.sharedBackHome")}
          </a>
        </div>
      </section>
    );
  }

  const permalink =
    typeof window !== "undefined" ? `${window.location.origin}/dossier/${dossier.id}` : undefined;

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface p-4 text-text">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
            {t("dossier.sharedBadge", { id: dossier.id })}
          </span>
          <h2 className="mt-1 font-display text-xl">{dossier.result.location.label}</h2>
        </div>
        <a
          href="/"
          onClick={(e) => {
            if (onStartNewInvestigation) {
              e.preventDefault();
              onStartNewInvestigation();
            }
          }}
          className="bg-accent px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-bg hover:opacity-90"
        >
          {t("dossier.sharedOpenNew")}
        </a>
      </div>

      <div className="flex justify-center overflow-x-auto">
        <EvidenceCard
          result={dossier.result}
          aspect="story"
          shortUrl={permalink}
          tempUnit={tempUnit}
        />
      </div>

      <SatelliteTimelapse
        location={dossier.result.location}
        startYear={dossier.result.stats.startYear}
        endYear={dossier.result.stats.endYear}
        defaultExpanded
        initialMode={initialSatellite?.mode}
        initialLayer={initialSatellite?.layer}
        initialYear={initialSatellite?.year}
        deepLinkContext={{ dossierId: dossier.id }}
      />
    </section>
  );
}
