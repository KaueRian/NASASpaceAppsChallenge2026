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

/** Full-bleed saturated background for the Wrapped-style shareable card — a deliberate, scoped
 * exception to the muted Dark Editorial palette (bold color reads better on Instagram Stories). */
export const DIRECTION_BG: Record<TrendDirection, string> = {
  warming: "bg-dir-warm",
  cooling: "bg-dir-cool",
  wetter: "bg-dir-wet",
  drier: "bg-dir-dry",
  neutral: "bg-surface",
};

/** Same palette as `DIRECTION_BG`, as hex, for `<canvas>` drawing where CSS classes don't apply. */
export const DIRECTION_HEX: Record<TrendDirection, string> = {
  warming: "#c1472e",
  cooling: "#4c7ea8",
  wetter: "#2e8b86",
  drier: "#b8862e",
  neutral: "#1c1c1e",
};
