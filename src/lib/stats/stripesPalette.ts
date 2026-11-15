import type { VariableId } from "../../types/investigation.ts";

export const TEMP_PALETTE = [
  "#08306B", // z <= -1.75 (deep cool blue)
  "#2171B5", // -1.75 < z <= -1.0
  "#6BAED6", // -1.0 < z <= -0.4
  "#C6DBEF", // -0.4 < z <= -0.1
  "#F4EFE6", // -0.1 < z < 0.1 (neutral paper)
  "#FCBBA1", // 0.1 <= z < 0.4
  "#FB6A4A", // 0.4 <= z < 1.0
  "#CB181D", // 1.0 <= z < 1.75
  "#67000D", // z >= 1.75 (deep warming crimson)
] as const;

export const HYDRO_PALETTE = [
  "#7F2704", // z <= -1.75 (severe drought ochre)
  "#D94801", // -1.75 < z <= -1.0
  "#FD8D3C", // -1.0 < z <= -0.4
  "#FDD0A2", // -0.4 < z <= -0.1
  "#F4EFE6", // -0.1 < z < 0.1 (neutral paper)
  "#C7EAE5", // 0.1 <= z < 0.4
  "#5AB4AC", // 0.4 <= z < 1.0
  "#01665E", // 1.0 <= z < 1.75
  "#003C30", // z >= 1.75 (abundant moisture teal)
] as const;

export function isTemperatureVariable(variable: VariableId): boolean {
  return variable === "T2M" || variable === "T2M_MIN";
}

export function getPaletteForVariable(variable: VariableId): readonly string[] {
  return isTemperatureVariable(variable) ? TEMP_PALETTE : HYDRO_PALETTE;
}

export function getStripeColor(zScore: number, variable: VariableId): string {
  const palette = getPaletteForVariable(variable);
  if (zScore <= -1.75) return palette[0];
  if (zScore <= -1.0) return palette[1];
  if (zScore <= -0.4) return palette[2];
  if (zScore <= -0.1) return palette[3];
  if (zScore < 0.1) return palette[4];
  if (zScore < 0.4) return palette[5];
  if (zScore < 1.0) return palette[6];
  if (zScore < 1.75) return palette[7];
  return palette[8];
}
