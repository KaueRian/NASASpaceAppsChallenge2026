import { useI18n } from "../i18n/i18n";

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="border-b border-border px-6 py-10">
      <h1 className="font-display text-3xl text-text">{t("hero.title")}</h1>
      <p className="mt-2 max-w-2xl font-sans text-sm text-text-muted">{t("hero.subtitle")}</p>
    </section>
  );
}
