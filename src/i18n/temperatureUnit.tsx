import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import type { TemperatureUnit } from "../lib/temperatureUnit.ts";

export const TEMP_UNIT_STORAGE_KEY = "etd.tempUnit";

export function readStoredTemperatureUnit(): TemperatureUnit {
  try {
    const stored = globalThis.localStorage?.getItem(TEMP_UNIT_STORAGE_KEY);
    if (stored === "C" || stored === "F") return stored;
  } catch {
    // Ignore storage errors in private browsing or restricted sandboxes
  }
  return "C";
}

export function persistTemperatureUnit(unit: TemperatureUnit): void {
  try {
    globalThis.localStorage?.setItem(TEMP_UNIT_STORAGE_KEY, unit);
  } catch {
    // Ignore storage failures
  }
}

interface TemperatureUnitContextValue {
  tempUnit: TemperatureUnit;
  setTempUnit: (unit: TemperatureUnit) => void;
}

const TemperatureUnitContext = createContext<TemperatureUnitContextValue | null>(null);

export function TemperatureUnitProvider({
  children,
  initialUnit,
}: {
  children?: ReactNode;
  initialUnit?: TemperatureUnit;
}) {
  const [tempUnit, setTempUnitState] = useState<TemperatureUnit>(
    () => initialUnit ?? readStoredTemperatureUnit(),
  );

  const setTempUnit = useCallback((next: TemperatureUnit) => {
    setTempUnitState(next);
    persistTemperatureUnit(next);
  }, []);

  const value = useMemo(() => ({ tempUnit, setTempUnit }), [tempUnit, setTempUnit]);

  return (
    <TemperatureUnitContext.Provider value={value}>{children}</TemperatureUnitContext.Provider>
  );
}

export function useOptionalTemperatureUnit(): TemperatureUnit {
  const ctx = useContext(TemperatureUnitContext);
  return ctx?.tempUnit ?? "C";
}

export function useTemperatureUnit(): TemperatureUnitContextValue {
  const ctx = useContext(TemperatureUnitContext);
  if (!ctx) {
    throw new Error("useTemperatureUnit must be used within <TemperatureUnitProvider>");
  }
  return ctx;
}
