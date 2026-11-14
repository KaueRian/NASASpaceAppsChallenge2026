import { useI18n } from "../i18n/i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> would need a visible <legend>, heavier than this compact toggle needs — role="group" + aria-label is the intentional choice.
    <div className="font-mono text-xs tracking-wide" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={locale === "en" ? "text-text" : "text-text-muted hover:text-text"}
      >
        EN
      </button>
      <span className="text-text-muted"> | </span>
      <button
        type="button"
        onClick={() => setLocale("pt")}
        aria-pressed={locale === "pt"}
        className={locale === "pt" ? "text-text" : "text-text-muted hover:text-text"}
      >
        PT
      </button>
    </div>
  );
}
