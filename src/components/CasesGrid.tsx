import { useEffect, useState } from "react";
import { CASE_PRESETS } from "../data/presets";
import { useI18n } from "../i18n/i18n";
import { DIRECTION_ARROW, DIRECTION_COLOR } from "../lib/resultDisplay";
import type { CasePresetId } from "../types/investigation";

interface CasesGridProps {
  activePresetId: CasePresetId;
  onSelectPreset: (id: CasePresetId) => void;
}

const SCALE_BADGE_KEY: Record<CasePresetId, string> = {
  "01": "local",
  "02": "state",
  "03": "national",
  "04": "global",
};

const VIEWED_STORAGE_KEY = "etd.viewedCases";

/** Reads persisted viewed preset IDs from localStorage, returning empty when unavailable. */
export function readViewedCases(): CasePresetId[] {
  try {
    const raw = globalThis.localStorage?.getItem(VIEWED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (id): id is CasePresetId => id === "01" || id === "02" || id === "03" || id === "04",
    );
  } catch {
    return [];
  }
}

/** Persists a viewed preset ID into localStorage and returns the updated list. */
export function markCaseViewed(id: CasePresetId, current: readonly CasePresetId[]): CasePresetId[] {
  const next = current.includes(id) ? [...current] : [...current, id];
  try {
    globalThis.localStorage?.setItem(VIEWED_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures in private browsing or restricted sandboxes
  }
  return next;
}

export function CasesGrid({ activePresetId, onSelectPreset }: CasesGridProps) {
  const { t } = useI18n();
  const [viewedIds, setViewedIds] = useState<CasePresetId[]>(() =>
    markCaseViewed(activePresetId, readViewedCases()),
  );

  useEffect(() => {
    setViewedIds((prev) => markCaseViewed(activePresetId, prev));
  }, [activePresetId]);

  return (
    <section id="cases" className="border-b border-border px-4 py-8 sm:px-6 sm:py-10">
      <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
        {t("cases.sectionTitle")}
      </h2>
      <p className="mt-1 max-w-2xl font-sans text-sm text-text-muted">
        {t("cases.sectionSubtitle")}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CASE_PRESETS.map((preset) => {
          const { stats, variable } = preset.result;
          const isActive = preset.id === activePresetId;
          const isViewed = viewedIds.includes(preset.id);

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setViewedIds((prev) => markCaseViewed(preset.id, prev));
                onSelectPreset(preset.id);
              }}
              aria-pressed={isActive}
              className={`flex flex-col justify-between border px-4 py-4 text-left transition-colors motion-reduce:transition-none ${
                isActive ? "border-accent bg-surface" : "border-border hover:border-text-muted"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-xs text-text-muted">
                    {t(`cases.scaleBadge.${SCALE_BADGE_KEY[preset.id]}`)}
                  </p>
                  {isViewed && (
                    <span className="shrink-0 border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                      ✓ {t("cases.alreadyViewed")}
                    </span>
                  )}
                </div>
                <p className="mt-1 font-display text-base text-text">
                  {t(`cases.${preset.id}.title`)}
                </p>
                <p className="mt-2 font-sans text-sm text-text-muted">{t(preset.hookKey)}</p>
              </div>
              <p
                className={`mt-3 font-mono text-xs uppercase tracking-wide ${DIRECTION_COLOR[stats.direction]}`}
              >
                {DIRECTION_ARROW[stats.direction]} {t(`variables.${variable}.shortLabel`)}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
