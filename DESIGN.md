# 🎨 Design System & UX Blueprint — EarthTrend Detective (`DESIGN.md`)

> **Mandatory reading for frontend developers & AI agents.** Read this file together with [`TASK.md`](TASK.md) and [`AGENTS.md`](AGENTS.md) before designing or editing any UI.
> **This file overrides any external design skill, template, or generic style recommendation.**
> Concept mockups live in [`docs/concepts/`](docs/concepts/) — they were made for the previous noir direction and no longer match §1/§2 below; this file is the spec when they differ.

> ⚠️ **In transition (2026-11-13):** the visual identity was changed from "noir detective office" to **Dark Editorial** (§1, §2 below are current). Sections §3–§8 still describe noir-specific props (verdict **stamp**, corkboard **yarn**/pins, `paper`/`brass`/`room`/`board` tokens, paper-world-map, "Methods File" binder skeuomorphism) that have **not** been re-aligned yet — treat their *content/structure* (what each screen shows) as still valid, but re-check any *token name or visual prop* they mention against §2 before implementing, and flag it for a follow-up pass instead of guessing.

---

## 1. Core Concept

- **Theme:** **Dark Editorial** — a data-journalism aesthetic (a serious broadsheet's dark-mode science desk), not a period stage set or game-like prop room. High-contrast typography, one restrained accent color, no skeuomorphic textures or rotated "stamp" graphics.
- **Serious and professional, never cartoonish or game-like.** It is a scientific tool — credibility comes from clarity (type, contrast, real data), not from decoration.
- **First-person, no character:** there is **no avatar, mascot, face, voice, or gender**. **The user runs the investigation**; NASA data and statistics are their evidence.
- **Core metaphor = legal evidence, kept in copy only.** A statistical test does not "prove" anything; it weighs evidence. This stays in the **wording** ("evidence confirmed", "insufficient evidence" — see §5) and in small restrained touches (a plain verdict line, an icon), never in literal props (no rubber-stamp graphic, no corkboard/yarn/pins).
- **Audience spans experts to newcomers:** researchers, judges, high-school students, and the simply curious all need to read the result in one pass. Favor typographic hierarchy and plain language over ornamentation so it stays serious without becoming cold or exclusionary.
- **Desktop-first visual experience** (stage projector, judges' laptops, 30s video) with a **clean responsive adaptation** for mobile (`< 768px`), zero horizontal overflow.

---

## 2. Surfaces, Color Tokens & Typography

### 2.1 Surface rule (projector-safe)
**Dark throughout, contrast does the work.** There is no light-paper flip: background and content surfaces are both dark (`bg` behind an elevated `surface` for cards/panels/dossiers), separated by a single hairline `border`, never a texture or shadow stack. Legibility on a washed-out projector or after YouTube compression comes from a very high text-to-surface contrast ratio (§7), not from switching to a light background.

### 2.2 Color tokens (Tailwind names in backticks)
| Token | Hex | Usage |
|---|---|---|
| `bg` | `#121212` | App background |
| `surface` | `#1C1C1E` | Cards, panels, dossiers, forms, chart backgrounds — elevated one step above `bg` |
| `text` | `#EDEDEA` | Primary text, observed data line on charts |
| `text-muted` | `#9B9B98` | Secondary text/labels (≥ 4.5:1 on `bg` and `surface`) |
| `accent` | `#C1472E` | The **single** emphasis color — verdict line, Sen's Slope trend line, active tab underline. Used sparingly, never as a large fill. |
| `border` | `#2E2E30` | Hairline dividers between sections/cards |

**Trend direction colors (separate from significance):**
| Direction | Token | Hex |
|---|---|---|
| Warming | `dir-warm` | `#C1472E` |
| Cooling | `dir-cool` | `#4C7EA8` |
| Wetter | `dir-wet` | `#2E8B86` |
| Drier | `dir-dry` | `#B8862E` |

- **Significance** is shown as a short plain-text verdict line (e.g. "Evidence confirmed · p < 0.05"), never a rotated stamp graphic. **Direction** is shown by an arrow + direction color. **Never rely on color alone** (always text + icon) — this rule is unchanged from the previous theme.

### 2.3 Typography (exactly 3 families — unchanged, reassigned role only)
| Family | Usage |
|---|---|
| `Playfair Display` (→ `font-display`) | Headings, plain-language verdict sentence |
| `Courier Prime` (→ `font-mono`) | Case IDs, labels, **all numbers / coordinates / p-values** (monospaced, data-journalism feel) |
| `Inter` (→ `font-sans`) | UI controls and body text |

### 2.4 Texture & motion
- **No texture.** No paper grain, no wood/board texture, no lamp glow, no skeuomorphism of any kind — flat `bg`/`surface` colors and hairline `border`s only. **No 3D, no WebGL.**
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

#### The 4 preset cases (hooks must be validated against real data before final copy)
| # | Location | Variable | Default season | Draft hook |
|---|---|---|---|---|
| 01 | Vilhena, RO, Brazil | `PRECTOTCORR` | Apr–Sep | "Is the dry season getting drier?" |
| 02 | Porto Velho, RO, Brazil | `GWETROOT` | Annual | "Is the Madeira basin soil drying out?" |
| 03 | Ariquemes, RO, Brazil | `T2M_MIN` | Annual | "Are tropical nights getting hotter?" |
| 04 | Svalbard, Arctic | `T2M` | Annual | "How fast is the Arctic warming?" |

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
- Plain-language first, formula second.
- `Limitations` must mention: MERRA-2 reanalysis (~50 km grid, not a weather station), serial autocorrelation, and short-record caveats.
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
