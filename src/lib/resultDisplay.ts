import type { TrendDirection, VariableUnit } from "../types/investigation";

export const UNIT_SUFFIX: Record<VariableUnit, string> = { C: "°C", mm: " mm", pct: "%" };

export const DIRECTION_COLOR: Record<TrendDirection, string> = {
  warming: "text-dir-warm",
  cooling: "text-dir-cool",
  wetter: "text-dir-wet",
  drier: "text-dir-dry",
  neutral: "text-text-muted",
};

export const DIRECTION_ARROW: Record<TrendDirection, string> = {
  warming: "↑",
  cooling: "↓",
  wetter: "↑",
  drier: "↓",
  neutral: "–",
};
