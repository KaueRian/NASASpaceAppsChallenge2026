import { useI18n } from "../i18n/i18n";
import { LanguageToggle } from "./LanguageToggle";

export type SectionId = "investigation" | "cases";

interface AppHeaderProps {
  onNavigateSection: (id: SectionId) => void;
  onNavigateMethods: () => void;
  onNavigateHome: () => void;
}

export function AppHeader({
  onNavigateSection,
  onNavigateMethods,
  onNavigateHome,
}: AppHeaderProps) {
  const { t } = useI18n();

  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4">
        <button type="button" onClick={onNavigateHome} className="font-display text-lg text-text">
          {t("nav.wordmark")}
        </button>

        <nav className="flex flex-wrap items-center gap-6 font-sans text-sm text-text-muted">
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
        </nav>

        <LanguageToggle />
      </div>
    </header>
  );
}
