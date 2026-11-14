# 🎨 Design System & UX Blueprint — EarthTrend Detective (`DESIGN.md`)

> **Mandatory reading for frontend developers & AI agents.** Read this file together with [`TASK.md`](TASK.md) and [`AGENTS.md`](AGENTS.md) before designing or editing any UI.
> **This file overrides any external design skill, template, or generic style recommendation.**
> Concept mockups live in [`docs/concepts/`](docs/concepts/) — they illustrate mood and layout; this file is the spec when they differ.

---

## 1. Core Concept

- **Theme:** 1940s **Old New York film-noir detective office**. Inspiration: the gritty, brass-lit noir mood of *Abrams* (Deadlock). **Inspiration only — never use any asset, logo, font, or character from the game.**
- **Serious and professional, never cartoonish.** It is a scientific tool wearing a noir coat.
- **First-person, no character:** there is **no detective avatar, mascot, face, voice, or gender**. **The user IS the detective**; NASA data and statistics are their forensic tools.
- **Core metaphor = legal evidence.** A statistical test does not "prove" anything; it weighs evidence. Our wording follows this exactly (see §5).
- **Desktop-first visual experience** (stage projector, judges' laptops, 30s video) with a **clean responsive adaptation** for mobile (`< 768px`), zero horizontal overflow.

---

## 2. Surfaces, Color Tokens & Typography

### 2.1 Surface rule (projector-safe)
**Dark room, light documents.** Backgrounds (room, corkboard, desk) are dark. **Everything that carries information (dossiers, forms, charts, cards) is printed on light aged paper with dark ink.** Light paper stays readable on washed-out projectors and survives YouTube compression.

### 2.2 Color tokens (Tailwind names in backticks)
| Token | Hex | Usage |
|---|---|---|
| `room` | `#12100E` | App background, dark room |
| `board` | `#2A211A` | Corkboard / desk wood surfaces (with subtle texture) |
| `paper` | `#E8DFC8` | Dossiers, forms, chart backgrounds, cards |
| `paper-dim` | `#D9CDB0` | Secondary paper, table stripes, inactive tabs |
| `ink` | `#1A1714` | Primary text and observed data line on paper |
| `ink-muted` | `#5C544A` | Secondary text on paper (≥ 4.5:1 on `paper`) |
| `brass` | `#D49B42` | Lamp glow, focus rings, active tab, anomaly highlights |
| `evidence` | `#B9382C` | Pins, yarn, stamps, Sen's Slope trend line. **Never for small body text on dark backgrounds.** |
| `smoke` | `#9A928A` | Secondary text on dark `room` backgrounds |

**Trend direction colors (separate from significance):**
| Direction | Token | Hex |
|---|---|---|
| Warming | `dir-warm` | `#B9382C` |
| Cooling | `dir-cool` | `#2F5D8A` |
| Wetter | `dir-wet` | `#2E7D7A` |
| Drier | `dir-dry` | `#B07A2A` |

- **Significance** is shown by the stamp (§5). **Direction** is shown by an arrow + direction color. **Never rely on color alone** (always text + icon).

### 2.3 Typography (exactly 3 families)
| Family | Usage |
|---|---|
| `Playfair Display` | Headings, plain-language verdict sentence |
| `Courier Prime` | Case IDs, labels, stamps, **all numbers / coordinates / p-values** (monospaced) |
| `Inter` | UI controls and body text |

### 2.4 Texture & motion
- Subtle CSS paper grain / board texture and a warm radial lamp glow (`brass` at low opacity). **No 3D, no WebGL.**
- All animations respect `prefers-reduced-motion` (show final state instantly).

---

## 3. Navigation (Header)

- **Left:** wordmark `EarthTrend Detective`.
- **Center tabs (functional + thematic):**
  | EN | PT |
  |---|---|
  | `Case Board` | `Quadro de Casos` |
  | `New Investigation` | `Nova Investigação` |
  | `Methods File` (with small "CLASSIFIED" seal) | `Arquivo de Métodos` |
- **Right:** text language toggle `EN | PT` (**no flags**). Detection: `localStorage` → `navigator.language` → `'en'`.
- **Mobile:** tabs move to a bottom navigation bar.
- **Deep links:** `/?case=01`…`/?case=04`, `/investigate?lat=&lon=&var=&season=&from=&to=`, `/dossier/:id`.

---

## 4. Screens

### 4.1 `Case Board` (home)
- Dark textured corkboard with **exactly 4 case files** as clean polaroid/index cards, each showing: `Case #`, location, 1-line hook question, variable badge, red pin, and a `REVIEWED` seal once opened (`localStorage`).
- **Default links:** crimson yarn connecting the 4 cards to each other.
- **Experimental (try first, remove if cluttered):** a sepia paper world map pinned in the center (equirectangular SVG, linear lat/lon → x/y), with each card's yarn running to its location pin. Keep it behind a single flag/prop so it can be removed in one line.
- **Opening sequence (~1.5 s):** board fades in → pins drop → yarn draws (`stroke-dashoffset`) → Case #01 pulses with a `START HERE` tag → Case #01 dossier opens automatically.
- **Focus mode:** clicking a card opens the `<ForensicDossier />` in the foreground; the board dims + blurs behind it. `Esc`/backdrop/`← Back to Case Board` closes it; focus returns to the card.
- **Mobile:** vertical stack of pinned cards (no yarn, no map); the dossier opens as a full-screen sheet.

#### The 4 preset cases (verified against real NASA POWER `1981–2025` data)
| # | Location | Variable | Default season | Real Verdict (`1981–2025`) | Total Shift (`n=45`) | Draft hook |
|---|---|---|---|---|---|---|
| 01 | Vilhena, RO, Brazil | `PRECTOTCORR` | Apr–Sep | `STRONG_EVIDENCE` (`p=0.000131`) | `-234.46 mm` (`-53.29/dec`) | "Is the dry season getting drier?" |
| 02 | Porto Velho, RO, Brazil | `GWETROOT` | Annual | `STRONG_EVIDENCE` (`p<0.000001`) | `-14.26 pts` (`-3.24/dec`) | "Is the Madeira basin soil drying out?" |
| 03 | Ariquemes, RO, Brazil | `T2M_MIN` | Annual | `STRONG_EVIDENCE` (`p=0.000001`) | `+1.82 °C` (`+0.41/dec`) | "Are tropical nights getting hotter?" |
| 04 | Svalbard, Arctic | `T2M` | Annual | `STRONG_EVIDENCE` (`p<0.000001`) | `+3.50 °C` (`+0.79/dec`) | "How fast is the Arctic warming?" |

- If a case returns `INSUFFICIENT EVIDENCE` with real data, keep **at most one** inconclusive case on purpose ("not every suspect is guilty") and reorder so the strongest case is #01.
- If the user changes variable/season inside a preset, the dossier becomes a "Derived investigation from Case #0X" with a `Restore original case` button.

### 4.2 `New Investigation`
- Dark desk with decorative clutter **only at the edges** (papers, coffee ring, pen). The working area stays clean.
- **Case Intake Form** (paper): location search with autocomplete (up to 5 candidates: city, state, country) **or** pasted `lat, lon`; selects for Variable, Season, Years; primary button `Open Investigation`.
- **Leaflet map** next to the form for picking/adjusting the point (CartoDB tiles with a CSS `sepia + contrast + brightness` filter to match the era). Leaflet is used **only on this screen**.
- The `<ForensicDossier />` renders below the form.
- Year range: default full period; **minimum 15 years** (show a warning below that).

### 4.3 `Methods File`
- Declassified manila binder with tabs: `01. NASA Data` · `02. Mann-Kendall` · `03. Sen's Slope` · `04. Limitations`.
- Plain-language first, formula second (designed for high-school/university environmental education and public decision-making, per the HUBEE Challenge Manual).
- `Limitations` must mention:
  1. **MERRA-2 reanalysis (~50 km grid)**, not a single point weather station;
  2. **Correlation vs. Causation:** Mann-Kendall proves statistical significance of a directional trend in observed data, not single-cause attribution;
  3. **Regional Contrast & Land-Cover Context:** how global processes can drive different rates or opposite trends across regions, and how climate trends in Rondônia complement land-use/forest-cover monitoring (e.g., *MapBiomas*) and **UN SDGs 6, 13, and 15**;
  4. **Serial autocorrelation** and **short-record caveats** (minimum 15 years enforced).
- Every dossier answer links contextually here ("How do we know? → §02").

---

## 5. `<ForensicDossier />` (shared component)

Used identically in Case Board focus mode, New Investigation, and `/dossier/:id`. Printed on `paper`.

1. **Didactic loader (step by step):** `Requesting MERRA-2 archive…` → `Discarding missing readings (-999)…` → `Running Mann-Kendall test…` → `Estimating Sen's slope…`. Presets load instantly from static JSON.
2. **Plain-language verdict sentence (top, i18n template):** e.g. *"Night-time minimum temperatures in Ariquemes rose +1.1 °C since 1981. Strong evidence (99% confidence)."* This is the most important element for non-experts and the video.
3. **Verdict stamp ("stamp slam" animation: scale 1.4 → 1 with slight rotation):**
   | Condition | EN | PT | Ink |
   |---|---|---|---|
   | p < 0.01 | `STRONG EVIDENCE` | `EVIDÊNCIA FORTE` | `evidence` |
   | p < 0.05 | `EVIDENCE CONFIRMED` | `EVIDÊNCIA CONFIRMADA` | `evidence` |
   | p ≥ 0.05 | `INSUFFICIENT EVIDENCE` | `EVIDÊNCIA INSUFICIENTE` | `ink-muted` |
4. **The 4 challenge answers:**
   - **What?** variable + unit
   - **Where?** location label + coordinates + **static SVG mini-map** (same style as the board)
   - **How much?** **headline = total change over the period** (e.g. `+1.1 °C since 1981`); secondary = per decade
   - **Significant?** Mann-Kendall `p`, `Z`, confidence level, direction arrow
5. **Chart (Recharts, on paper):** observed series in `ink`, Sen's Slope trend in dashed `evidence`, extreme anomalies (|z| > 1.5 vs full-period mean) as `brass` dots, units on axes. A text summary doubles as the chart's accessible description.
6. **Climate stripes strip** at the bottom (see §6).
7. **Attribution badge:** `Source: NASA POWER / MERRA-2` + data retrieval date.
8. **Actions:** `Share` (opens share sheet) and `← Back`.

### 5.1 Units & aggregation (must match the backend)
| Variable | Unit shown | Annual / seasonal aggregation |
|---|---|---|
| `T2M`, `T2M_MIN` | °C | Mean of monthly values |
| `PRECTOTCORR` | mm (total) | **Sum** of (monthly mm/day × days in month) |
| `GWETROOT` | Soil Wetness Index (0–100 %) | Mean of monthly values × 100 |

- Seasons are labeled **by months only** (`Annual`, `Oct–Mar`, `Apr–Sep`). Oct–Mar is labeled `2024/25`. Incomplete seasons are dropped.
- Numbers use `Intl.NumberFormat` per locale (`1.2` EN / `1,2` PT).

### 5.2 States
- Errors (themed but clear): NASA timeout/unavailable, all values `-999` (e.g. `GWETROOT` over ocean → "No evidence available for this variable here"), geocoding no result, invalid coordinates.
- Empty states for search and lists.

---

## 6. Share Flow & Evidence Card

- **One `Share` button** → share sheet with: `Copy link` (auto-saves the dossier to D1), `Download PNG`, and native `Share…` on mobile (`navigator.share` with file, when supported).
- **Evidence Card** (inspired by *Show Your Stripes*, showyourstripes.info), exactly **2 variants**:
  1. **Story 9:16 (with stats):** case title, full-width yearly stripes, total change headline, verdict stamp, NASA credit, QR code + short URL.
  2. **Square 1:1 (minimal stripes):** stripes + location + years + small credit.
- Stripe palettes: temperature `dir-cool → dir-warm`; precipitation/soil `dir-dry → dir-wet`. Centered on the full-period mean.
- `/dossier/:id` page: read-only dossier + CTA "Open your own investigation". Static OG image for link previews.
- **No free-text fields are ever stored or displayed publicly.**

---

## 7. Accessibility Checklist
- WCAG AA contrast for all text (`ink` on `paper`, `smoke` on `room`).
- Modal focus trap, `Esc` closes, focus returns to trigger.
- All cards and tabs keyboard-navigable; visible `brass` focus ring.
- Never color-only meaning (text + arrow + stamp).
- `prefers-reduced-motion` respected.

## 8. Component Inventory
`<AppHeader />` · `<LanguageToggle />` · `<CaseBoard />` · `<CaseCard />` · `<YarnLayer />` · `<PaperWorldMap />` (experimental) · `<ForensicDossier />` · `<VerdictStamp />` · `<TrendChart />` · `<MiniMap />` · `<ClimateStripes />` · `<DidacticLoader />` · `<IntakeForm />` · `<LocationSearch />` · `<PickerMap />` (Leaflet) · `<ShareSheet />` · `<EvidenceCard />` · `<MethodsFile />`
