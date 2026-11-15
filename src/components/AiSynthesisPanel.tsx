import { useI18n } from "../i18n/i18n";
import type { AiInterpretResult } from "../types/ai";

interface AiSynthesisPanelProps {
  interpretation: AiInterpretResult | null;
  isInterpreting: boolean;
  onSelectFollowUp: (questionText: string) => void;
}

export function AiSynthesisPanel({
  interpretation,
  isInterpreting,
  onSelectFollowUp,
}: AiSynthesisPanelProps) {
  const { t } = useI18n();

  if (isInterpreting && !interpretation) {
    return (
      <div
        aria-live="polite"
        className="mt-4 border border-border bg-surface p-3 sm:p-4 font-mono text-xs uppercase tracking-wide text-text-muted"
      >
        ● {t("ai.steps.interpret")}…
      </div>
    );
  }

  if (!interpretation) {
    return null;
  }

  return (
    <div className="mt-5 border border-border bg-surface p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text">
          {t("ai.synthesisTitle")}
        </p>
        <span className="font-mono text-[11px] text-text-muted">
          {interpretation.model}
          {interpretation.cached ? ` · ${t("ai.synthesisCached")}` : ""}
        </span>
      </div>

      <p className="font-sans text-sm leading-relaxed text-text sm:text-base">
        {interpretation.directAnswer}
      </p>

      {interpretation.keyFindings.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
            {t("ai.findingsTitle")}
          </p>
          <ul className="list-disc space-y-1 pl-5 font-sans text-xs text-text-muted sm:text-sm">
            {interpretation.keyFindings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        </div>
      )}

      {interpretation.hypotheses.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
            {t("ai.hypothesesTitle")}
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {interpretation.hypotheses.map((hypothesis) => (
              <div key={hypothesis.title} className="border border-border bg-bg p-3">
                <p className="font-mono text-xs uppercase tracking-wide text-text">
                  {hypothesis.title}
                </p>
                <p className="mt-1.5 font-sans text-xs leading-relaxed text-text-muted">
                  {hypothesis.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="border-l-2 border-accent pl-3 font-sans text-xs text-text-muted">
        {interpretation.causalityWarning}
      </p>

      {interpretation.followUpQuestions.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
            {t("ai.followUpTitle")}
          </p>
          <div className="flex flex-wrap gap-2">
            {interpretation.followUpQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onSelectFollowUp(question)}
                className="border border-border bg-bg px-2.5 py-1 text-left font-sans text-xs text-text hover:border-accent"
              >
                → {question}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
