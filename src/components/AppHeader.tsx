import { useI18n } from "../i18n/i18n";
import { LanguageToggle } from "./LanguageToggle";

export type SectionId = "investigation" | "cases";

interface AppHeaderProps {
  onNavigateSection: (id: SectionId) => void;
  onNavigateMethods: () => void;
  onNavigateExplore: () => void;
  onNavigateHome: () => void;
}

export function AppHeader({
  onNavigateSection,
  onNavigateMethods,
  onNavigateExplore,
  onNavigateHome,
}: AppHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:gap-x-6 sm:px-6 sm:py-4">
        <button
          type="button"
          onClick={onNavigateHome}
          className="font-display text-base text-text sm:text-lg"
        >
          {t("nav.wordmark")}
        </button>

        <nav className="flex flex-wrap items-center gap-4 font-sans text-sm text-text-muted sm:gap-6">
          <button
            type="button"
            onClick={() => onNavigateSection("investigation")}
            className="hover:text-text"
          >
            {t("nav.investigate")}
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection("cases")}
            className="hover:text-text"
          >
            {t("nav.cases")}
          </button>
          <button type="button" onClick={onNavigateMethods} className="hover:text-text">
            {t("nav.methods")}
          </button>
          <button
            type="button"
            onClick={onNavigateExplore}
            className="rounded-full border border-accent px-3 py-1 font-mono text-xs font-bold uppercase tracking-wide text-accent transition-colors hover:bg-accent hover:text-bg"
          >
            {t("nav.explore")}
          </button>
        </nav>

        <LanguageToggle />
      </div>
    </header>
  );
}
