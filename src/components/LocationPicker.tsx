import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useI18n } from "../i18n/i18n";
import type { GeocodeCandidate } from "../types/investigation";

interface LocationPickerProps {
  lat: number;
  lon: number;
  onChange: (next: { lat: number; lon: number; label?: string }) => void;
}

function RecenterOnChange({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon]);
  }, [lat, lon, map]);
  return null;
}

function ClickToPick({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (e) => {
      onPick(Math.round(e.latlng.lat * 10000) / 10000, Math.round(e.latlng.lng * 10000) / 10000);
    },
  });
  return null;
}

function isValidLat(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLon(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function LocationPicker({ lat, lon, onChange }: LocationPickerProps) {
  const { t } = useI18n();
  const [latText, setLatText] = useState(String(lat));
  const [lonText, setLonText] = useState(String(lon));
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const searchAbortRef = useRef<AbortController | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to lat/lon changing from outside (geocode/map click) — including latText/lonText would fight manual typing.
  useEffect(() => {
    if (Number(latText) !== lat) setLatText(String(lat));
    if (Number(lonText) !== lon) setLonText(String(lon));
  }, [lat, lon]);

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

  const handleLatBlur = () => {
    const value = Number(latText);
    if (isValidLat(value)) onChange({ lat: value, lon, label: undefined });
  };

  const handleLonBlur = () => {
    const value = Number(lonText);
    if (isValidLon(value)) onChange({ lat, lon: value, label: undefined });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("form.locationPlaceholder")}
          className="w-full border border-border bg-bg px-3 py-2 font-sans text-sm text-text"
        />
        {candidates.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full border border-border bg-surface">
            {candidates.map((candidate) => (
              <li key={candidate.label}>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ lat: candidate.lat, lon: candidate.lon, label: candidate.label });
                    setQuery("");
                    setCandidates([]);
                  }}
                  className="block w-full px-3 py-2 text-left font-sans text-sm text-text hover:bg-bg"
                >
                  {candidate.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="font-mono text-xs text-text-muted">
          {t("form.latLabel")}
          <input
            type="text"
            value={latText}
            onChange={(e) => setLatText(e.target.value)}
            onBlur={handleLatBlur}
            className="ml-2 w-28 border border-border bg-bg px-2 py-1 font-mono text-sm text-text"
          />
        </label>
        <label className="font-mono text-xs text-text-muted">
          {t("form.lonLabel")}
          <input
            type="text"
            value={lonText}
            onChange={(e) => setLonText(e.target.value)}
            onBlur={handleLonBlur}
            className="ml-2 w-28 border border-border bg-bg px-2 py-1 font-mono text-sm text-text"
          />
        </label>
      </div>

      <MapContainer
        center={[lat, lon]}
        zoom={5}
        scrollWheelZoom={false}
        style={{ height: 320 }}
        className="border border-border"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <CircleMarker
          center={[lat, lon]}
          radius={8}
          pathOptions={{ color: "#C1472E", fillOpacity: 1 }}
        />
        <RecenterOnChange lat={lat} lon={lon} />
        <ClickToPick
          onPick={(pickedLat, pickedLon) =>
            onChange({ lat: pickedLat, lon: pickedLon, label: undefined })
          }
        />
      </MapContainer>
    </div>
  );
}
