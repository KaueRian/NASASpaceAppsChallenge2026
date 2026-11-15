import type { CasePreset, SeriesPoint, VariableId } from "../../types/investigation.ts";
import { renderBrandMarkElements, renderBrandMarkSvg } from "../brand/logoGeometry.ts";
import { getStripeColor } from "../stats/stripesPalette.ts";

export const PITCH_SITE_URL = "https://geotrend.earth";
export const PITCH_SLIDE_COUNT = 7;

/**
 * ISO 18004 scannable QR code strokes (33x33 modules, version 2-M) encoding "https://geotrend.earth".
 */
export const GEOTREND_QR_PATH_D =
  "M4 4.5h7m2 0h3m4 0h1m1 0h7M4 5.5h1m5 0h1m5 0h1m1 0h2m2 0h1m5 0h1M4 6.5h1m1 0h3m1 0h1m1 0h2m1 0h2m1 0h1m1 0h1m1 0h1m1 0h3m1 0h1M4 7.5h1m1 0h3m1 0h1m1 0h7m3 0h1m1 0h3m1 0h1M4 8.5h1m1 0h3m1 0h1m1 0h2m8 0h1m1 0h3m1 0h1M4 9.5h1m5 0h1m1 0h1m6 0h1m2 0h1m5 0h1M4 10.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M12 11.5h1m1 0h2m2 0h3M4 12.5h1m1 0h5m2 0h1m1 0h1m1 0h3m2 0h5M4 13.5h5m2 0h1m2 0h1m1 0h1m1 0h1m1 0h1m2 0h1m3 0h1M4 14.5h5m1 0h1m3 0h1m1 0h2m1 0h1m1 0h5m1 0h2M4 15.5h1m1 0h1m4 0h3m2 0h1m3 0h4m4 0h1M5 16.5h1m2 0h4m2 0h1m2 0h2m2 0h2m1 0h1m1 0h3M4 17.5h2m6 0h1m3 0h1m1 0h1m1 0h1m2 0h1m1 0h1m1 0h1M4 18.5h1m1 0h1m1 0h1m1 0h4m4 0h4m1 0h3m1 0h2M4 19.5h1m3 0h1m5 0h1m1 0h1m2 0h3m1 0h2m3 0h1M4 20.5h1m1 0h2m1 0h4m1 0h1m1 0h9m1 0h1M12 21.5h3m2 0h1m1 0h2m3 0h2M4 22.5h7m4 0h2m3 0h1m1 0h1m1 0h1m1 0h3M4 23.5h1m5 0h1m1 0h2m1 0h1m4 0h1m3 0h2M4 24.5h1m1 0h3m1 0h1m1 0h2m1 0h1m3 0h6m1 0h3M4 25.5h1m1 0h3m1 0h1m1 0h2m2 0h2m1 0h4m1 0h5M4 26.5h1m1 0h3m1 0h1m1 0h1m4 0h3m1 0h1m3 0h2m1 0h1M4 27.5h1m5 0h1m2 0h1m2 0h2m2 0h6m2 0h1M4 28.5h7m1 0h1m3 0h1m1 0h1m3 0h7";

interface CaseSlideCopy {
  scaleTag: string;
  placeTitle: string;
  variableLabel: string;
  seasonLabel: string;
  directionColor: string;
  unitLabel: string;
  unitPerDecadeLabel: string;
  takeaway: string;
}

const CASE_SLIDE_COPY: Record<CasePreset["id"], CaseSlideCopy> = {
  "01": {
    scaleTag: "01 · LOCAL · CIDADE-SEDE",
    placeTitle: "Vilhena, RO — Brasil",
    variableLabel: "Precipitação Total (PRECTOTCORR)",
    seasonLabel: "Estação Seca · Abr–Set",
    directionColor: "#B8862E",
    unitLabel: "mm",
    unitPerDecadeLabel: "mm/década",
    takeaway: "Encurta diretamente a janela hídrica da 2ª safra no Cone Sul de Rondônia.",
  },
  "02": {
    scaleTag: "02 · ESTADUAL · RONDÔNIA",
    placeTitle: "Ariquemes, RO — Brasil",
    variableLabel: "Temperatura Mínima Noturna (T2M_MIN)",
    seasonLabel: "Série Anual · Jan–Dez",
    directionColor: "#C1472E",
    unitLabel: "°C",
    unitPerDecadeLabel: "°C/década",
    takeaway: "Noites tropicais mais quentes elevam estresse térmico humano, pecuário e no café.",
  },
  "03": {
    scaleTag: "03 · NACIONAL · PANTANAL",
    placeTitle: "Corumbá (Pantanal), MS — Brasil",
    variableLabel: "Umidade Radicular do Solo (GWETROOT)",
    seasonLabel: "Série Anual · Jan–Dez",
    directionColor: "#B8862E",
    unitLabel: "pts (%)",
    unitPerDecadeLabel: "pts/década",
    takeaway: "Ressecamento estrutural na zona das raízes amplia vulnerabilidade a queimadas.",
  },
  "04": {
    scaleTag: "04 · GLOBAL · CONTRASTE ÁRTICO",
    placeTitle: "Svalbard — Ártico",
    variableLabel: "Temperatura Média a 2m (T2M)",
    seasonLabel: "Série Anual · Jan–Dez",
    directionColor: "#C1472E",
    unitLabel: "°C",
    unitPerDecadeLabel: "°C/década",
    takeaway: "Amplificação polar comprova velocidades e respostas distintas em cada latitude.",
  },
};

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatPtDecimal(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", ",");
}

function formatSignedPt(value: number, decimals: number): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatPtDecimal(value, decimals)}`;
}

function formatPValuePt(pValue: number): string {
  if (pValue < 0.000001) return "p < 0,000001";
  return `p = ${formatPtDecimal(pValue, 6)}`;
}

/**
 * Renders real NASA POWER series Climate Stripes SVG from preset z-scores.
 */
export function renderStripesSvg(
  series: readonly SeriesPoint[],
  variable: VariableId,
  width: number,
  height: number,
  borderRadius = 3,
): string {
  const count = Math.max(1, series.length);
  const stripeW = width / count;
  const rects = series
    .map((point, index) => {
      const x = (index * stripeW).toFixed(2);
      const w = (stripeW + 0.35).toFixed(2);
      const fill = getStripeColor(point.zScore, variable);
      return `<rect x="${x}" y="0" width="${w}" height="${height}" fill="${fill}" />`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="none" role="img" aria-label="Faixas climáticas NASA POWER 1981 a 2025">
  <defs><clipPath id="clip-${variable}-${width}-${height}"><rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" /></clipPath></defs>
  <g clip-path="url(#clip-${variable}-${width}-${height})">${rects}</g>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${borderRadius}" fill="none" stroke="#2E2E30" stroke-width="1" />
</svg>`;
}

/**
 * Renders genuine observed NASA POWER polyline + Sen's Slope trendline SVG.
 */
export function renderSeriesTrendSvg(
  series: readonly SeriesPoint[],
  accentColor: string,
  width: number,
  height: number,
  options?: { showAxis?: boolean; showEndLabels?: boolean; unit?: string },
): string {
  if (series.length === 0) return "";
  const padX = options?.showAxis ? 42 : 10;
  const padY = options?.showAxis ? 20 : 8;
  const padBottom = options?.showAxis ? 26 : 8;
  const plotW = width - padX - 14;
  const plotH = height - padY - padBottom;

  const allVals = series.flatMap((p) => [p.value, p.trendValue]);
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const span = Math.max(0.001, rawMax - rawMin);
  const yMin = rawMin - span * 0.08;
  const yMax = rawMax + span * 0.08;

  const toX = (idx: number) =>
    padX + (series.length === 1 ? plotW / 2 : (idx / (series.length - 1)) * plotW);
  const toY = (val: number) => padY + (1 - (val - yMin) / (yMax - yMin)) * plotH;

  const obsPoints = series.map((p, idx) => `${toX(idx).toFixed(1)},${toY(p.value).toFixed(1)}`);
  const trendFirst = `${toX(0).toFixed(1)},${toY(series[0].trendValue).toFixed(1)}`;
  const trendLast = `${toX(series.length - 1).toFixed(1)},${toY(series[series.length - 1].trendValue).toFixed(1)}`;

  const gridLines = options?.showAxis
    ? [0, 0.5, 1]
        .map((ratio) => {
          const val = yMax - ratio * (yMax - yMin);
          const y = (padY + ratio * plotH).toFixed(1);
          const lbl = formatPtDecimal(val, Math.abs(val) >= 100 ? 0 : 1);
          return `<line x1="${padX}" y1="${y}" x2="${width - 14}" y2="${y}" stroke="#2E2E30" stroke-dasharray="3 3" stroke-width="1" />
<text x="${padX - 6}" y="${Number(y) + 3}" text-anchor="end" fill="#9B9B98" font-family="'Courier Prime', monospace" font-size="10">${lbl}</text>`;
        })
        .join("")
    : "";

  const extremeDots = series
    .map((p, idx) =>
      p.isExtremeAnomaly
        ? `<circle cx="${toX(idx).toFixed(1)}" cy="${toY(p.value).toFixed(1)}" r="${options?.showAxis ? 3.3 : 2.3}" fill="${accentColor}" stroke="#121212" stroke-width="1" />`
        : "",
    )
    .join("");

  const xLabels = options?.showAxis
    ? `<text x="${padX}" y="${height - 6}" fill="#9B9B98" font-family="'Courier Prime', monospace" font-size="10">${series[0].year}</text>
<text x="${padX + plotW / 2}" y="${height - 6}" text-anchor="middle" fill="#9B9B98" font-family="'Courier Prime', monospace" font-size="10">Série NASA POWER (${series.length} anos)</text>
<text x="${width - 14}" y="${height - 6}" text-anchor="end" fill="#9B9B98" font-family="'Courier Prime', monospace" font-size="10">${series[series.length - 1].year}</text>`
    : "";

  const endMarkers = options?.showEndLabels
    ? `<circle cx="${toX(0).toFixed(1)}" cy="${toY(series[0].trendValue).toFixed(1)}" r="3.5" fill="${accentColor}" />
<circle cx="${toX(series.length - 1).toFixed(1)}" cy="${toY(series[series.length - 1].trendValue).toFixed(1)}" r="4" fill="${accentColor}" />`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Série observada e linha de tendência de Sen">
  ${gridLines}
  <polyline fill="none" stroke="#EDEDEA" stroke-width="${options?.showAxis ? 1.8 : 1.5}" stroke-linejoin="round" stroke-linecap="round" points="${obsPoints.join(" ")}" opacity="0.92" />
  <line x1="${trendFirst.split(",")[0]}" y1="${trendFirst.split(",")[1]}" x2="${trendLast.split(",")[0]}" y2="${trendLast.split(",")[1]}" stroke="${accentColor}" stroke-width="${options?.showAxis ? 2.8 : 2.2}" stroke-dasharray="${options?.showAxis ? "6 4" : "none"}" stroke-linecap="round" />
  ${extremeDots}
  ${endMarkers}
  ${xLabels}
</svg>`;
}

/**
 * Vector diagram inspired by docs/concepts/05-dados-para-informacao.jpg:
 * raw NASA telemetry -> GeoTrend statistical hub -> Sen's Slope + Stripes + 99% Verdict.
 */
function renderDataToInfoSvg(case01: CasePreset): string {
  const miniStripes = case01.result.series
    .slice(0, 18)
    .map(
      (pt, i) =>
        `<rect x="${435 + i * 8.2}" y="130" width="8.5" height="32" fill="${getStripeColor(pt.zScore, case01.variable)}" />`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 280" width="100%" height="280" role="img" aria-label="Fluxo de Dados Brutos da NASA para Informação Verificada no GeoTrend">
  <rect x="1" y="1" width="638" height="278" rx="4" fill="#171719" stroke="#2E2E30" stroke-width="1" />
  <text x="24" y="30" fill="#9B9B98" font-family="'Courier Prime', monospace" font-size="11" font-weight="700" letter-spacing="1.6">DADOS BRUTOS DA NASA</text>
  <text x="616" y="30" text-anchor="end" fill="#C1472E" font-family="'Courier Prime', monospace" font-size="11" font-weight="700" letter-spacing="1.6">INFORMAÇÃO ACIONÁVEL</text>

  <!-- Noisy telemetry & grid tags on left -->
  <g font-family="'Courier Prime', monospace" font-size="11">
    <rect x="20" y="54" width="166" height="44" rx="3" fill="#121212" stroke="#2E2E30" />
    <text x="30" y="72" fill="#9B9B98">-999 · T2M · 18.42</text>
    <text x="30" y="88" fill="#5E5E5C">lon -60.14 · lat -12.74</text>

    <rect x="20" y="114" width="166" height="52" rx="3" fill="#121212" stroke="#2E2E30" />
    <path d="M30 144 L42 128 L52 154 L64 132 L76 156 L88 124 L100 150 L114 134 L126 155 L140 130 L154 148 L174 136" fill="none" stroke="#6BAED6" stroke-width="1.5" />
    <path d="M30 148 L44 138 L58 158 L72 136 L86 154 L102 129 L118 156 L136 135 L154 152 L174 141" fill="none" stroke="#C1472E" stroke-width="1.3" opacity="0.85" />

    <rect x="20" y="182" width="166" height="44" rx="3" fill="#121212" stroke="#2E2E30" />
    <text x="30" y="200" fill="#9B9B98">1981..2025 · mm/dia</text>
    <text x="30" y="216" fill="#5E5E5C">ciclo seco vs. chuvoso</text>
  </g>

  <!-- Convergence paths -->
  <path d="M186 76 C225 76, 225 136, 256 136" fill="none" stroke="#5E5E5C" stroke-width="1.6" />
  <path d="M186 140 L256 140" fill="none" stroke="#9B9B98" stroke-width="1.8" />
  <path d="M186 204 C225 204, 225 144, 256 144" fill="none" stroke="#5E5E5C" stroke-width="1.6" />

  <!-- Center GeoTrend Engine Ring -->
  <circle cx="312" cy="140" r="54" fill="#121212" stroke="#C1472E" stroke-width="2" />
  <circle cx="312" cy="140" r="46" fill="none" stroke="#2E2E30" stroke-width="1.2" stroke-dasharray="3 3" />
  <g transform="translate(284, 110) scale(1.75)">
    ${renderBrandMarkElements("dark")}
  </g>
  <text x="312" y="218" text-anchor="middle" fill="#EDEDEA" font-family="'Courier Prime', monospace" font-size="10" font-weight="700" letter-spacing="1.2">GEOTREND MOTOR</text>
  <text x="312" y="233" text-anchor="middle" fill="#9B9B98" font-family="'Courier Prime', monospace" font-size="9.5">Sazonal + Sen + MK</text>

  <!-- Output branching curves -->
  <path d="M366 132 C398 132, 398 76, 424 76" fill="none" stroke="#C1472E" stroke-width="1.8" />
  <path d="M366 140 L424 146" fill="none" stroke="#EDEDEA" stroke-width="1.6" />
  <path d="M366 148 C398 148, 398 214, 424 214" fill="none" stroke="#2E8B86" stroke-width="1.8" />

  <!-- Output cards on right -->
  <rect x="424" y="48" width="196" height="54" rx="3" fill="#1C1C1E" stroke="#2E2E30" />
  <polyline points="436,88 456,82 474,85 494,70 512,73 534,58" fill="none" stroke="#EDEDEA" stroke-width="1.5" />
  <line x1="436" y1="88" x2="534" y2="59" stroke="#C1472E" stroke-width="2" />
  <text x="546" y="71" fill="#EDEDEA" font-family="'Inter', sans-serif" font-size="11" font-weight="600">Declive</text>
  <text x="546" y="86" fill="#9B9B98" font-family="'Inter', sans-serif" font-size="10">de Sen</text>

  <rect x="424" y="116" width="196" height="60" rx="3" fill="#1C1C1E" stroke="#2E2E30" />
  ${miniStripes}
  <text x="590" y="143" fill="#EDEDEA" font-family="'Courier Prime', monospace" font-size="10" font-weight="700">Z</text>
  <text x="435" y="171" fill="#9B9B98" font-family="'Inter', sans-serif" font-size="10">Faixas de Anomalia (1981–2025)</text>

  <rect x="424" y="188" width="196" height="54" rx="3" fill="#1C1C1E" stroke="#2E2E30" />
  <text x="438" y="218" fill="#C1472E" font-family="'Courier Prime', monospace" font-size="22" font-weight="700">99%</text>
  <text x="494" y="211" fill="#EDEDEA" font-family="'Inter', sans-serif" font-size="11" font-weight="600">Veredito Auditado</text>
  <text x="494" y="227" fill="#9B9B98" font-family="'Inter', sans-serif" font-size="10">Dossiê &amp; Cartão PNG</text>
</svg>`;
}

function renderCaseCard(preset: CasePreset): string {
  const copy = CASE_SLIDE_COPY[preset.id];
  const { stats } = preset.result;
  const totalShiftStr = `${formatSignedPt(stats.totalChangeOverPeriod, 2)} ${copy.unitLabel}`;
  const slopeStr = `${formatSignedPt(stats.senSlopePerDecade, 2)} ${copy.unitPerDecadeLabel}`;
  const pStr = formatPValuePt(stats.pValue);
  const zStr = `Z = ${formatSignedPt(stats.zScore, 2)}`;
  const r2Str = `R² = ${formatPtDecimal(stats.rSquared ?? 0, 2)}`;
  const miniChart = renderSeriesTrendSvg(preset.result.series, copy.directionColor, 260, 74, {
    showEndLabels: true,
  });
  const stripes = renderStripesSvg(preset.result.series, preset.variable, 260, 14, 2);

  return `<article class="case-card">
    <div class="case-card-top">
      <span class="mono tag" style="color:${copy.directionColor}">${escapeHtml(copy.scaleTag)}</span>
      <span class="mono badge-strong">FORTE · ${stats.confidenceLevel}%</span>
    </div>
    <h3>${escapeHtml(copy.placeTitle)}</h3>
    <p class="case-meta">${escapeHtml(copy.variableLabel)} · ${escapeHtml(copy.seasonLabel)}</p>
    <div class="case-metrics">
      <div class="case-delta" style="color:${copy.directionColor}">${escapeHtml(totalShiftStr)}</div>
      <div class="case-stats mono">
        <div>${escapeHtml(slopeStr)}</div>
        <div>${escapeHtml(pStr)} · ${escapeHtml(zStr)} · ${escapeHtml(r2Str)}</div>
      </div>
    </div>
    <div class="case-viz">
      ${miniChart}
      ${stripes}
    </div>
    <p class="case-takeaway">${escapeHtml(copy.takeaway)}</p>
  </article>`;
}

function wrapSlide(
  slideNumber: number,
  eyebrow: string,
  bodyHtml: string,
  speakerNote: string,
  extraClass = "",
): string {
  const numStr = String(slideNumber).padStart(2, "0");
  const totalStr = String(PITCH_SLIDE_COUNT).padStart(2, "0");

  return `<section class="slide ${extraClass}" data-slide="${slideNumber}" data-note="${escapeHtml(speakerNote)}">
    <div class="slide-accent-bar"></div>
    <header class="slide-header">
      <span class="mono eyebrow">${escapeHtml(eyebrow)}</span>
      <div class="brand-chip">
        ${renderBrandMarkSvg({ size: 22, tone: "dark" })}
        <span class="brand-chip-name">GeoTrend</span>
        <span class="mono slide-counter">${numStr}/${totalStr}</span>
      </div>
    </header>
    <div class="slide-body">
      ${bodyHtml}
    </div>
    <footer class="slide-footer">
      <span class="mono">NASA POWER / MERRA-2 (1981–2025) · NASA GIBS MODIS · GEOTREND.EARTH</span>
      <span class="mono">POLO VILHENA — RO · NASA SPACE APPS 2026</span>
    </footer>
  </section>`;
}

/**
 * Builds the self-contained 7-slide Dark Editorial PT-BR presentation (16:9 screen + Print-to-PDF).
 */
export function buildPitchDeckHtml(presets: readonly CasePreset[]): string {
  const byId = new Map(presets.map((p) => [p.id, p]));
  const case01 = byId.get("01") ?? presets[0];
  const orderedCases = (["01", "02", "03", "04"] as const)
    .map((id) => byId.get(id))
    .filter((c): c is CasePreset => Boolean(c));

  const coverStripes = renderStripesSvg(case01.result.series, case01.variable, 1120, 78, 4);
  const vilhenaLargeChart = renderSeriesTrendSvg(case01.result.series, "#B8862E", 540, 238, {
    showAxis: true,
    showEndLabels: true,
    unit: "mm",
  });
  const dataToInfoDiagram = renderDataToInfoSvg(case01);

  const slide1 = wrapSlide(
    1,
    "NASA SPACE APPS CHALLENGE 2026 · POLO VILHENA — RONDÔNIA, BRASIL",
    `<div class="cover-layout">
      <div class="cover-top">
        <div class="cover-brand-row">
          ${renderBrandMarkSvg({ size: 92, tone: "dark" })}
          <div>
            <div class="cover-eyebrow mono">BE AN EARTH SYSTEM TREND DETECTIVE!</div>
            <h1 class="cover-title">GeoTrend</h1>
          </div>
        </div>
        <p class="cover-subtitle">Anomalia passageira ou tendência climática comprovada? Investigando <strong>45 anos</strong> de dados reais da NASA em Rondônia, no Brasil e no mundo.</p>
      </div>
      <div class="cover-stripes-box">
        <div class="cover-stripes-meta mono">
          <span>CASO #01 · VILHENA, RO (-12,74°, -60,14°)</span>
          <span style="color:#B8862E">ESTAÇÃO SECA ABR–SET · -234,46 mm (p = 0,000131 · CONFIANÇA 99%)</span>
        </div>
        ${coverStripes}
        <div class="cover-stripes-years mono">
          <span>1981</span>
          <span>Cada faixa vertical = 1 ano de precipitação na seca (ocre = déficit extremo · verde-água = umidade)</span>
          <span>2025</span>
        </div>
      </div>
      <div class="cover-pills mono">
        <span>AO VIVO EM HTTPS://GEOTREND.EARTH</span>
        <span>EQUIPE: HIGOR · KAUÊ · LUIS · MYLENA</span>
      </div>
    </div>`,
    "[0:00–0:20] Gancho Local: Boa tarde, jurados! Todo produtor rural de Vilhena já se perguntou se a estação seca está ficando mais severa ou se foi só um ano atípico de El Niño. Para responder com matemática e dados espaciais abertos, criamos o GeoTrend.",
    "is-active",
  );

  const slide2 = wrapSlide(
    2,
    "01 · O PROBLEMA · DO RUÍDO BRUTO À DECISÃO REAL",
    `<h2 class="slide-title">Gráficos comuns enganam. Dados espaciais brutos ficam isolados fora do campo e da escola.</h2>
    <div class="diagram-frame">
      ${dataToInfoDiagram}
    </div>
    <div class="grid-3">
      <div class="card">
        <span class="mono tag" style="color:#C1472E">01 · ARMADILHA SAZONAL</span>
        <h3>Oscilação anual mascara tendências</h3>
        <p>Analisar meses seguidos sem separar chuva e seca cria ruído artificial e esconde mudanças graduais de décadas.</p>
      </div>
      <div class="card">
        <span class="mono tag" style="color:#C1472E">02 · OUTLIERS &amp; BARREIRA TÉCNICA</span>
        <h3>Dados NASA exigem programação</h3>
        <p>Séries NASA POWER / MERRA-2 trazem valores sentinela (-999), grades de ~50 km e fórmulas inacessíveis a produtores e escolas.</p>
      </div>
      <div class="card">
        <span class="mono tag" style="color:#C1472E">03 · IMPACTO NO CONE SUL DE RO</span>
        <h3>Decisões sem prova estatística</h3>
        <p>Sem quantificar magnitude e significância, planejamento da 2ª safra, bacias hídricas e educação ambiental ficam no achismo.</p>
      </div>
    </div>`,
    "[0:20–0:40] O Problema: Um gráfico comum confunde oscilação normal ou um evento extremo com mudança real. E baixar dados brutos da NASA exige limpeza e estatística que não chegam ao produtor nem à sala de aula.",
  );

  const slide3 = wrapSlide(
    3,
    "02 · AS 4 PERGUNTAS DA NASA & O MOTOR CIENTÍFICO",
    `<h2 class="slide-title">Uma bancada pericial em 4 passos: limpar o ciclo sazonal, medir o declive e testar a significância.</h2>
    <div class="grid-2x2">
      <div class="card">
        <span class="mono tag" style="color:#4C7EA8">PERGUNTA 01 · O QUE MUDOU?</span>
        <h3>4 Variáveis Essenciais da NASA POWER / MERRA-2</h3>
        <p>Ingestão direta de <strong>1981 a 2025 (45 anos completos)</strong>: Temperatura Média (<code>T2M</code>), Mínima Noturna (<code>T2M_MIN</code>), Precipitação Corrigida (<code>PRECTOTCORR</code> em mm reais) e Umidade Radicular do Solo (<code>GWETROOT</code> em 0–100%).</p>
      </div>
      <div class="card">
        <span class="mono tag" style="color:#2E8B86">PERGUNTA 02 · ONDE E EM QUAL JANELA?</span>
        <h3>Estratificação de Janelas Sazonais</h3>
        <p>Antes de rodar qualquer teste, filtramos <code>-999</code> e agrupamos anos hidrológicos homólogos: <strong>Anual (Jan–Dez)</strong>, <strong>Chuvosa (Out–Mar)</strong> e <strong>Seca (Abr–Set)</strong>, exigindo mínimo de <strong>15 anos completos</strong>.</p>
      </div>
      <div class="card">
        <span class="mono tag" style="color:#C1472E">PERGUNTA 03 · QUANTO MUDOU?</span>
        <h3>Estimador de Inclinação de Sen (Sen's Slope)</h3>
        <p>Mediana de todas as inclinações entre pares de anos, com <strong>Intervalo de Confiança de 95%</strong>. Mede mudança por década e variação total em 45 anos sem ser distorcido por um único El Niño extremo.</p>
      </div>
      <div class="card">
        <span class="mono tag" style="color:#B8862E">PERGUNTA 04 · É ESTATISTICAMENTE REAL?</span>
        <h3>Teste Não-Paramétrico de Mann-Kendall</h3>
        <p>Calcula estatística <code>S</code>, variância corrigida para empates, escore <code>Z</code> e <code>valor-p</code> bicaudal para emitir veredito objetivo: <strong>Evidência Forte (99%)</strong>, <strong>Confirmada (95%)</strong> ou <strong>Insuficiente</strong>.</p>
      </div>
    </div>
    <div class="method-strip mono">
      <span>127 TESTES AUTOMATIZADOS (19 SUÍTES)</span>
      <span>VARREDURA FDR BENJAMINI-HOCHBERG NAS 4 VARIÁVEIS</span>
      <span>ALERTA AUTOMÁTICO DE AUTOCORRELAÇÃO LAG-1</span>
    </div>`,
    "[0:40–1:15] Como Funciona: O GeoTrend responde exatamente às 4 perguntas do desafio. Isolamos a estação seca da chuvosa, aplicamos o Estimador de Sen para saber o quanto mudou sem distorção de anos atípicos, e rodamos Mann-Kendall para provar se há 95% ou 99% de confiança.",
  );

  const slide4 = wrapSlide(
    4,
    "03 · DESCOBERTAS REAIS NAS 4 ESCALAS (1981–2025 · n = 45 ANOS)",
    `<h2 class="slide-title">De Vilhena ao Ártico: quatro biomas reais comprovando velocidades regionais distintas.</h2>
    <div class="cases-grid">
      ${orderedCases.map(renderCaseCard).join("")}
    </div>`,
    "[1:15–1:55] Resultados Reais: Partindo daqui de Vilhena: a estação seca perdeu 234,46 milímetros de chuva desde 1981 (-53,29 mm/década, 99% de confiança). Em Ariquemes, as noites subiram +1,82 °C. No Pantanal, a umidade do solo caiu -5,60 pontos. E em Svalbard no Ártico, +3,50 °C provam a amplificação polar comparada ao Brasil.",
  );

  const slide5 = wrapSlide(
    5,
    "04 · PLATAFORMA AO VIVO EM GEOTREND.EARTH",
    `<h2 class="slide-title">Do município à órbita: busca em linguagem natural, satélite NASA MODIS e cartões compartilháveis.</h2>
    <div class="demo-split">
      <div class="demo-left card">
        <div class="case-card-top">
          <span class="mono tag" style="color:#B8862E">EVIDÊNCIA VISUAL · CASO #01 VILHENA</span>
          <span class="mono badge-strong">STRONG EVIDENCE · p = 0,000131</span>
        </div>
        <h3>Seca de Vilhena perdeu -53,29 mm por década (Abr–Set)</h3>
        <div class="demo-chart-box">
          ${vilhenaLargeChart}
        </div>
        <div class="demo-legend mono">
          <span>━ Série NASA POWER observada</span>
          <span style="color:#B8862E">┄ Tendência de Sen (-234,46 mm em 45 anos)</span>
          <span>● Anomalia extrema (|z| &gt; 1,5)</span>
        </div>
      </div>
      <div class="demo-right">
        <div class="feature-item">
          <span class="mono tag" style="color:#C1472E">01 · BUSCA GLOBAL &amp; IA EM 3 ETAPAS</span>
          <p>Pergunte em português ou inglês por <strong>qualquer cidade do planeta</strong> (ou selecione no mapa + 20 casos calibrados). Tradução de filtros e síntese com transparência por etapa e modo local resiliente.</p>
        </div>
        <div class="feature-item">
          <span class="mono tag" style="color:#2E8B86">02 · SATÉLITE NASA GIBS / MODIS (2000–2025)</span>
          <p>Comparação orbital <strong>Antes vs. Depois</strong> e timelapse anual em <em>True Color</em> e índice de vegetação <em>NDVI</em>, exportáveis em PNG com citação da NASA.</p>
        </div>
        <div class="feature-item">
          <span class="mono tag" style="color:#4C7EA8">03 · ESTÚDIO DE COMPARTILHAMENTO &amp; CITAÇÕES</span>
          <p>Exporte <strong>CSV</strong>, cards <strong>Story 9:16</strong>, <strong>1:1</strong>, <strong>Slide 16:9</strong> e figura <strong>Artigo</strong>, além de referências prontas em <strong>ABNT (NBR 6023), APA e BibTeX</strong>.</p>
        </div>
        <div class="feature-item">
          <span class="mono tag" style="color:#B8862E">04 · EXPLORAR &amp; PARIDADE BILÍNGUE</span>
          <p>Alternância instantânea <code>PT | EN</code> e <code>°C | °F</code>, mais o modo interativo <strong>Sua Linha do Tempo Climática</strong> desde o ano de nascimento.</p>
        </div>
      </div>
    </div>`,
    "[1:55–2:25] Demonstração: Seguindo o Manual de Vilhena, qualquer pessoa busca qualquer município brasileiro em frase natural, compara imagens de satélite NASA MODIS de 2000 contra 2025, alterna para Faixas Climáticas e exporta CSV, card PNG ou citação ABNT em português ou inglês.",
  );

  const slide6 = wrapSlide(
    6,
    "05 · RIGOR CIENTÍFICO & MISSÃO AMAZÔNIA",
    `<h2 class="slide-title">Significância estatística não é causalidade única — ciência aberta exige contexto territorial.</h2>
    <div class="grid-2">
      <div class="card card-tall">
        <span class="mono tag" style="color:#C1472E">GUARDRAILS METODOLÓGICOS (ARQUIVO DE MÉTODOS 01–07)</span>
        <ul class="editorial-list">
          <li><strong>Correlação ≠ Causalidade:</strong> O teste de Mann-Kendall comprova mudança direcional consistente nos dados observados, sem reduzir fenômenos complexos a uma causa isolada.</li>
          <li><strong>Escala de Reanálise (~50 km):</strong> Explicação explícita da resolução da grade MERRA-2 e leitura conjunta com uso do solo (<strong>MapBiomas</strong>) e zoneamento agrícola (ZARC/Embrapa).</li>
          <li><strong>Transparência Matemática:</strong> Fórmulas completas, intervalos de confiança 95%, controle de falsas descobertas (BH FDR) e alertas de autocorrelação serial visíveis na interface.</li>
        </ul>
      </div>
      <div class="card card-tall">
        <span class="mono tag" style="color:#2E8B86">CONEXÃO LOCAL · MISSÃO AMAZÔNIA &amp; ODS DA ONU</span>
        <div class="sdg-list">
          <div class="sdg-row">
            <span class="sdg-code mono" style="border-color:#4C7EA8;color:#4C7EA8">ODS 6</span>
            <div><strong>Água Limpa e Saneamento</strong><br /><span>Evidência hídrica da estação seca em Vilhena (-53,29 mm/década) e da bacia do Pantanal para gestão regional.</span></div>
          </div>
          <div class="sdg-row">
            <span class="sdg-code mono" style="border-color:#C1472E;color:#C1472E">ODS 13</span>
            <div><strong>Ação Contra a Mudança do Clima</strong><br /><span>Separa variabilidade natural de tendências reais de aquecimento noturno em Rondônia (+1,82 °C) e no globo.</span></div>
          </div>
          <div class="sdg-row">
            <span class="sdg-code mono" style="border-color:#2E8B86;color:#2E8B86">ODS 15</span>
            <div><strong>Vida Terrestre &amp; Educação</strong><br /><span>Cartões visuais e metodologia didática prontos para escolas, universidades, cooperativas agrícolas e Defesa Civil.</span></div>
          </div>
        </div>
      </div>
    </div>`,
    "[2:25–2:40] Rigor e Missão Amazônia: Nosso Arquivo de Métodos ensina estudantes e gestores a não confundir correlação com causalidade, dialogando com o MapBiomas e os ODS 6, 13 e 15 em Vilhena e na Amazônia.",
  );

  const slide7 = wrapSlide(
    7,
    "06 · CIÊNCIA VERIFICÁVEL EM PRODUÇÃO · ENCERRAMENTO",
    `<div class="closing-layout">
      <div class="closing-left">
        <span class="mono tag" style="color:#C1472E">PRONTO PARA O CAMPO, A SALA DE AULA E A BANCA GLOBAL</span>
        <h2 class="closing-quote">“Contra o achismo climático, entregamos perícia científica auditável com dados abertos da NASA.”</h2>
        <div class="closing-stack">
          <div class="stack-pill"><span class="mono">FRONTEND</span><strong>React + TypeScript + SVG Editorial</strong></div>
          <div class="stack-pill"><span class="mono">BORDA &amp; CACHE</span><strong>Cloudflare Workers + Banco Global</strong></div>
          <div class="stack-pill"><span class="mono">DADOS &amp; QUALIDADE</span><strong>NASA POWER · GIBS · 19 Suítes / 127 Testes</strong></div>
        </div>
        <div class="team-box">
          <span class="mono tag" style="color:#9B9B98">EQUIPE GEOTREND · POLO VILHENA (RO)</span>
          <p class="team-names">Higor &nbsp;·&nbsp; Kauê Rian &nbsp;·&nbsp; Luis &nbsp;·&nbsp; Mylena</p>
        </div>
      </div>
      <div class="closing-qr-card">
        <span class="mono qr-kicker">ACESSE O PROJETO AO VIVO</span>
        <div class="qr-svg-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33" width="220" height="220" shape-rendering="crispEdges" role="img" aria-label="QR Code para https://geotrend.earth">
            <path fill="#FFFFFF" d="M0 0h33v33H0z" />
            <path stroke="#14110F" d="${GEOTREND_QR_PATH_D}" />
          </svg>
        </div>
        <div class="qr-url mono">https://geotrend.earth</div>
        <p class="qr-caption">Teste agora no celular em PT ou EN: Caso #01 Vilhena, investigação ao vivo, satélite MODIS e cartão PNG.</p>
      </div>
    </div>`,
    "[2:40–3:00] Fechamento: O GeoTrend já está publicado em geotrend.earth, bilíngue em português e inglês, auditado por 127 testes automatizados. Apontem a câmera para testar agora. Contra o achismo climático, ciência com dados da NASA. Muito obrigado!",
  );

  const slidesMarkup = [slide1, slide2, slide3, slide4, slide5, slide6, slide7].join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GeoTrend — Apresentação Oficial (NASA Space Apps 2026 · Polo Vilhena)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #121212;
      --surface: #1C1C1E;
      --surface-soft: #171719;
      --text: #EDEDEA;
      --muted: #9B9B98;
      --accent: #C1472E;
      --border: #2E2E30;
      --slide-w: 1280px;
      --slide-h: 720px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      background: #0B0B0C;
      color: var(--text);
      font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
      height: 100%;
    }

    .mono {
      font-family: "Courier Prime", "Courier New", ui-monospace, SFMono-Regular, monospace;
    }

    code {
      font-family: "Courier Prime", "Courier New", monospace;
      font-size: 0.92em;
      color: var(--text);
      background: #121212;
      border: 1px solid var(--border);
      padding: 1px 5px;
      border-radius: 2px;
    }

    /* Stage container on screen */
    .deck-viewport {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 18px 20px 68px;
      gap: 24px;
    }

    body.overview-mode .deck-viewport {
      justify-content: flex-start;
      padding-top: 28px;
    }

    .slide {
      width: min(1280px, calc(100vw - 40px));
      aspect-ratio: 16 / 9;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      position: relative;
      display: none;
      flex-direction: column;
      padding: 28px 44px 22px;
      overflow: hidden;
    }

    .slide.is-active,
    body.overview-mode .slide {
      display: flex;
    }

    .slide-accent-bar {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 5px;
      background: var(--accent);
    }

    .slide-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
      margin-bottom: 18px;
    }

    .eyebrow {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: var(--accent);
      text-transform: uppercase;
    }

    .brand-chip {
      display: inline-flex;
      align-items: center;
      gap: 9px;
    }

    .brand-chip-name {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
    }

    .slide-counter {
      font-size: 12px;
      color: var(--muted);
      border-left: 1px solid var(--border);
      padding-left: 9px;
    }

    .slide-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      min-height: 0;
    }

    .slide-title {
      font-family: "Playfair Display", Georgia, "Times New Roman", serif;
      font-size: clamp(23px, 2.3vw, 31px);
      line-height: 1.18;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.015em;
    }

    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid var(--border);
      padding-top: 9px;
      margin-top: 10px;
      font-size: 11px;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    /* Slide 1 Cover */
    .cover-layout {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 8px 0 4px;
    }

    .cover-brand-row {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 14px;
    }

    .cover-eyebrow {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.18em;
      color: var(--accent);
      margin-bottom: 4px;
    }

    .cover-title {
      font-family: "Playfair Display", Georgia, serif;
      font-size: clamp(54px, 6vw, 76px);
      line-height: 1;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--text);
    }

    .cover-subtitle {
      font-size: clamp(18px, 1.8vw, 23px);
      line-height: 1.42;
      color: #D2D2CE;
      max-width: 980px;
    }

    .cover-stripes-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .cover-stripes-meta,
    .cover-stripes-years {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 12px;
      color: var(--muted);
    }

    .cover-stripes-meta span:first-child { color: var(--text); font-weight: 700; }

    .cover-pills {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      letter-spacing: 0.1em;
      color: var(--text);
    }

    .cover-pills span {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 8px 14px;
      border-radius: 3px;
    }

    /* Common editorial grids & cards */
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
      flex: 1;
    }

    .grid-2x2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      flex: 1;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .card h3 {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 19px;
      line-height: 1.24;
      color: var(--text);
    }

    .card p {
      font-size: 14.5px;
      line-height: 1.46;
      color: #D2D2CE;
    }

    .tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .diagram-frame {
      width: 100%;
    }

    .method-strip {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      background: var(--surface-soft);
      border: 1px solid var(--border);
      padding: 10px 16px;
      border-radius: 3px;
      font-size: 11.5px;
      color: var(--muted);
      letter-spacing: 0.08em;
    }

    /* Slide 4 Cases */
    .cases-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 13px;
      flex: 1;
    }

    .case-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 13px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 5px;
    }

    .case-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .badge-strong {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text);
      border: 1px solid var(--border);
      background: #121212;
      padding: 2px 7px;
      border-radius: 2px;
    }

    .case-card h3 {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 18px;
      color: var(--text);
    }

    .case-meta {
      font-size: 12.5px;
      color: var(--muted);
    }

    .case-metrics {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      margin: 2px 0;
    }

    .case-delta {
      font-family: "Courier Prime", monospace;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .case-stats {
      text-align: right;
      font-size: 11px;
      line-height: 1.35;
      color: var(--muted);
    }

    .case-viz {
      display: flex;
      flex-direction: column;
      gap: 3px;
      background: #141416;
      border: 1px solid #242426;
      padding: 5px 6px;
      border-radius: 3px;
    }

    .case-takeaway {
      font-size: 13px;
      line-height: 1.34;
      color: #D7D7D2;
    }

    /* Slide 5 Demo */
    .demo-split {
      display: grid;
      grid-template-columns: 1.18fr 1fr;
      gap: 18px;
      flex: 1;
      min-height: 0;
    }

    .demo-left {
      justify-content: space-between;
    }

    .demo-chart-box {
      background: #121212;
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 10px;
    }

    .demo-legend {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--muted);
    }

    .demo-right {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 10px;
    }

    .feature-item {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px 15px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .feature-item p {
      font-size: 13.5px;
      line-height: 1.42;
      color: #D2D2CE;
    }

    /* Slide 6 Guardrails & SDGs */
    .card-tall {
      justify-content: flex-start;
      padding: 20px 22px;
      gap: 14px;
    }

    .editorial-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .editorial-list li {
      font-size: 15px;
      line-height: 1.5;
      color: #D7D7D2;
      border-left: 2px solid var(--accent);
      padding-left: 14px;
    }

    .editorial-list strong {
      color: var(--text);
    }

    .sdg-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .sdg-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .sdg-code {
      min-width: 72px;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      padding: 7px 6px;
      border: 1px solid;
      border-radius: 3px;
      background: #121212;
      flex-shrink: 0;
    }

    .sdg-row strong {
      display: inline-block;
      font-size: 15.5px;
      color: var(--text);
      margin-bottom: 2px;
    }

    .sdg-row span {
      font-size: 14px;
      line-height: 1.42;
      color: #CFCFCB;
    }

    /* Slide 7 Closing */
    .closing-layout {
      flex: 1;
      display: grid;
      grid-template-columns: 1.35fr 0.85fr;
      gap: 26px;
      align-items: center;
    }

    .closing-left {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .closing-quote {
      font-family: "Playfair Display", Georgia, serif;
      font-size: clamp(28px, 2.9vw, 37px);
      line-height: 1.24;
      color: var(--text);
      font-weight: 700;
    }

    .closing-stack {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .stack-pill {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stack-pill span {
      font-size: 10.5px;
      color: var(--muted);
      letter-spacing: 0.1em;
    }

    .stack-pill strong {
      font-size: 12.5px;
      color: var(--text);
    }

    .team-box {
      border-top: 1px solid var(--border);
      padding-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .team-names {
      font-size: 17px;
      font-weight: 600;
      color: var(--text);
    }

    .closing-qr-card {
      background: #F4EFE6;
      color: #14110F;
      border-radius: 4px;
      padding: 24px 22px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      border: 1px solid #D8CFC0;
    }

    .qr-kicker {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: #C1472E;
    }

    .qr-svg-wrap {
      padding: 8px;
      background: #FFFFFF;
      border: 1px solid #D8CFC0;
      border-radius: 2px;
      line-height: 0;
    }

    .qr-url {
      font-size: 19px;
      font-weight: 700;
      color: #14110F;
    }

    .qr-caption {
      font-size: 13px;
      line-height: 1.4;
      color: #463F37;
    }

    /* Screen Presenter Bar (hidden on print) */
    .presenter-bar {
      position: fixed;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(24, 24, 26, 0.94);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 7px 14px;
      z-index: 40;
      backdrop-filter: blur(8px);
    }

    .presenter-bar button {
      background: #242428;
      color: var(--text);
      border: 1px solid #3A3A3E;
      border-radius: 999px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
    }

    .presenter-bar button:hover {
      border-color: var(--accent);
    }

    .presenter-bar .btn-accent {
      background: var(--accent);
      border-color: var(--accent);
      color: #FFFFFF;
      font-weight: 600;
    }

    .speaker-note-drawer {
      position: fixed;
      top: 14px;
      right: 14px;
      max-width: 440px;
      background: rgba(28, 28, 30, 0.96);
      border: 1px solid var(--accent);
      border-radius: 4px;
      padding: 12px 15px;
      font-size: 13px;
      line-height: 1.45;
      color: var(--text);
      display: none;
      z-index: 45;
    }

    .speaker-note-drawer.is-open { display: block; }
    .speaker-note-drawer strong {
      display: block;
      font-size: 11px;
      letter-spacing: 0.1em;
      color: var(--accent);
      margin-bottom: 5px;
    }

    /* Print / PDF 16:9 Exact Page Export */
    @page {
      size: 13.333in 7.5in;
      margin: 0;
    }

    @media print {
      html, body {
        background: var(--bg);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        margin: 0;
        padding: 0;
      }

      .presenter-bar,
      .speaker-note-drawer,
      .speaker-note-drawer.is-open {
        display: none;
      }

      .deck-viewport,
      body.overview-mode .deck-viewport {
        display: block;
        padding: 0;
        margin: 0;
      }

      .slide,
      .slide.is-active,
      body.overview-mode .slide {
        display: flex;
        width: 13.333in;
        height: 7.5in;
        max-width: none;
        border: none;
        border-radius: 0;
        break-after: page;
        page-break-after: always;
      }

      .slide:last-child {
        break-after: auto;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div id="speaker-note" class="speaker-note-drawer no-print" role="status" aria-live="polite">
    <strong class="mono">ROTEIRO DO ORADOR (180 SEGUNDOS)</strong>
    <span id="speaker-note-text"></span>
  </div>

  <main class="deck-viewport" id="deck">
    ${slidesMarkup}
  </main>

  <nav class="presenter-bar no-print" aria-label="Controles da apresentação">
    <button type="button" id="btn-prev" title="Anterior (←)">← Anterior</button>
    <span class="mono" id="hud-counter" style="font-size:12px;padding:0 6px;color:#EDEDEA">01 / 07</span>
    <button type="button" id="btn-next" title="Próximo (→ ou Espaço)">Próximo →</button>
    <button type="button" id="btn-overview" title="Ver todos os slides (G)">Visão Geral [G]</button>
    <button type="button" id="btn-notes" title="Notas do orador (N)">Notas [N]</button>
    <button type="button" id="btn-fullscreen" title="Tela cheia (F)">Tela Cheia [F]</button>
    <button type="button" id="btn-print" class="btn-accent" title="Salvar como PDF 16:9 (Ctrl+P)">Exportar PDF 16:9</button>
  </nav>

  <script>
    (() => {
      const slides = Array.from(document.querySelectorAll(".slide"));
      const counter = document.getElementById("hud-counter");
      const noteDrawer = document.getElementById("speaker-note");
      const noteText = document.getElementById("speaker-note-text");
      let activeIndex = 0;

      function updateDeck() {
        slides.forEach((el, idx) => {
          el.classList.toggle("is-active", idx === activeIndex);
        });
        counter.textContent = \`\${String(activeIndex + 1).padStart(2, "0")} / \${String(slides.length).padStart(2, "0")}\`;
        noteText.textContent = slides[activeIndex]?.getAttribute("data-note") || "";
      }

      function goTo(nextIdx) {
        activeIndex = Math.max(0, Math.min(slides.length - 1, nextIdx));
        updateDeck();
        if (document.body.classList.contains("overview-mode")) {
          slides[activeIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      document.getElementById("btn-prev")?.addEventListener("click", () => { goTo(activeIndex - 1); });
      document.getElementById("btn-next")?.addEventListener("click", () => { goTo(activeIndex + 1); });
      document.getElementById("btn-overview")?.addEventListener("click", () => {
        document.body.classList.toggle("overview-mode");
      });
      document.getElementById("btn-notes")?.addEventListener("click", () => {
        noteDrawer?.classList.toggle("is-open");
      });
      document.getElementById("btn-fullscreen")?.addEventListener("click", () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
      });
      document.getElementById("btn-print")?.addEventListener("click", () => {
        window.print();
      });

      document.addEventListener("keydown", (ev) => {
        if (ev.key === "ArrowRight" || ev.key === " " || ev.key === "PageDown") {
          ev.preventDefault();
          goTo(activeIndex + 1);
        } else if (ev.key === "ArrowLeft" || ev.key === "PageUp") {
          ev.preventDefault();
          goTo(activeIndex - 1);
        } else if (ev.key === "Home") {
          goTo(0);
        } else if (ev.key === "End") {
          goTo(slides.length - 1);
        } else if (ev.key === "g" || ev.key === "G") {
          document.body.classList.toggle("overview-mode");
        } else if (ev.key === "n" || ev.key === "N") {
          noteDrawer?.classList.toggle("is-open");
        } else if (ev.key === "f" || ev.key === "F") {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
          } else {
            document.exitFullscreen?.();
          }
        }
      });

      updateDeck();
    })();
  </script>
</body>
</html>
`;
}
