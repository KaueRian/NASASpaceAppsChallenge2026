import type { CasePreset, CasePresetId } from "../../types/investigation.ts";
import case01 from "./case-01.json";
import case02 from "./case-02.json";
import case03 from "./case-03.json";
import case04 from "./case-04.json";

export const CASE_PRESETS: readonly CasePreset[] = [
  case01 as CasePreset,
  case02 as CasePreset,
  case03 as CasePreset,
  case04 as CasePreset,
];

export function getCasePresetById(id: CasePresetId): CasePreset {
  const found = CASE_PRESETS.find((preset) => preset.id === id);
  return found ?? CASE_PRESETS[0];
}
