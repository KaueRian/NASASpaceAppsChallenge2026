import { useI18n } from "../i18n/i18n";

interface MethodsPageProps {
  onNavigateHome: () => void;
}

export function MethodsPage({ onNavigateHome }: MethodsPageProps) {
  const { t } = useI18n();

  const limitationItems = [
    t("methods.limitations.gridItem"),
    t("methods.limitations.causationItem"),
    t("methods.limitations.regionalItem"),
    t("methods.limitations.autocorrelationItem"),
  ];

  return (
    <section className="px-6 py-10">
      <button
        type="button"
        onClick={onNavigateHome}
        className="font-mono text-xs text-accent hover:underline"
      >
        {t("methods.backToHome")}
      </button>

      <h1 className="mt-4 font-display text-2xl text-text">{t("methods.title")}</h1>
      <p className="mt-2 max-w-2xl font-sans text-sm text-text-muted">{t("methods.subtitle")}</p>

      <div className="mt-8 max-w-2xl space-y-8">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.nasaData.title")}
          </h2>
          <p className="mt-2 font-sans text-sm text-text">{t("methods.nasaData.body")}</p>
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.aggregation.title")}
          </h2>
          <p className="mt-2 font-sans text-sm text-text">{t("methods.aggregation.body")}</p>
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.mannKendall.title")}
          </h2>
          <p className="mt-2 font-sans text-sm text-text">{t("methods.mannKendall.body")}</p>
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.sensSlope.title")}
          </h2>
          <p className="mt-2 font-sans text-sm text-text">{t("methods.sensSlope.body")}</p>
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.limitations.title")}
          </h2>
          <ul className="mt-2 space-y-2 font-sans text-sm text-text-muted">
            {limitationItems.map((item) => (
              <li key={item} className="border-l border-border pl-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
