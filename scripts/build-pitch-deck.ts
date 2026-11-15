import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPitchDeckHtml } from "../src/lib/pitch/pitchDeckBuilder.ts";
import type { CasePreset } from "../src/types/investigation.ts";

const PRESET_FILES = ["case-01.json", "case-02.json", "case-03.json", "case-04.json"] as const;

async function main() {
  const presetsDir = path.resolve(import.meta.dirname, "../src/data/presets");
  const presets: CasePreset[] = await Promise.all(
    PRESET_FILES.map(async (file) => {
      const raw = await readFile(path.join(presetsDir, file), "utf8");
      return JSON.parse(raw) as CasePreset;
    }),
  );

  const html = buildPitchDeckHtml(presets);
  const outPath = path.resolve(import.meta.dirname, "../docs/submission/slides-pt.html");
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, html, "utf8");
  console.log(
    `Generated ${presets.length}-preset pitch deck at ${outPath} (${html.length} bytes).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
