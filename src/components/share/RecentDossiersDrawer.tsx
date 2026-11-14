import { useEffect, useState } from "react";
import type { SavedDossier } from "../../types/investigation.ts";

export interface RecentDossiersDrawerProps {
  onSelectDossier?: (dossier: SavedDossier) => void;
}

export function RecentDossiersDrawer({ onSelectDossier }: RecentDossiersDrawerProps) {
  const [open, setOpen] = useState(false);
  const [dossiers, setDossiers] = useState<SavedDossier[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);

    fetch("/api/dossiers")
      .then((res) => (res.ok ? res.json() : { dossiers: [] }))
      .then((payload: { dossiers?: SavedDossier[] }) => {
        if (active) {
          setDossiers(payload.dossiers ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open]);

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded border border-[#D4A84F]/50 bg-[#1B1613] px-3 py-1.5 font-mono text-xs text-[#F4EFE6] hover:border-[#D4A84F]"
      >
        {open ? "Close Recent Files" : "Recent Case Files"}
      </button>

      {open && (
        <aside
          aria-label="Recent Case Files"
          className="mt-2 w-80 rounded-sm border border-[#D4A84F]/40 bg-[#1B1613] p-4 text-[#F4EFE6] shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between border-b border-[#F4EFE6]/15 pb-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#D4A84F]">
              RECENT CASE FILES (D1 ARCHIVE)
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono text-xs text-[#F4EFE6]/70 hover:text-[#F4EFE6]"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <p className="py-4 font-mono text-xs text-[#F4EFE6]/70">Loading archived dossiers…</p>
          ) : dossiers.length === 0 ? (
            <p className="py-4 font-mono text-xs text-[#F4EFE6]/70">
              No shared case files recorded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {dossiers.map((item) => (
                <li
                  key={item.id}
                  className="rounded border border-[#F4EFE6]/15 bg-[#12100E] p-2.5 font-mono text-xs"
                >
                  <div className="font-sans font-semibold text-[#F4EFE6]">
                    {item.result.location.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#D4A84F]">
                    {item.result.variable} · {item.result.stats.verdict}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-[#F4EFE6]/60">{item.id}</span>
                    {onSelectDossier ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectDossier(item);
                          setOpen(false);
                        }}
                        className="underline hover:text-[#D4A84F]"
                      >
                        Inspect →
                      </button>
                    ) : (
                      <a href={`/dossier/${item.id}`} className="underline hover:text-[#D4A84F]">
                        Open →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}
