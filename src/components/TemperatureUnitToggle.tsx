import { useI18n } from "../i18n/i18n";
import { useTemperatureUnit } from "../i18n/temperatureUnit";

export function TemperatureUnitToggle() {
  const { t } = useI18n();
  const { tempUnit, setTempUnit } = useTemperatureUnit();

  return (
    // biome-ignore lint/a11y/useSemanticElements: compact inline toggle matching LanguageToggle's intentional role="group" pattern.
    <div
      className="font-mono text-xs tracking-wide"
      role="group"
      aria-label={t("nav.temperatureUnitLabel")}
    >
      <button
        type="button"
        onClick={() => setTempUnit("C")}
        aria-pressed={tempUnit === "C"}
        className={tempUnit === "C" ? "text-text" : "text-text-muted hover:text-text"}
      >
        °C
      </button>
      <span className="text-text-muted"> | </span>
      <button
        type="button"
        onClick={() => setTempUnit("F")}
        aria-pressed={tempUnit === "F"}
        className={tempUnit === "F" ? "text-text" : "text-text-muted hover:text-text"}
      >
        °F
      </button>
    </div>
  );
}
