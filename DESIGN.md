# 🎨 Design System & UX Blueprint — EarthTrend Detective (`DESIGN.md`)

> **Mandatory reading for frontend developers & AI agents.** Read this file together with [`TASK.md`](TASK.md) and [`AGENTS.md`](AGENTS.md) before designing or editing any UI.
> **This file overrides any external design skill, template, or generic style recommendation.**
> Concept mockups live in [`docs/concepts/`](docs/concepts/) — they were made for the previous noir direction and no longer match §1/§2 below; this file is the spec when they differ.

> ⚠️ **In transition (2026-11-13, aligned with Kauê 2026-11-14):** two changes are layered here. (1) The visual identity moved from "noir detective office" to **Dark Editorial** (§1, §2 are current). (2) The product **structure** moved from 3 separate screens (Case Board / New Investigation / Methods File, navigated by tabs) to **one home page with sections + one separate Methods page** (§3, §4, §5 below reflect this new structure). §6–§8 have only had their noir *prop* references removed, not a structural rewrite — re-check any component name they mention against §3–§5/§8 before implementing. Analysis runs **client-side** by default, with the already-implemented D1-cached `/api/investigate` available as the server-side/cached path — both kept, per `TASK.md`'s own transition note.

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

The site is **one home page with sections**, not separate tab-screens — so the header holds **3 links**, not 3 tabs: two scroll to a section on the home page, one opens a real separate page.

- **Left:** wordmark `EarthTrend Detective`.
- **Center links:**
  | EN | PT | Behavior |
  |---|---|---|
  | `Investigate` | `Investigar` | Scrolls the home page to `<Investigation />` |
  | `Cases` | `Casos` | Scrolls the home page to `<CasesGrid />` |
  | `Methods` | `Método` | Navigates to the separate `<MethodsPage />` |
- **Right:** text language toggle `EN | PT` (**no flags**). Locale defaults to **`pt`** unless a different value is already saved in `localStorage` (no `navigator.language` detection for now — see `AGENTS.md`/implementation notes for why).
- **Mobile:** links stay in the header (no bottom nav needed yet — there are only 3, and 2 of them are same-page scrolls); revisit if `<Hero />`'s final design needs more room.
- **No deep-link routes yet** (`/?case=01`, `/investigate?...`, `/dossier/:id` from the old spec are deferred — no router is installed; `<CasesGrid />` shortcuts work by filling `<Investigation />`'s state in-page, not by navigating).

---

## 4. Screens

The product is **one home page** (`<Hero />` → `<Investigation />` → `<CasesGrid />` → method teaser) plus **one separate `<MethodsPage />`**. Each section below is its own component so it could become a standalone route later without a rewrite — but there is no router yet, so for now they are all just scroll targets on one page.

### 4.1 `<Hero />`
- Attention-grabbing header/intro — **visual design intentionally not finalized here**; prototype separately before implementing for real (see `TASK.md` note). Must say, in one glance, what the tool does and for whom (researchers, students, the curious).

### 4.2 `<Investigation />` (the center of the product)
- One component holds both the **form** (location, variable, season, years) and the **result area** — because a case shortcut (§4.3) just pre-fills this same form and renders in this same place; there is no separate "dossier screen".
- **Form:** location via a city list + coordinates + map (free-text name search is a stretch, not required); selects for Variable, Season, Years; primary action to run/update the analysis. Minimum 15 years (warn below that).
- **Result area, in this order:**
  1. Plain-language headline answer (i18n template, e.g. *"Night-time minimum temperatures in Ariquemes rose +1.1 °C since 1981."*).
  2. Evidence verdict line (plain text, not a graphic stamp — see §2): `Evidence confirmed · p < 0.05` / `Strong evidence · p < 0.01` / `Insufficient evidence`, always with a direction arrow + direction color, never color alone.
  3. **"View as" toggle:** line + trend (default) / bars / stripes/bands — same underlying series, different chart.
  4. **Methodology, layered** (do not show everything at once):
     - Always visible, one line: `NASA POWER → N years → Mann-Kendall test → <headline result>`.
     - `See method for this analysis` (expands inline, does not navigate away): full test statistics (`p`, `Z`, confidence interval), warnings (e.g. short record, high autocorrelation), and a ready-to-copy citation paragraph.
     - `Full method` link → `<MethodsPage />` (§4.4), for whoever wants to understand the tool in general, not just this one result.
  5. **Actions row:** copy share link, download image, download CSV, copy citation (the expanded "technical details" from the layer above). `Compare with another place` is an explicit extra/future, not in this pass.
- **Error/empty states:** NASA unavailable, all values `-999` (e.g. `GWETROOT` over ocean), invalid coordinates, fewer than 15 years of data.

### 4.3 `<CasesGrid />`
- The 4 real NASA cases as **shortcuts, not screens** — clicking one fills `<Investigation />`'s form and shows its result in the same result area, using the preset's already-computed data (works offline). From there the user can edit the investigation like any other.
- Label: **"Featured Cases"** (EN) / **"Casos em Destaque"** (PT) — not "example cases": these are real analyses, not placeholder data.

#### The 4 preset cases (verified against real NASA POWER `1981–2025` data)
| # | Location | Variable | Default season | Real Verdict (`1981–2025`) | Total Shift (`n=45`) | Draft hook |
|---|---|---|---|---|---|---|
| 01 | Vilhena, RO, Brazil | `PRECTOTCORR` | Apr–Sep | `STRONG_EVIDENCE` (`p=0.000131`) | `-234.46 mm` (`-53.29/dec`) | "Is the dry season getting drier?" |
| 02 | Porto Velho, RO, Brazil | `GWETROOT` | Annual | `STRONG_EVIDENCE` (`p<0.000001`) | `-14.26 pts` (`-3.24/dec`) | "Is the Madeira basin soil drying out?" |
| 03 | Ariquemes, RO, Brazil | `T2M_MIN` | Annual | `STRONG_EVIDENCE` (`p=0.000001`) | `+1.82 °C` (`+0.41/dec`) | "Are tropical nights getting hotter?" |
| 04 | Svalbard, Arctic | `T2M` | Annual | `STRONG_EVIDENCE` (`p<0.000001`) | `+3.50 °C` (`+0.79/dec`) | "How fast is the Arctic warming?" |

- If a case shows `Insufficient evidence` with real data, keep **at most one** such case on purpose, and order the strongest case first.
- Editing variable/season after loading a case switches the result area to "Derived from Case #0X" with a `Restore original case` action — same mechanism as any other investigation edit, just labeled.

### 4.4 `<MethodsPage />`
- Short, static, separate page (not a modal, not a binder metaphor) — mandatory even in the leanest version of the site.
- Sections: data source (NASA POWER / MERRA-2), how the series is built (aggregation, `-999` filtering), the statistical tests used, and **Limitations** (designed for high-school/university environmental education and public decision-making, per the HUBEE Challenge Manual):
  1. **MERRA-2 reanalysis (~50 km grid)**, not a single point weather station;
  2. **Correlation vs. Causation:** Mann-Kendall proves statistical significance of a directional trend in observed data, not single-cause attribution;
  3. **Regional Contrast & Land-Cover Context:** how global processes can drive different rates or opposite trends across regions, and how climate trends in Rondônia complement land-use/forest-cover monitoring (e.g., *MapBiomas*) and **UN SDGs 6, 13, and 15**;
  4. **Serial autocorrelation** and **short-record caveats** (minimum 15 years enforced).
- Plain language first, formula second.
- This is the *general* explanation; the *per-result* technical details live inline in `<Investigation />` (§4.2) via "See method for this analysis" — `<MethodsPage />` is for understanding the tool, not re-deriving one specific number.

---

## 5. Data: Units, Aggregation & States

The result content itself (verdict line, headline, chart, methodology layers, actions) is specified in §4.2 as part of `<Investigation />` — there is no separate dossier component/screen anymore. This section covers the data rules every result must follow regardless of where it's shown (a live query or a `<CasesGrid />` shortcut).

- **The 4 challenge answers** every result must answer: **What?** (variable + unit) · **Where?** (location label + coordinates) · **How much?** (headline = total change over the period, e.g. `+1.1 °C since 1981`; secondary = per decade) · **Significant?** (Mann-Kendall `p`, `Z`, confidence level, direction arrow).
- **Chart:** observed series in `text`, Sen's Slope trend in dashed `accent`, extreme anomalies (|z| > 1.5 vs full-period mean) marked distinctly, units on axes. A text summary doubles as the chart's accessible description. (The "View as" toggle in §4.2 switches the chart type; this still applies to whichever view is active.)
- **Satellite Evidence Timelapse (`<SatelliteTimelapse />`, optional R4 Could):** an expandable panel below the chart ("Inspect Satellite Timelapse 2000–2025") that lazy-loads a Leaflet view with **NASA GIBS / Worldview WMTS** tiles (`MODIS_Terra_CorrectedReflectance_TrueColor` and `MODIS_Terra_NDVI_8Day`) and a **Play/Pause year-by-year timeline scrubber** (`2000 → 2025`, sampled at mid-August `YYYY-08-15` for low cloud cover in Amazonia), letting users visually see land-cover and vegetation changes alongside the numbers.
- **Attribution:** `Source: NASA POWER / MERRA-2` (+ `NASA GIBS / MODIS` when timelapse is expanded) + data retrieval date, always visible near the result.

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

- From `<Investigation />`'s actions row (§4.2): `Copy link` (persists the computed result so the link resolves later — this is the one feature in the new structure that still needs a backend/D1 write, see `TASK.md`), `Download image`, and native `Share…` on mobile when supported.
- **Evidence Card/image**, inspired by *Show Your Stripes* (showyourstripes.info): a downloadable image with yearly stripes, the headline change, the verdict line, QR code, and NASA credit (`src/components/share/EvidenceCard.tsx`).
- Stripe palettes: temperature `dir-cool → dir-warm`; precipitation/soil `dir-dry → dir-wet`. Centered on the full-period mean.
- A shared-link page is read-only (`<SharedDossierView />`) + a CTA to start your own investigation. Static OG image for link previews.
- **No free-text fields are ever stored or displayed publicly.**

---

## 7. Accessibility Checklist
- WCAG AA contrast for all text (`text` on `bg`/`surface`, `text-muted` on `bg`/`surface`).
- Expanded "method" panel and the Methods page: focus-manageable, `Esc` closes an expanded panel, focus returns to its trigger.
- All interactive elements (header links, form controls, "View as" toggle, actions) keyboard-navigable; visible `accent` focus ring.
- Never color-only meaning (text + arrow + direction color, never a color alone).
- `prefers-reduced-motion` respected.

## 8. Component Inventory
`<AppHeader />` · `<LanguageToggle />` · `<Hero />` · `<Investigation />` (form + result area, incl. verdict line, "View as" toggle, methodology disclosure, actions row) · `<TrendChart />` (line/bars/stripes views) · `<CasesGrid />` · `<CaseCard />` · `<MethodsPage />` · **Share & Extras (`src/components/share/`):** `<ClimateStripes />` · `<EvidenceCard />` · `<ShareSheet />` · `<SatelliteTimelapse />` (optional R4) · `<SharedDossierView />` · `<RecentDossiersDrawer />`

*Deferred/removed from the old 3-screen spec (not part of the current plan):* `<CaseBoard />`, `<YarnLayer />`, `<PaperWorldMap />`, `<ForensicDossier />`, `<VerdictStamp />`, `<MiniMap />`, `<DidacticLoader />`, `<IntakeForm />`, `<LocationSearch />`, `<PickerMap />`, `<MethodsFile />`. Some of this functionality still exists (e.g. a location picker, a share action) but now lives inside `<Investigation />` rather than as a standalone screen-level component — pull the relevant piece from §4.2 instead of resurrecting the old name.
