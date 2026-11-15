import type {
  AiErrorCode,
  AiInterpretRequest,
  AiInterpretResult,
  AiLocale,
  AiTranslatedFilters,
  AiTranslateRequest,
  AiTranslateResult,
} from "../../types/ai.ts";
import { MIN_ANALYSIS_YEARS, type SeasonId, type VariableId } from "../../types/investigation.ts";
import { normalizeSearchText, QUICK_CITY_SUGGESTIONS } from "../nasa/smartInvestigation.ts";
import {
  convertAbsoluteValue,
  convertDeltaValue,
  getDisplayUnitLabel,
  type TemperatureUnit,
} from "../temperatureUnit.ts";
import { getMaxCompleteYear } from "../validation/investigate.ts";
import { ClientAiError } from "./clientAi.ts";
import { sanitizeAiTranslatedFilters } from "./validation.ts";

export const LOCAL_TRANSLATE_MODEL = "local-deterministic-fallback";
export const LOCAL_INTERPRET_MODEL = "local-statistical-fallback";

export const AI_OUTAGE_ERROR_CODES: readonly AiErrorCode[] = [
  "AI_NOT_CONFIGURED",
  "AI_RATE_LIMITED",
  "AI_TIMEOUT",
  "AI_UPSTREAM_ERROR",
  "AI_BAD_RESPONSE",
];

const NON_LOCATION_STOPWORDS = new Set([
  "ano",
  "anos",
  "year",
  "years",
  "estacao",
  "season",
  "periodo",
  "period",
  "seca",
  "chuvosa",
  "dry",
  "wet",
  "rainy",
  "ultimo",
  "ultima",
  "ultimos",
  "ultimas",
  "last",
  "past",
  "chuva",
  "chuvas",
  "rain",
  "rainfall",
  "temperatura",
  "temperature",
  "noite",
  "noites",
  "night",
  "nights",
  "solo",
  "soil",
  "variavel",
  "variaveis",
  "variable",
  "variables",
  "clima",
  "climate",
  "nasa",
  "power",
  "amanha",
  "tomorrow",
  "hoje",
  "today",
  "semana",
  "week",
  "mes",
  "month",
]);

const CITY_ALIASES: ReadonlyArray<{ token: string; label: string; lat: number; lon: number }> = [
  { token: "artico", label: "Svalbard, Arctic", lat: 78.22, lon: 15.65 },
  { token: "arctic", label: "Svalbard, Arctic", lat: 78.22, lon: 15.65 },
  { token: "pantanal", label: "Corumbá (Pantanal), MS, Brazil", lat: -19.01, lon: -57.65 },
  { token: "corumba", label: "Corumbá (Pantanal), MS, Brazil", lat: -19.01, lon: -57.65 },
  { token: "toquio", label: "Tokyo, Japan", lat: 35.68, lon: 139.77 },
  { token: "sevilha", label: "Sevilla, Spain", lat: 37.39, lon: -5.99 },
];

const CURATED_SORTED = [...QUICK_CITY_SUGGESTIONS].sort((a, b) => b.name.length - a.name.length);

function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatSigned(value: number, decimals = 2): string {
  const fixed = value.toFixed(decimals);
  return value > 0 ? `+${fixed}` : fixed;
}

function formatPValue(pValue: number): string {
  if (!Number.isFinite(pValue)) return "N/A";
  if (pValue < 0.0001) return "< 0.0001";
  return pValue.toFixed(4);
}

function getVariableLabel(variable: VariableId, lang: AiLocale): string {
  const labels: Record<AiLocale, Record<VariableId, string>> = {
    pt: {
      T2M: "Temperatura Média a 2m",
      T2M_MIN: "Temperatura Mínima Noturna",
      PRECTOTCORR: "Precipitação Total",
      GWETROOT: "Umidade do Solo na Zona Radicular",
    },
    en: {
      T2M: "Mean Air Temperature at 2m",
      T2M_MIN: "Minimum Night-Time Temperature",
      PRECTOTCORR: "Total Precipitation",
      GWETROOT: "Root-Zone Soil Moisture",
    },
  };
  return labels[lang][variable];
}

function getSeasonLabel(season: SeasonId, lang: AiLocale): string {
  const labels: Record<AiLocale, Record<SeasonId, string>> = {
    pt: {
      annual: "Anual (Jan–Dez)",
      apr_sep: "Estação Seca (Abr–Set)",
      oct_mar: "Estação Chuvosa (Out–Mar)",
    },
    en: {
      annual: "Annual (Jan–Dec)",
      apr_sep: "Dry Season (Apr–Sep)",
      oct_mar: "Wet Season (Oct–Mar)",
    },
  };
  return labels[lang][season];
}

function getValidExamples(lang: AiLocale): string[] {
  return lang === "pt"
    ? [
        "A estação seca em Vilhena ficou mais seca desde 1990?",
        "As noites em Ariquemes ficaram mais quentes?",
        "Quais variáveis climáticas mudaram significativamente em Manaus?",
      ]
    : [
        "Is Vilhena's dry season getting drier since 1990?",
        "Are night-time temperatures rising in Ariquemes?",
        "Which climate variables changed significantly in Manaus?",
      ];
}

function matchCuratedLocation(
  normalizedQuestion: string,
): { label: string; lat: number; lon: number } | null {
  for (const city of CURATED_SORTED) {
    const token = normalizeSearchText(city.name.replace(/\([^)]*\)/g, "").trim());
    if (token.length >= 3 && new RegExp(`\\b${escapeRegex(token)}\\b`).test(normalizedQuestion)) {
      return { label: city.label, lat: city.lat, lon: city.lon };
    }
  }
  for (const alias of CITY_ALIASES) {
    if (new RegExp(`\\b${escapeRegex(alias.token)}\\b`).test(normalizedQuestion)) {
      return { label: alias.label, lat: alias.lat, lon: alias.lon };
    }
  }
  return null;
}

function extractCoordinatePair(question: string): { lat: number; lon: number } | null {
  const match = question.match(/(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lon) &&
    lon >= -180 &&
    lon <= 180
  ) {
    return { lat, lon };
  }
  return null;
}

function extractFreeTextCity(question: string): string | null {
  const capitalizedPattern =
    /(?:^|\s)(?:em|no|na|nos|nas|para|sobre|in|at|for|around|near)\s+(?:cidade\s+de\s+)?([A-ZÀ-Ý][A-ZÀ-Ýa-zà-ÿ'’-]+(?:\s+(?:de|da|do|das|dos|of|[A-ZÀ-Ý][A-ZÀ-Ýa-zà-ÿ'’-]+)){0,3})/g;
  for (const match of question.matchAll(capitalizedPattern)) {
    const candidate = match[1]?.trim();
    if (!candidate) continue;
    const words = normalizeSearchText(candidate).split(/\s+/);
    if (words.some((w) => !NON_LOCATION_STOPWORDS.has(w))) {
      return candidate;
    }
  }
  return null;
}

function detectOutOfScopeReason(normalized: string, lang: AiLocale): string | null {
  const shortTermForecast =
    /\b(amanha|depois de amanha|hoje a noite|esta noite|proxima semana|semana que vem|proximo mes|previsao do tempo|weather forecast|tomorrow|tonight|next week|next month)\b/;
  if (shortTermForecast.test(normalized)) {
    return lang === "pt"
      ? "Esta ferramenta investiga tendências históricas multidecadais da NASA POWER (mínimo de 15 anos, 1981–2025) e não faz previsão do tempo de curto prazo."
      : "This tool investigates multi-decade NASA POWER historical trends (minimum 15 years, 1981–2025) rather than short-term weather forecasts.";
  }

  const unsupportedDatasetOnly =
    /\b(terremoto|terremotos|earthquake|earthquakes|co2|dioxido de carbono|carbon dioxide|metano|methane|pm2\.?5|qualidade do ar|air quality|horoscopo|horoscope|receita|recipe|futebol|football|soccer|bitcoin|cripto|crypto|bolsa|stock price)\b/;
  if (unsupportedDatasetOnly.test(normalized)) {
    return lang === "pt"
      ? "Pergunta fora do escopo dos 4 indicadores históricos disponíveis na NASA POWER/MERRA-2 (temperatura média, mínima noturna, precipitação e umidade do solo)."
      : "This request falls outside the 4 historical indicators supported here from NASA POWER/MERRA-2 (mean temperature, night-time minimum, precipitation, and soil moisture).";
  }

  return null;
}

function inferYearBounds(
  normalized: string,
  maxCompleteYear: number,
  currentContext?: AiTranslateRequest["currentContext"],
  isExplicitFollowUp = false,
): { startYear: number; endYear: number; requestedShortWindow: boolean } {
  const yearMatches = Array.from(normalized.matchAll(/\b(198[1-9]|199\d|20[0-2]\d)\b/g))
    .map((m) => Number(m[1]))
    .filter((y) => y >= 1981 && y <= maxCompleteYear);

  if (yearMatches.length >= 2) {
    const first = Math.min(...yearMatches);
    const second = Math.max(...yearMatches);
    return {
      startYear: first,
      endYear: second,
      requestedShortWindow: second - first + 1 < MIN_ANALYSIS_YEARS,
    };
  }

  if (yearMatches.length === 1) {
    const year = yearMatches[0] ?? 1981;
    const beforePattern = /\b(ate|antes de|until|up to|to)\s+(198[1-9]|199\d|20[0-2]\d)\b/;
    if (beforePattern.test(normalized) && year > 1981 + MIN_ANALYSIS_YEARS) {
      return {
        startYear: 1981,
        endYear: year,
        requestedShortWindow: year - 1981 + 1 < MIN_ANALYSIS_YEARS,
      };
    }
    return {
      startYear: year,
      endYear: maxCompleteYear,
      requestedShortWindow: maxCompleteYear - year + 1 < MIN_ANALYSIS_YEARS,
    };
  }

  const relativeSpanMatch = normalized.match(
    /\b(?:ultimos|ultimas|last|past)\s+(\d{1,2})\s+(?:anos|years)\b/,
  );
  if (relativeSpanMatch) {
    const span = Number(relativeSpanMatch[1]);
    const clampedSpan = Number.isFinite(span) ? Math.max(span, 1) : 30;
    const rawStart = Math.max(1981, maxCompleteYear - clampedSpan + 1);
    return {
      startYear: rawStart,
      endYear: maxCompleteYear,
      requestedShortWindow: clampedSpan < MIN_ANALYSIS_YEARS,
    };
  }

  if (isExplicitFollowUp && currentContext) {
    return {
      startYear: currentContext.startYear,
      endYear: Math.min(currentContext.endYear, maxCompleteYear),
      requestedShortWindow: false,
    };
  }

  return {
    startYear: 1981,
    endYear: maxCompleteYear,
    requestedShortWindow: false,
  };
}

/**
 * Classifies whether a client error represents an AI service outage, rate-limit,
 * timeout, bad gateway, or missing server key (as opposed to a validation error or abort).
 */
export function isAiOutageError(err: unknown): boolean {
  if (err instanceof ClientAiError) {
    return AI_OUTAGE_ERROR_CODES.includes(err.code);
  }
  if (err instanceof Error && err.name === "AbortError") {
    return false;
  }
  return err instanceof TypeError;
}

/**
 * Deterministic Layer-1 natural-language to NASA POWER filter translator used when
 * Gemini API routes return 503/429/504/502 or are unconfigured.
 */
export function translateQuestionWithLocalFallback(
  req: AiTranslateRequest,
  maxCompleteYear = getMaxCompleteYear(),
): AiTranslateResult {
  const question = req.question.trim();
  const normalized = normalizeSearchText(question);
  const lang = req.lang;
  const ctx = req.currentContext;

  const outOfScopeReason = detectOutOfScopeReason(normalized, lang);
  if (outOfScopeReason) {
    const safeFilters = sanitizeAiTranslatedFilters(
      {
        reuseCurrentLocation: Boolean(ctx),
        locationQuery: ctx?.label ?? "Vilhena, RO, Brazil",
        lat: ctx?.lat ?? -12.74,
        lon: ctx?.lon ?? -60.14,
        variable: ctx?.variable ?? "PRECTOTCORR",
        season: ctx?.season ?? "apr_sep",
        startYear: ctx?.startYear ?? 1981,
        endYear: Math.min(ctx?.endYear ?? maxCompleteYear, maxCompleteYear),
        runMultiVariableScan: false,
      },
      ctx,
      maxCompleteYear,
    );
    return {
      ok: true,
      inScope: false,
      outOfScopeMessage: outOfScopeReason,
      suggestedValidQuestions: getValidExamples(lang),
      reasoning:
        lang === "pt"
          ? "Classificador determinístico local identificou solicitação fora do escopo histórico da NASA POWER."
          : "Local deterministic parser classified the request outside the historical NASA POWER scope.",
      initialHypothesis: "",
      filters: safeFilters,
      model: LOCAL_TRANSLATE_MODEL,
      cached: false,
    };
  }

  const normalizedWithoutSeason = normalized.replace(
    /\b(estacao chuvosa|periodo chuvoso|estacao seca|periodo seco|wet season|rainy season|dry season)\b/g,
    " ",
  );

  const matchedNight =
    /\b(noturn|noite|noites|minima|minimas|madrugada|geada|night|night-time|nighttime|minimum|t2m_min|frost)\b/.test(
      normalizedWithoutSeason,
    );
  const matchedRain =
    /\b(chuva|chuvas|chuvoso|chuvosa|precipitacao|seca|seco|estiagem|deficit|rain|rainfall|precipitation|dry|drought|prectotcorr)\b/.test(
      normalizedWithoutSeason,
    );
  const matchedSoil = /\b(solo|radicular|raiz|raizes|soil|moisture|wetness|root|gwetroot)\b/.test(
    normalizedWithoutSeason,
  );
  const matchedTemp =
    /\b(temperatura|aquecimento|esquent|calor|quente|termic|esfri|arrefec|frio|warm|warming|heat|hotter|cool|cooling|temperature|t2m)\b/.test(
      normalizedWithoutSeason,
    );
  const matchedMaxTemp =
    /\b(temperatura maxima|maxima|maximas|max temperature|maximum temperature|t2m_max|onda de calor|heatwave)\b/.test(
      normalized,
    );
  const matchedDaily = /\b(diario|diaria|diarios|diarias|daily|hourly|por hora)\b/.test(normalized);
  const matchedOtherUnsupportedMetric =
    /\b(radiacao|radiation|solar|vento|wind|umidade relativa|relative humidity)\b/.test(normalized);

  const dimensionCount = [
    matchedNight || matchedTemp || matchedMaxTemp,
    matchedRain,
    matchedSoil,
  ].filter(Boolean).length;
  const runMultiVariableScan =
    /\b(todas as variaveis|quais variaveis|quatro variaveis|varredura|fdr|diagnostico|all variables|which variables|four variables|full scan|compare variables|mudaram significativamente|changed significantly)\b/.test(
      normalized,
    ) || dimensionCount >= 2;

  let variable: VariableId;
  if (matchedNight) variable = "T2M_MIN";
  else if (matchedSoil) variable = "GWETROOT";
  else if (matchedRain && !matchedTemp && !matchedMaxTemp) variable = "PRECTOTCORR";
  else if (matchedTemp || matchedMaxTemp) variable = "T2M";
  else if (matchedRain) variable = "PRECTOTCORR";
  else variable = ctx?.variable ?? "PRECTOTCORR";

  let season: SeasonId;
  if (
    /\b(estacao seca|periodo seco|abr[\s-]*set|abril|setembro|inverno amazonico|dry season|apr[\s-]*sep|april to september|april-september)\b/.test(
      normalized,
    )
  ) {
    season = "apr_sep";
  } else if (
    /\b(estacao chuvosa|periodo chuvoso|out[\s-]*mar|outubro|marco|verao|wet season|rainy season|oct[\s-]*mar|october to march|october-march)\b/.test(
      normalized,
    )
  ) {
    season = "oct_mar";
  } else if (
    /\b(anual|todo o ano|ano inteiro|annual|yearly|all year|full year)\b/.test(normalized)
  ) {
    season = "annual";
  } else if (variable === "PRECTOTCORR" && /\b(seca|drought|dry)\b/.test(normalized)) {
    season = "apr_sep";
  } else if (!matchedRain && !matchedSoil && !matchedTemp && !matchedNight && ctx) {
    season = ctx.season;
  } else {
    season = "annual";
  }

  const curatedMatch = matchCuratedLocation(normalized);
  const coordMatch = extractCoordinatePair(question);
  const freeCity = !curatedMatch && !coordMatch ? extractFreeTextCity(question) : null;
  const hasExplicitLocation = Boolean(curatedMatch || coordMatch || freeCity);
  const reuseCurrentLocation = !hasExplicitLocation && Boolean(ctx);

  const years = inferYearBounds(normalized, maxCompleteYear, ctx, reuseCurrentLocation);

  const locationQuery = curatedMatch
    ? curatedMatch.label
    : coordMatch
      ? `${coordMatch.lat.toFixed(2)}, ${coordMatch.lon.toFixed(2)}`
      : freeCity
        ? freeCity
        : (ctx?.label ?? "Vilhena, RO, Brazil");

  const rawFilters: AiTranslatedFilters = {
    reuseCurrentLocation,
    locationQuery,
    ...(curatedMatch
      ? { lat: curatedMatch.lat, lon: curatedMatch.lon }
      : coordMatch
        ? { lat: coordMatch.lat, lon: coordMatch.lon }
        : {}),
    variable,
    season,
    startYear: years.startYear,
    endYear: years.endYear,
    runMultiVariableScan,
  };

  const filters = sanitizeAiTranslatedFilters(rawFilters, ctx, maxCompleteYear);

  const limitationParts: string[] = [];
  if (matchedMaxTemp) {
    limitationParts.push(
      lang === "pt"
        ? "A NASA POWER nesta plataforma analisa temperatura média (T2M) e mínima noturna (T2M_MIN); aplicada T2M como aproximação mais próxima de calor/máximas."
        : "This platform evaluates NASA POWER mean (T2M) and night-time minimum (T2M_MIN) temperature; T2M was selected as the closest proxy.",
    );
  }
  if (matchedDaily) {
    limitationParts.push(
      lang === "pt"
        ? "As tendências usam agregações sazonais/anuais (não séries diárias) para preservar robustez estatística."
        : "Trends use annual or seasonal aggregations (rather than daily steps) for statistical robustness.",
    );
  }
  if (matchedOtherUnsupportedMetric) {
    limitationParts.push(
      lang === "pt"
        ? "Métricas como radiação/vento não integram os 4 indicadores fechados; selecionado o indicador térmico/hídrico equivalente."
        : "Metrics such as solar radiation or wind are outside the 4 fixed variables; the closest thermal/moisture proxy was used.",
    );
  }
  if (years.requestedShortWindow) {
    limitationParts.push(
      lang === "pt"
        ? `O motor estatístico exige ao menos ${MIN_ANALYSIS_YEARS} anos completos; janela ajustada para ${filters.startYear}–${filters.endYear}.`
        : `The statistical engine requires at least ${MIN_ANALYSIS_YEARS} complete years; window adjusted to ${filters.startYear}–${filters.endYear}.`,
    );
  }

  const varName = getVariableLabel(filters.variable, lang);
  const seasonName = getSeasonLabel(filters.season, lang);

  return {
    ok: true,
    inScope: true,
    ...(limitationParts.length > 0 ? { limitationNotice: limitationParts.join(" ") } : {}),
    suggestedValidQuestions: [],
    reasoning:
      lang === "pt"
        ? `Parser semântico determinístico local mapeou local="${filters.locationQuery}", variável=${filters.variable} (${seasonName}) e janela ${filters.startYear}–${filters.endYear}.`
        : `Local deterministic semantic parser mapped location="${filters.locationQuery}", variable=${filters.variable} (${seasonName}), window ${filters.startYear}–${filters.endYear}.`,
    initialHypothesis:
      lang === "pt"
        ? `Testando tendência monotônica histórica em ${varName} (${seasonName}) para ${filters.locationQuery} entre ${filters.startYear} e ${filters.endYear}.`
        : `Testing historical monotonic trend in ${varName} (${seasonName}) for ${filters.locationQuery} across ${filters.startYear}–${filters.endYear}.`,
    filters,
    model: LOCAL_TRANSLATE_MODEL,
    cached: false,
  };
}

function buildFallbackHypotheses(
  variable: VariableId,
  direction: AiInterpretRequest["stats"]["direction"],
  lang: AiLocale,
): AiInterpretResult["hypotheses"] {
  if (variable === "PRECTOTCORR" || variable === "GWETROOT") {
    return lang === "pt"
      ? [
          {
            title: "Balanço de evapotranspiração e cobertura do solo",
            description:
              direction === "drier"
                ? "Mudanças no uso da terra, desmatamento regional ou maior demanda evaporativa podem alterar a reciclagem de umidade e reduzir o saldo hídrico sazonal."
                : "Alterações na cobertura superficial e no armazenamento radicular influenciam a retenção e recirculação de umidade ao longo da janela analisada.",
          },
          {
            title: "Variabilidade oceano–atmosfera de grande escala",
            description:
              "Oscilações plurianuais como ENSO (El Niño/La Niña) e gradientes de temperatura do Atlântico Tropical modulam os corredores de umidade e precipitação regional.",
          },
        ]
      : [
          {
            title: "Land-cover and evapotranspiration balance",
            description:
              direction === "drier"
                ? "Regional land-use shifts or elevated evaporative demand can alter surface moisture recycling and deepen seasonal water deficits."
                : "Surface-cover dynamics and root-zone storage affect regional moisture retention across multi-decade horizons.",
          },
          {
            title: "Large-scale ocean–atmosphere oscillations",
            description:
              "Multi-year modes such as ENSO and Tropical Atlantic SST gradients modulate regional moisture transport and convective rainfall.",
          },
        ];
  }

  return lang === "pt"
    ? [
        {
          title: "Aquecimento de fundo e balanço de energia em superfície",
          description:
            variable === "T2M_MIN"
              ? "Aumento da retenção de radiação de onda longa noturna e alterações na umidade atmosférica/uso do solo podem elevar mais fortemente as mínimas noturnas."
              : "Forçantes térmicas de larga escala somadas à redução da fração evaporativa superficial favorecem maior aquecimento sensível a 2 metros.",
        },
        {
          title: "Modulação climática regional e uso da terra",
          description:
            "Transições de cobertura vegetal, ilha de calor local e ciclos ENSO/Atlântico interagem com o ritmo de tendência detectado na célula de ~50 km.",
        },
      ]
    : [
        {
          title: "Background warming and surface energy partitioning",
          description:
            variable === "T2M_MIN"
              ? "Increased nocturnal longwave trapping alongside boundary-layer moisture and land-surface shifts can disproportionately warm minimum night temperatures."
              : "Large-scale thermal forcing combined with altered sensible-to-latent heat partitioning can elevate near-surface air temperatures.",
        },
        {
          title: "Land-surface feedback and climate oscillations",
          description:
            "Land-cover transitions, urban heat effects, and multi-year ENSO/Atlantic variability modulate the trend rate within the ~50 km grid cell.",
        },
      ];
}

/**
 * Deterministic Layer-3 scientific synthesis builder used when Gemini API routes
 * are unavailable or unconfigured, strictly citing verified stats and caveats.
 */
export function interpretWithLocalFallback(
  req: AiInterpretRequest,
  tempUnit: TemperatureUnit = "C",
): AiInterpretResult {
  const { stats, lang, location, variable, unit, season, extremeYears, scanSummary } = req;
  const displayUnit = getDisplayUnitLabel(unit, tempUnit);
  const deltaPerDecade = convertDeltaValue(stats.senSlopePerDecade, unit, tempUnit);
  const totalDelta = convertDeltaValue(stats.totalChangeOverPeriod, unit, tempUnit);
  const ciLow =
    stats.senSlopeCiLowerPerYear !== undefined
      ? convertDeltaValue(stats.senSlopeCiLowerPerYear * 10, unit, tempUnit)
      : undefined;
  const ciHigh =
    stats.senSlopeCiUpperPerYear !== undefined
      ? convertDeltaValue(stats.senSlopeCiUpperPerYear * 10, unit, tempUnit)
      : undefined;
  const meanDisp = convertAbsoluteValue(stats.fullPeriodMean, unit, tempUnit);
  const stdDisp = convertDeltaValue(stats.fullPeriodStdDev, unit, tempUnit);

  const varName = getVariableLabel(variable, lang);
  const seasonName = getSeasonLabel(season, lang);
  const pText = formatPValue(stats.pValue);

  let directAnswer: string;
  if (stats.verdict === "STRONG_EVIDENCE") {
    directAnswer =
      lang === "pt"
        ? `Há evidência estatística forte de tendência em ${varName} (${seasonName}) para ${location.label} entre ${stats.startYear} e ${stats.endYear} (n = ${stats.nYears}): taxa de ${formatSigned(deltaPerDecade)} ${displayUnit}/década e variação total de ${formatSigned(totalDelta)} ${displayUnit} (Z = ${stats.zScore.toFixed(2)}, p = ${pText}).`
        : `There is strong statistical evidence of a trend in ${varName} (${seasonName}) for ${location.label} across ${stats.startYear}–${stats.endYear} (n = ${stats.nYears}): Sen's slope of ${formatSigned(deltaPerDecade)} ${displayUnit}/decade and total change of ${formatSigned(totalDelta)} ${displayUnit} (Z = ${stats.zScore.toFixed(2)}, p = ${pText}).`;
  } else if (stats.verdict === "EVIDENCE_CONFIRMED") {
    directAnswer =
      lang === "pt"
        ? `Tendência estatisticamente confirmada (p < 0,05) em ${varName} (${seasonName}) para ${location.label} (${stats.startYear}–${stats.endYear}): ${formatSigned(deltaPerDecade)} ${displayUnit}/década, total de ${formatSigned(totalDelta)} ${displayUnit} (Z = ${stats.zScore.toFixed(2)}, p = ${pText}).`
        : `Statistically confirmed trend (p < 0.05) in ${varName} (${seasonName}) for ${location.label} (${stats.startYear}–${stats.endYear}): ${formatSigned(deltaPerDecade)} ${displayUnit}/decade, total change ${formatSigned(totalDelta)} ${displayUnit} (Z = ${stats.zScore.toFixed(2)}, p = ${pText}).`;
  } else {
    directAnswer =
      lang === "pt"
        ? `Evidência estatística insuficiente (p = ${pText} ≥ 0,05) para confirmar tendência monotônica em ${varName} (${seasonName}) em ${location.label} no recorte ${stats.startYear}–${stats.endYear}. Recomenda-se ampliar o período para 1981–${stats.endYear} ou executar a varredura de 4 variáveis.`
        : `Insufficient statistical evidence (p = ${pText} ≥ 0.05) to confirm a monotonic trend in ${varName} (${seasonName}) for ${location.label} over ${stats.startYear}–${stats.endYear}. Consider widening the window back to 1981 or scanning all 4 variables.`;
  }

  if (req.limitationNotice) {
    directAnswer = `${directAnswer} (${req.limitationNotice})`;
  }

  const keyFindings: string[] = [];
  const r2Suffix =
    typeof stats.rSquared === "number" ? `, OLS R² = ${(stats.rSquared * 100).toFixed(1)}%` : "";
  const ciPart =
    ciLow !== undefined && ciHigh !== undefined
      ? lang === "pt"
        ? ` · Inclinação Theil-Sen: ${formatSigned(deltaPerDecade)} ${displayUnit}/década (IC 95%: [${formatSigned(ciLow)}, ${formatSigned(ciHigh)}]).`
        : ` · Theil-Sen slope: ${formatSigned(deltaPerDecade)} ${displayUnit}/decade (95% CI: [${formatSigned(ciLow)}, ${formatSigned(ciHigh)}]).`
      : ".";
  keyFindings.push(
    lang === "pt"
      ? `Média do período: ${meanDisp.toFixed(1)} ${displayUnit} (±${stdDisp.toFixed(1)} ${displayUnit})${r2Suffix} em ${stats.nYears} anos${ciPart}`
      : `Period mean: ${meanDisp.toFixed(1)} ${displayUnit} (±${stdDisp.toFixed(1)} ${displayUnit})${r2Suffix} across ${stats.nYears} years${ciPart}`,
  );

  if (extremeYears.length > 0) {
    const top = extremeYears
      .slice(0, 3)
      .map((pt) => {
        const val = convertAbsoluteValue(pt.value, unit, tempUnit);
        return `${pt.label} (${val.toFixed(1)} ${displayUnit}, z=${pt.zScore.toFixed(2)})`;
      })
      .join("; ");
    keyFindings.push(
      lang === "pt"
        ? `Anos extremos mais marcantes em relação à média: ${top}.`
        : `Most prominent anomaly years relative to the period mean: ${top}.`,
    );
  }

  if (scanSummary && scanSummary.length > 0) {
    const fdrSignificantVars = scanSummary
      .filter((item) => item.fdrSignificant)
      .map((item) => item.variable);
    keyFindings.push(
      lang === "pt"
        ? `Varredura Benjamini-Hochberg FDR (4 variáveis): ${
            fdrSignificantVars.length > 0
              ? `${fdrSignificantVars.join(", ")} passaram com q < 0,05.`
              : "nenhuma variável atingiu q < 0,05 após correção múltipla."
          }`
        : `Benjamini-Hochberg FDR 4-variable scan: ${
            fdrSignificantVars.length > 0
              ? `${fdrSignificantVars.join(", ")} passed at q < 0.05.`
              : "no variable remained significant at q < 0.05 after multiple-testing correction."
          }`,
    );
  }

  if (stats.warnings?.shortRecord) {
    keyFindings.push(
      lang === "pt"
        ? `Alerta metodológico: série curta (< 20 anos, n = ${stats.nYears}) reduz o poder estatístico do teste de Mann-Kendall.`
        : `Methodological caveat: short record (< 20 years, n = ${stats.nYears}) lowers Mann-Kendall statistical power.`,
    );
  }

  if (stats.warnings?.highAutocorrelation) {
    const r1Text =
      typeof stats.lag1Autocorrelation === "number"
        ? ` (r₁ = ${stats.lag1Autocorrelation.toFixed(2)})`
        : "";
    keyFindings.push(
      lang === "pt"
        ? `Alerta metodológico: autocorrelação lag-1 elevada${r1Text} pode inflar a significância aparente do p-valor.`
        : `Methodological caveat: elevated lag-1 autocorrelation${r1Text} can inflate apparent p-value significance.`,
    );
  }

  const causalityWarning =
    lang === "pt"
      ? "Rigor científico (Correlação ≠ Causalidade): Mann-Kendall e Sen's Slope quantificam significância estatística numa célula NASA POWER/MERRA-2 (~50 km) e não provam causalidade isolada; recomenda-se cruzar com mapas locais de uso da terra (como MapBiomas)."
      : "Scientific guardrail (Correlation ≠ Causation): Mann-Kendall and Sen's Slope quantify statistical significance within a ~50 km NASA POWER/MERRA-2 grid cell and do not prove single-cause attribution; cross-check with local land-cover datasets (e.g., MapBiomas).";

  const cityShort = location.label.split(",")[0]?.trim() || location.label;
  const altSeasonLabel =
    lang === "pt"
      ? season === "apr_sep"
        ? "estação chuvosa (Out–Mar)"
        : "estação seca (Abr–Set)"
      : season === "apr_sep"
        ? "wet season (Oct–Mar)"
        : "dry season (Apr–Sep)";

  const followUpQuestions =
    lang === "pt"
      ? [
          `Quais das 4 variáveis climáticas mudaram significativamente em ${cityShort}?`,
          `Como está a tendência na ${altSeasonLabel} em ${cityShort}?`,
          stats.startYear > 1981
            ? `Como fica o histórico completo desde 1981 em ${cityShort}?`
            : `As noites em ${cityShort} ficaram mais quentes desde 1981?`,
        ]
      : [
          `Which of the 4 climate variables changed significantly in ${cityShort}?`,
          `What does the trend look like during the ${altSeasonLabel} in ${cityShort}?`,
          stats.startYear > 1981
            ? `What does the full record since 1981 show for ${cityShort}?`
            : `Are night-time temperatures warming in ${cityShort} since 1981?`,
        ];

  return {
    ok: true,
    directAnswer,
    keyFindings: keyFindings.slice(0, 4),
    hypotheses: buildFallbackHypotheses(variable, stats.direction, lang),
    causalityWarning,
    followUpQuestions: followUpQuestions.slice(0, 3),
    model: LOCAL_INTERPRET_MODEL,
    cached: false,
  };
}
