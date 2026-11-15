import { useI18n } from "../i18n/i18n";
import { LOCAL_INTERPRET_MODEL, LOCAL_TRANSLATE_MODEL } from "../lib/ai/fallback";
import type { AiErrorCode, AiInterpretResult, AiTranslateResult } from "../types/ai";

export type AiPipelineStage =
  | "idle"
  | "translating"
  | "computing"
  | "interpreting"
  | "done"
  | "error";

export type AiFailedStage = "translating" | "computing" | "interpreting";

export type StepState =
  | "pending"
  | "running"
  | "done_ai"
  | "done_data"
  | "done_local"
  | "skipped"
  | "failed";

interface AiAssistantBarProps {
  question: string;
  onQuestionChange: (value: string) => void;
  onAskQuestion: (questionText: string) => void;
  stage: AiPipelineStage;
  failedStage?: AiFailedStage | null;
  isBusy: boolean;
  translation: AiTranslateResult | null;
  interpretation?: AiInterpretResult | null;
  errorCode: AiErrorCode | null;
  fallbackActive?: boolean;
  hasScanApplied: boolean;
  filterSummaryLine: string;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  onOpenAdvancedForRecovery: () => void;
}

const EXAMPLE_KEYS = ["vilhenaDry", "ariquemesNights", "manausScan", "arcticCompare"] as const;

interface ResolveStepStatesInput {
  stage: AiPipelineStage;
  failedStage?: AiFailedStage | null;
  translation: AiTranslateResult | null;
  interpretation?: AiInterpretResult | null;
  fallbackActive?: boolean;
}

function resolveStage1DoneState(
  translation: AiTranslateResult | null,
  fallbackActive: boolean,
): "done_ai" | "done_local" {
  if (translation?.model === LOCAL_TRANSLATE_MODEL) return "done_local";
  if (!translation && fallbackActive) return "done_local";
  return "done_ai";
}

function resolveStage3DoneState(
  interpretation: AiInterpretResult | null | undefined,
  fallbackActive: boolean,
): "done_ai" | "done_local" {
  if (interpretation?.model === LOCAL_INTERPRET_MODEL) return "done_local";
  if (!interpretation && fallbackActive) return "done_local";
  return "done_ai";
}

/** Resolves explicit per-stage execution status (AI, real NASA data, local mode, skipped, running, or failed). */
export function resolvePipelineStepStates({
  stage,
  failedStage = null,
  translation,
  interpretation = null,
  fallbackActive = false,
}: ResolveStepStatesInput): [StepState, StepState, StepState] {
  const stage1Done = resolveStage1DoneState(translation, fallbackActive);

  if (stage === "translating") return ["running", "pending", "pending"];
  if (stage === "computing") return [stage1Done, "running", "pending"];
  if (stage === "interpreting") return [stage1Done, "done_data", "running"];
  if (stage === "done") {
    if (translation && !translation.inScope) return [stage1Done, "skipped", "skipped"];
    return [stage1Done, "done_data", resolveStage3DoneState(interpretation, fallbackActive)];
  }
  if (stage === "error") {
    const failedAt = failedStage ?? "translating";
    if (failedAt === "translating") return ["failed", "skipped", "skipped"];
    if (failedAt === "computing") return [stage1Done, "failed", "skipped"];
    return [stage1Done, "done_data", "failed"];
  }
  return ["pending", "pending", "pending"];
}

interface StepVisualStyle {
  cardClass: string;
  titleClass: string;
  statusClass: string;
  iconClass: string;
  icon: string;
  statusKey: string;
}

const STEP_VISUAL_STYLES: Record<StepState, StepVisualStyle> = {
  pending: {
    cardClass: "border-border/60",
    titleClass: "text-text-muted opacity-75",
    statusClass: "text-text-muted opacity-75",
    iconClass: "text-text-muted",
    icon: "○",
    statusKey: "ai.stepStatuses.pending",
  },
  running: {
    cardClass: "border-accent",
    titleClass: "text-text",
    statusClass: "text-text",
    iconClass: "text-accent motion-safe:animate-pulse",
    icon: "●",
    statusKey: "ai.stepStatuses.running",
  },
  done_ai: {
    cardClass: "border-dir-wet/70",
    titleClass: "text-text",
    statusClass: "text-text",
    iconClass: "text-dir-wet",
    icon: "✓",
    statusKey: "ai.stepStatuses.doneAi",
  },
  done_data: {
    cardClass: "border-dir-wet/70",
    titleClass: "text-text",
    statusClass: "text-text",
    iconClass: "text-dir-wet",
    icon: "✓",
    statusKey: "ai.stepStatuses.doneData",
  },
  done_local: {
    cardClass: "border-dir-dry/75 border-dashed",
    titleClass: "text-text",
    statusClass: "text-text",
    iconClass: "text-dir-dry",
    icon: "◈",
    statusKey: "ai.stepStatuses.doneLocal",
  },
  skipped: {
    cardClass: "border-border/60",
    titleClass: "text-text-muted opacity-75",
    statusClass: "text-text-muted opacity-75",
    iconClass: "text-text-muted",
    icon: "—",
    statusKey: "ai.stepStatuses.skipped",
  },
  failed: {
    cardClass: "border-accent",
    titleClass: "text-accent",
    statusClass: "text-accent",
    iconClass: "text-accent",
    icon: "✕",
    statusKey: "ai.stepStatuses.failed",
  },
};

export function AiAssistantBar({
  question,
  onQuestionChange,
  onAskQuestion,
  stage,
  failedStage = null,
  isBusy,
  translation,
  interpretation = null,
  errorCode,
  fallbackActive = false,
  hasScanApplied,
  filterSummaryLine,
  advancedOpen,
  onToggleAdvanced,
  onOpenAdvancedForRecovery,
}: AiAssistantBarProps) {
  const { t } = useI18n();
  const [step1, step2, step3] = resolvePipelineStepStates({
    stage,
    failedStage,
    translation,
    interpretation,
    fallbackActive,
  });
  const showTracker = stage !== "idle";
  const isOutOfScope = translation !== null && !translation.inScope;
  const showLocalNotice = fallbackActive || step1 === "done_local" || step3 === "done_local";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isBusy) return;
    onAskQuestion(trimmed);
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
            {t("ai.eyebrow")}
          </p>
          {hasScanApplied && (
            <span className="border border-accent/60 bg-bg px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">
              {t("ai.scanAppliedBadge")}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            aria-label={t("ai.inputLabel")}
            value={question}
            maxLength={500}
            onChange={(e) => onQuestionChange(e.target.value)}
            placeholder={t("ai.placeholder")}
            className="min-w-0 flex-1 border border-border bg-bg px-3 py-2 font-sans text-sm text-text placeholder:text-text-muted/70 focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={isBusy || question.trim().length === 0}
            className="border border-accent bg-accent/15 px-4 py-2 font-mono text-xs uppercase tracking-wide text-text hover:bg-accent/25 disabled:opacity-50"
          >
            {isBusy ? t("ai.runningButton") : `→ ${t("ai.submitButton")}`}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] text-text-muted">{t("ai.examplesLabel")}</span>
          {EXAMPLE_KEYS.map((key) => {
            const promptText = t(`ai.examples.${key}`);
            return (
              <button
                key={key}
                type="button"
                disabled={isBusy}
                onClick={() => {
                  onQuestionChange(promptText);
                  onAskQuestion(promptText);
                }}
                className="border border-border bg-bg px-2.5 py-1 text-left font-sans text-xs text-text-muted hover:border-accent hover:text-text disabled:opacity-50"
              >
                {promptText}
              </button>
            );
          })}
        </div>
      </form>

      {showTracker && (
        <div aria-live="polite" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              { state: step1, label: t("ai.steps.translate") },
              { state: step2, label: t("ai.steps.compute") },
              { state: step3, label: t("ai.steps.interpret") },
            ] as const
          ).map((step) => {
            const visual = STEP_VISUAL_STYLES[step.state];
            return (
              <div key={step.label} className={`border bg-bg px-2.5 py-1.5 ${visual.cardClass}`}>
                <p className={`font-mono text-[11px] uppercase tracking-wide ${visual.titleClass}`}>
                  {step.label}
                </p>
                <p
                  className={`mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide ${visual.statusClass}`}
                >
                  <span aria-hidden="true" className={visual.iconClass}>
                    {visual.icon}
                  </span>
                  <span>{t(visual.statusKey)}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}

      {isOutOfScope && (
        <div role="status" className="border border-accent bg-bg p-3 space-y-2">
          <p className="font-mono text-xs uppercase tracking-wide text-accent">
            {t("ai.outOfScopeTitle")}
          </p>
          <p className="font-sans text-sm text-text">
            {translation.outOfScopeMessage || t("errors.EMPTY_SEARCH")}
          </p>
          {translation.suggestedValidQuestions.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
                {t("ai.tryValidQuestion")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {translation.suggestedValidQuestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      onQuestionChange(suggestion);
                      onAskQuestion(suggestion);
                    }}
                    className="border border-border bg-surface px-2.5 py-1 font-sans text-xs text-text hover:border-accent"
                  >
                    → {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {translation?.inScope && translation.limitationNotice && (
        <div role="status" className="border border-border bg-bg p-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-accent">
            {t("ai.limitationTitle")}
          </p>
          <p className="mt-1 font-sans text-xs text-text-muted">{translation.limitationNotice}</p>
        </div>
      )}

      {showLocalNotice && (
        <div role="status" className="border border-border bg-bg p-3">
          <p className="font-mono text-[11px] uppercase tracking-wide text-accent">
            {t("ai.fallbackTitle")}
          </p>
          <p className="mt-1 font-sans text-xs text-text-muted">{t("ai.fallbackBody")}</p>
        </div>
      )}

      {errorCode && (
        <div role="alert" className="border border-accent bg-bg p-3 space-y-2">
          <p className="font-mono text-xs uppercase tracking-wide text-accent">
            {t("ai.errorTitle")}
          </p>
          <p className="font-sans text-sm text-text-muted">{t(`ai.errors.${errorCode}`)}</p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenAdvancedForRecovery}
              className="border border-accent px-2.5 py-1 font-mono text-xs uppercase tracking-wide text-text hover:bg-surface"
            >
              {t("ai.openManualRecovery")}
            </button>
            <span className="font-mono text-xs text-text-muted">{t("errors.stillShowing")}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2.5">
        <button
          type="button"
          aria-expanded={advancedOpen}
          onClick={onToggleAdvanced}
          className="font-sans text-xs text-accent hover:underline"
        >
          {advancedOpen ? "▾" : "▸"}{" "}
          {advancedOpen ? t("ai.hideAdvancedFilters") : t("ai.openAdvancedFilters")}
        </button>
        <span className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
          {t("ai.activeSummaryLabel")}: {filterSummaryLine}
        </span>
      </div>
    </div>
  );
}
