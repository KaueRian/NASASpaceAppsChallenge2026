import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useI18n } from "../i18n/i18n";

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: only react to lat/lon changing from outside (geocode/map click) — including latText/lonText would fight manual typing.
  useEffect(() => {
    if (Number(latText) !== lat) setLatText(String(lat));
    if (Number(lonText) !== lon) setLonText(String(lon));
  }, [lat, lon]);

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
        className="map-dark-tiles border border-border"
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
