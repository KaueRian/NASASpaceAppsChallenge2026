import type { AiLocale, AiTranslateContext } from "../../types/ai.ts";
import { MIN_ANALYSIS_YEARS, SEASON_IDS, VARIABLE_IDS } from "../../types/investigation.ts";

export const FILTER_TRANSLATION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    inScope: { type: "boolean" },
    outOfScopeMessage: { type: "string" },
    limitationNotice: { type: "string" },
    suggestedValidQuestions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" },
    },
    reasoning: { type: "string" },
    initialHypothesis: { type: "string" },
    filters: {
      type: "object",
      properties: {
        reuseCurrentLocation: { type: "boolean" },
        locationQuery: { type: "string" },
        lat: { type: "number", minimum: -90, maximum: 90 },
        lon: { type: "number", minimum: -180, maximum: 180 },
        variable: {
          type: "string",
          enum: [...VARIABLE_IDS],
        },
        season: {
          type: "string",
          enum: [...SEASON_IDS],
        },
        startYear: { type: "integer", minimum: 1981, maximum: 2030 },
        endYear: { type: "integer", minimum: 1981, maximum: 2030 },
        runMultiVariableScan: { type: "boolean" },
      },
      required: [
        "reuseCurrentLocation",
        "locationQuery",
        "lat",
        "lon",
        "variable",
        "season",
        "startYear",
        "endYear",
        "runMultiVariableScan",
      ],
      additionalProperties: false,
    },
  },
  required: [
    "inScope",
    "outOfScopeMessage",
    "limitationNotice",
    "suggestedValidQuestions",
    "reasoning",
    "initialHypothesis",
    "filters",
  ],
  additionalProperties: false,
};

export const INTERPRETATION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    directAnswer: { type: "string" },
    keyFindings: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string" },
    },
    hypotheses: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["title", "description"],
        additionalProperties: false,
      },
    },
    causalityWarning: { type: "string" },
    followUpQuestions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" },
    },
  },
  required: ["directAnswer", "keyFindings", "hypotheses", "causalityWarning", "followUpQuestions"],
  additionalProperties: false,
};

export function buildTranslationSystemInstruction(
  lang: AiLocale,
  maxCompleteYear: number,
  currentContext?: AiTranslateContext,
): string {
  const languageDirective =
    lang === "pt"
      ? "Write all user-facing strings (outOfScopeMessage, limitationNotice, suggestedValidQuestions, reasoning, initialHypothesis) strictly in Brazilian Portuguese (pt-BR)."
      : "Write all user-facing strings (outOfScopeMessage, limitationNotice, suggestedValidQuestions, reasoning, initialHypothesis) strictly in English.";

  const activeLocationLine = currentContext
    ? `Active UI investigation context: location="${currentContext.label ?? `${currentContext.lat}, ${currentContext.lon}`}", lat=${currentContext.lat}, lon=${currentContext.lon}, variable=${currentContext.variable}, season=${currentContext.season}, period=${currentContext.startYear}-${currentContext.endYear}.`
    : "No active UI context supplied; default location is Vilhena, RO, Brazil (lat=-12.7406, lon=-60.1458) if no location is mentioned.";

  return [
    "You are Layer 1 (Query Translator) of GeoTrend (NASA Space Apps Challenge 2026).",
    "Convert a natural-language Earth-science question into validated filters for the NASA POWER / MERRA-2 trend engine.",
    languageDirective,
    "",
    "SUPPORTED CAPABILITIES (STRICT CONTRACT):",
    "- variables (ONLY these 4 codes):",
    "  * PRECTOTCORR: Total precipitation (mm, accumulated over window). Best for rainfall, rain, drought/rain deficit, dry spell rainfall.",
    "  * T2M: Mean air temperature at 2m (°C). Best for warming, overall heat, climate warming.",
    "  * T2M_MIN: Minimum night-time temperature at 2m (°C). Best for hotter nights, nocturnal temperature, cold frost.",
    "  * GWETROOT: Root-zone soil wetness index (0-100%). Best for soil moisture, agricultural water stress, root drying.",
    "- seasons (ONLY these 3 codes):",
    "  * annual: Jan-Dec complete year.",
    "  * apr_sep: Apr-Sep (Amazon/Southern Hemisphere dry season; Northern Hemisphere warm/summer half).",
    "  * oct_mar: Oct-Mar (Amazon/Southern Hemisphere wet season; Northern Hemisphere winter half).",
    `- year range: integers within 1981..${maxCompleteYear}, spanning at least ${MIN_ANALYSIS_YEARS} complete years (default 1981..${maxCompleteYear} when unspecified; 'last 30 years' = ${Math.max(1981, maxCompleteYear - 29)}..${maxCompleteYear}).`,
    "- runMultiVariableScan: true ONLY when the user asks broadly which variables changed, asks for a full diagnostic scan, or explicitly combines multiple climate dimensions (e.g. temperature AND rainfall AND soil moisture).",
    "",
    "SCOPE, LIMITATIONS & CONTEXT RULES:",
    "1. Short-term weather forecasts (tomorrow, next week, will it rain tonight) or non-climate topics (finance, sports, general chat) -> set inScope = false, populate outOfScopeMessage politely explaining this tool investigates multi-decade NASA historical records (>= 15 years) rather than weather forecasts, provide 2-3 valid suggestedValidQuestions in the target language, and keep safe valid defaults in filters.",
    "2. Unsupported climate metrics (e.g., exact daily T2M_MAX, solar radiation ALLSKY_SFC_SW_DWN, wind speed, PM2.5, CO2 concentration, daily resolution, or spans shorter than 15 years): ALWAYS help as much as possible using the closest supported filter (for heat/max temperature use T2M or T2M_MIN; for moisture/radiation stress consider GWETROOT or T2M + runMultiVariableScan=true when helpful) AND set limitationNotice transparently explaining what could not be matched 1-to-1 and which closest filter was selected. If the entire question relies exclusively on a completely absent dataset (e.g. atmospheric CO2 ppm or earthquakes), set inScope = false cleanly.",
    `3. ${activeLocationLine}`,
    "4. Set filters.reuseCurrentLocation = true ONLY when the user writes an implicit follow-up referencing the active location (e.g., 'what about the dry season?', 'since 1995?', 'scan all variables here') without naming a new city/region. Otherwise set reuseCurrentLocation = false, provide clean geocodable filters.locationQuery (e.g., 'Manaus, AM, Brazil') and accurate approximate lat/lon.",
    "5. Leave outOfScopeMessage as '' when inScope=true, and leave limitationNotice as '' when no filter approximation was needed.",
  ].join("\n");
}

export function buildInterpretationSystemInstruction(lang: AiLocale): string {
  const languageDirective =
    lang === "pt"
      ? "Respond strictly in Brazilian Portuguese (pt-BR) inside all JSON fields."
      : "Respond strictly in English inside all JSON fields.";

  return [
    "You are Layer 3 (Scientific Interpreter) of GeoTrend (NASA Space Apps Challenge 2026).",
    "You receive VERIFIED statistical metrics already computed deterministically from NASA POWER / MERRA-2 (Mann-Kendall, Theil-Sen median slope with 95% CI, OLS R^2, lag-1 autocorrelation, and optional 4-variable Benjamini-Hochberg FDR).",
    languageDirective,
    "",
    "INVIOLABLE SCIENTIFIC GUARDRAILS:",
    "1. NEVER invent, extrapolate, or alter any number, slope, p-value, q-value, year, or extreme anomaly not explicitly present in the input JSON.",
    "2. If verdict === 'INSUFFICIENT_EVIDENCE' (p >= 0.05), state clearly that there is insufficient statistical evidence to confirm a monotonic trend over this window and suggest widening the period or checking another window/variable.",
    "3. If warnings.shortRecord or warnings.highAutocorrelation is true, explicitly mention that statistical caveat in keyFindings.",
    "4. If limitationNotice is present in the input, acknowledge clearly how the selected filter approximates the user's request.",
    "5. Provide exactly 2 plausible physical/environmental hypotheses consistent with Earth system science (land-cover & evapotranspiration balance, or large-scale ocean/atmosphere oscillations like ENSO/Tropical Atlantic), framing them strictly as hypotheses.",
    "6. In causalityWarning, state clearly that Mann-Kendall detects statistical trend significance in a ~50 km MERRA-2 grid cell and does NOT prove single-cause attribution; mention complementary land-cover monitoring (such as MapBiomas) when relevant.",
    "7. Propose 2 short, concrete followUpQuestions in the user's language that are directly runnable inside GeoTrend (referencing our 4 supported variables, seasons, cities, or 4-variable scan).",
  ].join("\n");
}
