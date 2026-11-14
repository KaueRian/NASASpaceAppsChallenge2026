import { useI18n } from "../i18n/i18n";

interface MethodTeaserProps {
  onNavigateMethods: () => void;
}

export function MethodTeaser({ onNavigateMethods }: MethodTeaserProps) {
  const { t } = useI18n();

  return (
    <div className="px-6 py-10">
      <p className="max-w-2xl font-sans text-sm text-text-muted">
        {t("methods.teaser")}{" "}
        <button type="button" onClick={onNavigateMethods} className="text-accent hover:underline">
          {t("form.fullMethodLink")}
        </button>
      </p>
    </div>
  );
}
