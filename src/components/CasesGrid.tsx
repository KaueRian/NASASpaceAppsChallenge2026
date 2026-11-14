import { CASE_PRESETS } from "../data/presets";
import { useI18n } from "../i18n/i18n";
import { DIRECTION_ARROW, DIRECTION_COLOR } from "../lib/resultDisplay";
import type { CasePresetId } from "../types/investigation";

interface CasesGridProps {
  activePresetId: CasePresetId;
  onSelectPreset: (id: CasePresetId) => void;
}

export function CasesGrid({ activePresetId, onSelectPreset }: CasesGridProps) {
  const { t } = useI18n();

  return (
    <section id="cases" className="border-b border-border px-6 py-10">
      <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
        {t("cases.title")}
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CASE_PRESETS.map((preset) => {
          const { stats, location, variable } = preset.result;
          const isActive = preset.id === activePresetId;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              aria-pressed={isActive}
              className={`border px-4 py-4 text-left transition-colors ${
                isActive ? "border-accent bg-surface" : "border-border hover:border-text-muted"
              }`}
            >
              <p className="font-mono text-xs text-text-muted">
                {t("cases.caseLabel", { id: preset.id })}
              </p>
              <p className="mt-1 font-display text-base text-text">{location.label}</p>
              <p className="mt-2 font-sans text-sm text-text-muted">{t(preset.hookKey)}</p>
              <p
                className={`mt-3 font-mono text-xs uppercase tracking-wide ${DIRECTION_COLOR[stats.direction]}`}
              >
                {DIRECTION_ARROW[stats.direction]} {t(`variableName.${variable}`)}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
