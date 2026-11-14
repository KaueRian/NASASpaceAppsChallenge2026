import { useI18n } from "../i18n/i18n";

export function MethodsPage() {
  const { t } = useI18n();

  return (
    <section className="px-6 py-10">
      <h1 className="font-display text-2xl text-text">{t("methods.title")}</h1>
      <p className="mt-2 max-w-2xl font-sans text-sm text-text-muted">{t("methods.intro")}</p>

      <div className="mt-8 max-w-2xl space-y-8">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.dataSource.title")}
          </h2>
          <p className="mt-2 font-sans text-sm text-text">{t("methods.dataSource.body")}</p>
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.aggregation.title")}
          </h2>
          <p className="mt-2 font-sans text-sm text-text">{t("methods.aggregation.body")}</p>
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.tests.title")}
          </h2>
          <p className="mt-2 font-sans text-sm text-text">{t("methods.tests.body")}</p>
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.limitations.title")}
          </h2>
          <p className="mt-2 font-sans text-sm text-text">{t("methods.limitations.body")}</p>
          <p className="mt-3 font-sans text-sm text-text-muted">
            {t("methods.limitations.context")}
          </p>
        </div>
      </div>
    </section>
  );
}
