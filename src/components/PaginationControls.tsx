import { useI18n } from "../i18n/i18n.tsx";
import { buildVisiblePageNumbers, getPaginationRange } from "../lib/pagination.ts";
import type { PaginationMetadata } from "../types/investigation.ts";

export interface PaginationControlsProps {
  pagination: PaginationMetadata;
  onPageChange: (nextPage: number) => void;
  ariaLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Shared Dark Editorial numbered pagination bar (`Prev · 1 2 3 · Next`) with
 * locale-aware `Showing X–Y of Z` summary and full keyboard/ARIA support.
 */
export function PaginationControls({
  pagination,
  onPageChange,
  ariaLabel,
  compact = false,
  disabled = false,
  className = "",
}: PaginationControlsProps) {
  const { t, formatNumber } = useI18n();
  const range = getPaginationRange(pagination);

  if (range.total === 0) {
    return null;
  }

  const tokens = buildVisiblePageNumbers(pagination.page, pagination.totalPages);
  const btnPadding = compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-[11px]";
  const wrapperLayout = compact
    ? "mt-3 flex flex-col gap-2 border-t border-border pt-3"
    : "mt-5 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between";

  return (
    <div className={`${wrapperLayout} ${className}`.trim()}>
      <p className="font-mono text-[11px] uppercase tracking-wide text-text-muted">
        {t("pagination.summary", {
          start: formatNumber(range.start),
          end: formatNumber(range.end),
          total: formatNumber(range.total),
        })}
      </p>

      {pagination.totalPages > 1 && (
        <nav
          aria-label={ariaLabel ?? t("pagination.casesNavLabel")}
          className="flex flex-wrap items-center gap-1"
        >
          <button
            type="button"
            disabled={disabled || !pagination.hasPrev}
            onClick={() => onPageChange(pagination.page - 1)}
            className={`border border-border bg-bg font-mono uppercase tracking-wide text-text-muted transition-colors hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none ${btnPadding}`}
          >
            ← {t("pagination.previous")}
          </button>

          {tokens.map((token, index) => {
            if (token === "ellipsis") {
              const prevNeighbor = tokens[index - 1] ?? "start";
              return (
                <span
                  key={`ellipsis-after-${prevNeighbor}`}
                  aria-hidden="true"
                  className={`select-none font-mono text-text-muted ${compact ? "px-1 text-[10px]" : "px-1.5 text-[11px]"}`}
                >
                  …
                </span>
              );
            }

            const isCurrent = token === pagination.page;
            return (
              <button
                key={token}
                type="button"
                disabled={disabled}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={t("pagination.pageLabel", { page: token })}
                onClick={() => {
                  if (!isCurrent) {
                    onPageChange(token);
                  }
                }}
                className={`border font-mono uppercase tracking-wide transition-colors disabled:cursor-not-allowed motion-reduce:transition-none ${btnPadding} ${
                  isCurrent
                    ? "border-accent bg-surface font-semibold text-accent"
                    : "border-border bg-bg text-text-muted hover:border-accent hover:text-text"
                }`}
              >
                {formatNumber(token)}
              </button>
            );
          })}

          <button
            type="button"
            disabled={disabled || !pagination.hasNext}
            onClick={() => onPageChange(pagination.page + 1)}
            className={`border border-border bg-bg font-mono uppercase tracking-wide text-text-muted transition-colors hover:border-accent hover:text-text disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none ${btnPadding}`}
          >
            {t("pagination.next")} →
          </button>
        </nav>
      )}
    </div>
  );
}
