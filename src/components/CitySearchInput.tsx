import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/i18n";
import { getQuickCitySuggestions, searchCitiesClientSide } from "../lib/nasa/smartInvestigation";
import type { GeocodeCandidate } from "../types/investigation";

interface CitySearchInputProps {
  currentLabel?: string;
  onSelect: (candidate: GeocodeCandidate) => void;
  onPickOnMap?: () => void;
  className?: string;
}

export function CitySearchInput({
  currentLabel,
  onSelect,
  onPickOnMap,
  className,
}: CitySearchInputProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>(() =>
    getQuickCitySuggestions(""),
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      searchAbortRef.current?.abort();
      setCandidates(getQuickCitySuggestions(trimmed));
      return;
    }

    const handle = setTimeout(() => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      searchCitiesClientSide(trimmed, controller.signal)
        .then((results) => {
          if (!controller.signal.aborted) {
            setCandidates(results);
          }
        })
        .catch(() => {
          // Fallback already handled inside searchCitiesClientSide
        });
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  const selectCandidate = (candidate: GeocodeCandidate) => {
    onSelect(candidate);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className ?? ""}`}>
      <input
        type="text"
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setIsOpen(false);
          } else if (e.key === "Enter") {
            // Prevent form submission with the old location; pick the top candidate instead.
            e.preventDefault();
            if (candidates.length > 0 && candidates[0]) {
              selectCandidate(candidates[0]);
            }
          }
        }}
        placeholder={currentLabel ?? t("form.locationPlaceholder")}
        className="w-full border-b border-accent bg-transparent px-1 py-0.5 font-display text-lg text-text placeholder:text-text focus:placeholder:text-text-muted focus:outline-none"
      />
      {isOpen && (candidates.length > 0 || onPickOnMap) && (
        <div className="absolute left-0 z-20 mt-1 max-h-72 w-72 max-w-[calc(100vw-3rem)] overflow-y-auto border border-border bg-surface shadow-lg">
          {query.trim().length < 3 && candidates.length > 0 && (
            <p className="border-b border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">
              {t("form.quickLocationsTitle")}
            </p>
          )}
          <ul>
            {candidates.map((candidate) => (
              <li key={`${candidate.label}-${candidate.lat}-${candidate.lon}`}>
                <button
                  type="button"
                  onClick={() => selectCandidate(candidate)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-sans text-sm text-text hover:bg-bg"
                >
                  <span className="truncate">{candidate.label}</span>
                  <span className="shrink-0 font-mono text-[11px] text-text-muted">
                    {candidate.lat.toFixed(1)}°, {candidate.lon.toFixed(1)}°
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {onPickOnMap && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onPickOnMap();
              }}
              className="block w-full border-t border-border bg-bg/60 px-3 py-2 text-left font-mono text-xs text-accent hover:underline"
            >
              {t("form.pickOnMapAction")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
