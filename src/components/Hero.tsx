import { useI18n } from "../i18n/i18n";

export function Hero() {
  const { t } = useI18n();

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="border-b border-border px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
        {t("hero.eyebrow")}
      </p>
      <h1 className="mt-2 max-w-2xl font-display text-3xl text-text">{t("hero.title")}</h1>
      <p className="mt-2 max-w-2xl font-sans text-sm text-text-muted">{t("hero.subtitle")}</p>

      <div className="mt-6 flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => scrollTo("investigation")}
          className="border border-accent px-4 py-2 font-mono text-xs uppercase tracking-wide text-text hover:bg-surface"
        >
          {t("hero.ctaInvestigate")}
        </button>
        <button
          type="button"
          onClick={() => scrollTo("cases")}
          className="border border-border px-4 py-2 font-mono text-xs uppercase tracking-wide text-text-muted hover:border-text-muted"
        >
          {t("hero.ctaCases")}
        </button>
      </div>
    </section>
  );
}
