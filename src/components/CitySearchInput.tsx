import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/i18n";
import type { GeocodeCandidate } from "../types/investigation";

interface CitySearchInputProps {
  currentLabel?: string;
  onSelect: (candidate: GeocodeCandidate) => void;
  className?: string;
}

export function CitySearchInput({ currentLabel, onSelect, className }: CitySearchInputProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setCandidates([]);
      return;
    }
    const handle = setTimeout(() => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.ok) setCandidates(data.results as GeocodeCandidate[]);
        })
        .catch(() => {
          // silent failure — geocode search is a convenience, not required
        });
    }, 400);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={currentLabel ?? t("form.locationPlaceholder")}
        className="w-full border-b border-accent bg-transparent px-1 py-0.5 font-display text-lg text-text placeholder:text-text-muted focus:outline-none"
      />
      {candidates.length > 0 && (
        <ul className="absolute z-10 mt-1 w-max min-w-full border border-border bg-surface">
          {candidates.map((candidate) => (
            <li key={candidate.label}>
              <button
                type="button"
                onClick={() => {
                  onSelect(candidate);
                  setQuery("");
                  setCandidates([]);
                }}
                className="block w-full whitespace-nowrap px-3 py-2 text-left font-sans text-sm text-text hover:bg-bg"
              >
                {candidate.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
