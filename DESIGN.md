# 🎨 Design System & UX Blueprint — EarthTrend Detective (`DESIGN.md`)

> **Mandatory Reading for Frontend Developers & AI Agents:** Read this file alongside [`TASK.md`](TASK.md) and [`AGENTS.md`](AGENTS.md) before designing or editing any UI component.

---

## 1. Core Concept & Creative Direction
- **Theme:** **Old New York Noir Detective Office** (inspired by **Abrams from Deadlock** — gritty, serious, warm brass-lit noir, **never** cartoonish).
- **First-Person Immersion (No Character / Avatar):**
  - There is **NO detective character** (no mascot, no face, no voice, no gender).
  - **The user IS the detective**, using real NASA satellite telemetry and statistical forensics (`Mann-Kendall` & `Sen's Slope`) as investigative tools to prove or disprove climate trends.
- **Desktop-First Visual Experience + Clean Mobile Adaptation:**
  - Design the full spatial office experience for desktop/stage projectors (`>= 1024px`).
  - Degrade cleanly to single-column vertical stacks on mobile (`< 768px`) with zero horizontal overflow (`overflow-x-hidden`).

---

## 2. Color Palette & Typography

### Color Tokens
| Role | Hex | Usage |
|---|---|---|
| **Espresso Charcoal** | `#12100E` | Primary app background / dark room ambiance |
| **Dark Slate Plot** | `#161412` | Recharts plot panel & dark Leaflet map container |
| **Aged Manila / Dossier** | `#1E1A16` / `#E8DFC8` | Dark dossier cards (`#1E1A16`) & aged-paper highlights/forms (`#E8DFC8` with `#1A1714` ink) |
| **Brass Lamp Amber** | `#D49B42` | Active highlights, observed data line, primary accents, focus borders |
| **Crimson Evidence Pin** | `#B9382C` | Corkboard pins, SVG red yarn lines, Sen's Slope dashed trendline, rubber stamps |
| **Forensic Emerald** | `#2E8B57` | `PROVEN TREND` statistical significance badge (95% / 99% confidence) |
| **Muted Slate** | `#7A736B` | `NO SIGNIFICANT TREND` badge, secondary metadata |

### Typography
- **Stamps, Case IDs & Noir Headers:** Typewriter / Editorial Serif (`Special Elite`, `Courier Prime`, or `Playfair Display`) — used **sparingly** for Case # headers and ink stamps so readability stays high.
- **UI Body & Controls:** Clean sans-serif (`Inter`).
- **Coordinates, p-values, Z-scores & Metrics:** Monospace (`JetBrains Mono`) with tabular numerals.
- **Textures:** Subtle CSS noise/paper grain and warm radial desk-lamp glow (`#D49B42` at low opacity) — **no heavy 3D/WebGL**.

---

## 3. Spatial Navigation & 3 Rooms (Header Tabs)
Top Noir Header contains:
1. **Brand:** `EarthTrend Detective`
2. **Room Tabs:** `Evidence Corkboard` | `Detective Desk` | `Top Secret Manual`
3. **Language Switcher:** `[ 🇺🇸 EN | 🇧🇷 PT ]` (auto-detects `localStorage` -> `navigator.language` -> `'en'`)

### Room 1: `Evidence Corkboard` (Default Entry View)
- **Desktop (`>= 1024px`):** Textured dark corkboard displaying the **5 Preset Case Studies** (Vilhena, Porto Velho, Ariquemes, Svalbard, Niamey) as **clean polaroid/index cards** (`Case #`, `Location`, `1-line mystery hook`, `variable badge`, and `red pin`), connected by **SVG red yarn/lines**.
- **Mobile (`< 768px`):** Clean vertical stack of pinned cards (no tangled cross-screen SVG lines).
- **Focus Interaction:** Clicking any pinned card pulls the shared `<ForensicDossier />` component **into foreground focus** while **dimming and blurring the corkboard behind it**.
- **Initial Load:** **Case #01 (Vilhena, RO)** auto-opens in foreground focus on initial page load so judges immediately see live NASA data, with a prominent **1-click `"Return to Corkboard"`** button.

### Room 2: `Detective Desk` (New Case & Custom Search)
- **Aesthetic:** Cluttered old-NY desk papers (CSS paper layers, zero heavy 3D globe).
- **Top of Desk (`Case Intake Paper Form`):**
  - Search input to type any **city/region name** (resolved via `/api/geocode`) or **lat, lon coordinates**.
  - Forensic filters: **Variable** (`T2M`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT`), **Season** (`Annual`, `Oct–Mar`, `Apr–Sep`), and **Year Range** (`1981–2025`).
  - **"Recent Case Files"** drawer/list showing the latest 10 saved public dossiers from Cloudflare D1.
- **Below on the Desk:** Renders the **exact same `<ForensicDossier />`** component on aged-paper/noir dossier sheets, paired with a compact **CartoDB Dark Matter Leaflet map** showing the pinned coordinate (with click-to-adjust).

### Room 3: `Top Secret Manual` (Methodology)
- Styled as a **declassified manila binder** with 3 tabs:
  1. `01. NASA Data` — `NASA POWER / MERRA-2` (`temporal/monthly/point`, `1981–2025`, `-999` handling)
  2. `02. Mann-Kendall` — Non-parametric trend test (`S`-statistic, `Z`-score, `p`-value)
  3. `03. Sen's Slope` — Robust median slope estimator & decadal rate of change

---

## 4. Shared `<ForensicDossier />` Component & Shareable Evidence Card
Reused identically in **both** the Corkboard foreground overlay and below the Detective Desk form:
1. **Thematic Loading State:** `"Decrypting NASA Telemetry..."` while fetching `/api/investigate`.
2. **Rubber-Stamp Verdict & Attribution:** `PROVEN TREND` (`p < 0.05` / `p < 0.01`) vs `NO SIGNIFICANT TREND` stamp + explicit `NASA POWER / MERRA-2` citation badge.
3. **The 4 Challenge Answers (i18n-translated from structured backend enums):**
   - *What is changing?*
   - *Where is it changing?*
   - *By how much?* (Sen's Slope per year & per decade)
   - *Is it statistically significant?*
4. **Dark Slate Recharts Plot (`#161412`):**
   - Observed annual/seasonal series in **Brass Amber (`#D49B42`)**.
   - **Sen's Slope** trendline in **Crimson dashed (`#B9382C`)**.
   - Highlighted extreme anomaly years (vs full-period `1981–2025` mean).
5. **Show Your Stripes-Inspired Shareable Evidence Card (`showyourstripes.info`):**
   - Annual anomaly vertical stripes (`blue -> crimson` for temperature; `amber -> teal/emerald` for precipitation/soil).
   - Display toggles: `With Stats & Stamp` vs `Minimal Stripes`, and `1:1` (Square) vs `9:16` (Instagram Stories).
   - **Actions:** `Download PNG` (1-click via `html-to-image` / Canvas) + `Save & Copy Dossier Link` (`/dossier/:id`).
