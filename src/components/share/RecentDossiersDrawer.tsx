import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/i18n.tsx";
import { buildPaginationMetadata, clampPage } from "../../lib/pagination.ts";
import type { PaginationMetadata, SavedDossier } from "../../types/investigation.ts";
import { PaginationControls } from "../PaginationControls.tsx";

export const DOSSIERS_PAGE_SIZE = 5;

export interface RecentDossiersDrawerProps {
  onSelectDossier?: (dossier: SavedDossier) => void;
  onOpenPermalink?: (dossierId: string) => void;
  defaultOpen?: boolean;
  initialDossiers?: SavedDossier[];
  initialPagination?: PaginationMetadata;
}

export function RecentDossiersDrawer({
  onSelectDossier,
  onOpenPermalink,
  defaultOpen = false,
  initialDossiers,
  initialPagination,
}: RecentDossiersDrawerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);
  const [dossiers, setDossiers] = useState<SavedDossier[]>(initialDossiers ?? []);
  const [page, setPage] = useState<number>(initialPagination?.page ?? 1);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(
    initialPagination ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setHasError(false);

    fetch(`/api/dossiers?page=${page}&limit=${DOSSIERS_PAGE_SIZE}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{
          dossiers?: SavedDossier[];
          total?: number;
          pagination?: PaginationMetadata;
        }>;
      })
      .then((payload) => {
        if (!active) return;
        const items = payload.dossiers ?? [];
        const nextPagination =
          payload.pagination ??
          buildPaginationMetadata(payload.total ?? items.length, page, DOSSIERS_PAGE_SIZE);
        if (nextPagination.totalPages > 0 && page > nextPagination.totalPages) {
          setPage(clampPage(page, nextPagination.totalPages));
          return;
        }
        setDossiers(items);
        setPagination(nextPagination);
        setLoading(false);
      })
      .catch(() => {
        if (active && !controller.signal.aborted) {
          setHasError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [open, page]);

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => {
            const nextOpen = !prev;
            if (nextOpen) setPage(1);
            return nextOpen;
          });
        }}
        aria-expanded={open}
        className="border border-border bg-bg px-4 py-2 font-mono text-xs uppercase tracking-wide text-text-muted hover:border-accent hover:text-text"
      >
        {open ? t("dossier.recentClose") : t("dossier.recentButton")}
      </button>

      {open && (
        <aside
          aria-label={t("dossier.recentTitle")}
          className="mt-3 w-full max-w-md border border-border bg-surface p-4 text-text sm:w-80"
        >
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-accent">
              {t("dossier.recentTitle")}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("dossier.recentClose")}
              className="font-mono text-xs text-text-muted hover:text-text"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <p className="py-4 font-mono text-xs text-text-muted">{t("dossier.recentLoading")}</p>
          ) : hasError ? (
            <p role="alert" className="py-4 font-mono text-xs text-accent">
              {t("dossier.recentError")}
            </p>
          ) : dossiers.length === 0 ? (
            <p className="py-4 font-mono text-xs text-text-muted">{t("dossier.recentEmpty")}</p>
          ) : (
            <>
              <ul className="space-y-2">
                {dossiers.map((item) => (
                  <li
                    key={item.id}
                    className="border border-border bg-bg p-2.5 font-mono text-xs text-text"
                  >
                    <div className="font-sans font-medium text-text">
                      {item.result.location.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-accent">
                      {t(`variables.${item.result.variable}.shortLabel`)} ·{" "}
                      {t(`verdict.${item.result.stats.verdict}`)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="text-text-muted">{item.id}</span>
                      <div className="flex items-center gap-3">
                        {onSelectDossier && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectDossier(item);
                              setOpen(false);
                            }}
                            className="text-text hover:text-accent hover:underline"
                          >
                            {t("dossier.recentInspect")} →
                          </button>
                        )}
                        <a
                          href={`/dossier/${item.id}`}
                          onClick={(e) => {
                            if (onOpenPermalink) {
                              e.preventDefault();
                              setOpen(false);
                              onOpenPermalink(item.id);
                            }
                          }}
                          className="text-text-muted hover:text-accent hover:underline"
                        >
                          {t("dossier.recentOpenLink")} ↗
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <PaginationControls
                compact
                disabled={loading}
                pagination={
                  pagination ?? buildPaginationMetadata(dossiers.length, page, DOSSIERS_PAGE_SIZE)
                }
                onPageChange={setPage}
                ariaLabel={t("pagination.dossiersNavLabel")}
              />
            </>
          )}
        </aside>
      )}
    </div>
  );
}
