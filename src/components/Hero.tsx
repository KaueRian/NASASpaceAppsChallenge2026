import { getCasePresetById } from "../data/presets";
import { useI18n } from "../i18n/i18n";
import { ClimateStripes } from "./share";

function scrollSectionIntoView(id: string) {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
}

export function Hero() {
  const { t } = useI18n();
  const featuredPreset = getCasePresetById("01");

  return (
    <section className="border-b border-border px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            {t("hero.eyebrow")}
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-2xl leading-tight text-text sm:text-4xl">
            {t("hero.title")}
          </h1>
          <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-text-muted">
            {t("hero.subtitle")}
          </p>

          <div className="mt-6 flex flex-wrap gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => scrollSectionIntoView("investigation")}
              className="border border-accent bg-surface px-4 py-2 font-mono text-xs uppercase tracking-wide text-text transition-colors hover:bg-bg motion-reduce:transition-none"
            >
              {t("hero.ctaInvestigate")}
            </button>
            <button
              type="button"
              onClick={() => scrollSectionIntoView("cases")}
              className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wide text-text-muted transition-colors hover:border-text-muted hover:text-text motion-reduce:transition-none"
            >
              {t("hero.ctaCases")}
            </button>
          </div>
        </div>

        <div className="border border-border bg-surface p-4 lg:col-span-5">
          <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-wider text-text-muted">
            <span className="truncate">{featuredPreset.result.location.label}</span>
            <span className="shrink-0">
              {featuredPreset.result.stats.startYear}–{featuredPreset.result.stats.endYear}
            </span>
          </div>
          <div className="overflow-hidden">
            <ClimateStripes
              series={featuredPreset.result.series}
              variable={featuredPreset.variable}
              height={72}
              tone="dark"
            />
          </div>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-text-muted">
            {t("hero.stripesCaption")}
          </p>
        </div>
      </div>
    </section>
  );
}
