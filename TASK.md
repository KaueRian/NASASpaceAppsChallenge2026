# 📋 Master Task Board & Single Source of Truth (`TASK.md`)

> **Challenge:** `Be An Earth System Trend Detective!` (NASA Space Apps Challenge 2026 — Vilhena, RO, Brazil)  
> **Project Name:** **GeoTrend** *(rebranded from EarthTrend Detective; D1 database binding `earthtrend-db` and `localStorage` prefixes `etd.*` / `earthtrend:power:v1:` preserved for zero-downtime backwards compatibility)*  
> **Official Team Name / ID:** `TBD — Fill on Saturday morning`  
> **Repository:** `KaueRian/NASASpaceAppsChallenge2026`  
> **Slides / Media Workspace (Canva / Drive):** `TBD — Add link here`  
> **Stage Representative (Art. 6.2 — 1 person on stage):** **Higor** (Stage Pitch) · **Luis** (Slides & Visual Deck)  
> **Tech Stack:** React + Vite + Tailwind CSS + Recharts + Leaflet | Cloudflare Workers + Static Assets (Hono + TypeScript) | Cloudflare D1 (SQLite) | Biome + Vitest + GitHub Actions  
> **Design Spec:** [`DESIGN.md`](DESIGN.md) · **Concept mockups:** [`docs/concepts/`](docs/concepts/)

---

> ⚠️ **In transition (2026-11-13):** Mylena proposed restructuring the product from 3 tab-screens to **one home page with sections (`<Hero />` → `<Investigation />` → `<CasesGrid />` → method teaser) + one separate `<MethodsPage />`**, with the live investigation running **client-side** (fetch NASA POWER directly from the browser + a stats engine computed in TS) or via the already-implemented D1-cached `/api/investigate` endpoint. R0–R4 below reflect this unified structure alongside Kauê's already-completed backend/share deliverables.

---

## 👥 Team Roster & Ownership
| Member | Role | Owned Paths / Assets |
|---|---|---|
| **Kauê** (`Dev 1`) | Stats engine *(pending alignment — see transition note above)*, NASA data, API, CI/Deploy, **Evidence Card & Share flow** (D1 now scoped to shared-link persistence + optional query caching) | `src/lib/`, `scripts/`, `src/worker/`, `d1/`, `tests/`, `.github/`, `wrangler.jsonc`, `src/components/share/` |
| **Mylena** (`Dev 2`) | Frontend UI: `<Hero />`, `<Investigation />` (form + result area), `<CasesGrid />`, `<MethodsPage />` layout, i18n wiring | `src/components/` (except `share/`), `src/pages/`, `src/styles/` |
| **Higor & Luis** | **All product copy** (hooks, microcopy, Methods File text, EN + PT), logo/OG image, pitch, slides, 30s video, submission | `src/locales/` (text content), `docs/submission/`, `public/brand/` + external Canva/Drive |
| **Shared Contract** | Frontend ↔ Backend TypeScript types | `src/types/investigation.ts` |

---

## 🪜 Release Ladder — "Always Shippable" Rule
**Every release ends with a working product on `main`.** If time runs out at any moment, we present the latest release on `main`.

1. Work **top-down**: finish the current release before starting the next one (helping the other dev counts).
2. At the end of each release: CI green → merge `dev -> main` → Cloudflare Workers production deploy → smoke test in incognito → tick the release box.
3. Each release is a complete demo by itself. Later releases only **add** to it; they never leave `main` broken.

| Release | Target (UTC-4) | What judges can see if we stop here |
|---|---|---|
| **R0 — Foundation** | Sat 11:00 | Live URL with the Dark Editorial shell (header with 3 links, EN/PT) |
| **R1 — Minimum Shippable Demo** ⭐ | Sat 17:00 | One page: `<Investigation />` + `<CasesGrid />` (4 real NASA cases as shortcuts) + short `<MethodsPage />`. **Works offline (static preset data).** |
| **R2 — Live Investigation (client-side / API)** | Sat 23:30 | + Investigate any place on Earth, computed in the browser (or via `/api/investigate` fallback) |
| **R3 — Showtime** | Sun 08:30 | + Real `<Hero />`, "View as" chart toggle, Evidence image + Share link (persisted in D1), mobile layout |
| — **UI Freeze** | Sun 09:00 | Higor & Luis capture screenshots & record the 30s video |
| **R4 — Credibility & Extras** | Sun 13:30 | + `<MethodsPage />` complete, OG image, extras (Could items) |
| — **Code Freeze** | Sun 14:00 | Final `dev -> main` deploy, nothing else merged |

---

## ⏱️ Team Synchronization Checkpoints (HUBEE Vilhena — UTC-4)
| Checkpoint | Target Time | Goal |
|---|---|---|
| **C0 — Kickoff & Registration** | Sat 07:30–09:00 | HUBEE check-in, all 4 members on the same NASA Team ID, decide stage rep, 30-min UI walkthrough of `docs/concepts/` |
| **C1 — Foundation live** | Sat 11:00 | R0 deployed; `src/types/investigation.ts` locked |
| **C2 — MVP shipped** | Sat 17:00 | R1 on `main` (the safety net) |
| **C3 — Live search shipped** | Sat 23:30 | R2 on `main` |
| **C4 — Showtime + UI Freeze + Pitch Workshop** | Sun 08:30–09:45 | R3 on `main`; screenshots & 30s video; HUBEE Pitch Workshop |
| **C5 — Code Freeze** | Sun 14:00 | Final deploy, incognito + projector/TV test |
| **C6 — Local HUBEE Deadline** | Sun 15:00–15:30 | Submit local deliverables (PDF slides + link) — **HARD DEADLINE** |
| **C7 — Local Stage Pitch** | Sun 15:30–17:00 | 3-minute pitch (1 representative, Art. 6.2, PT-BR, offline backup ready) |
| **C8 — Global NASA Submission** | Sun ≤ 21:30 | All 4 verify links, 30s YouTube video, public repo & English form, then Submit |

---

## 🤝 Collaboration & Git Workflow
1. **Single Source of Truth:** every code, doc, copy, or config change maps to a task here. Add a task first if one does not exist.
2. **Status Legend:** `[ ]` Pending | `[~] (<Name>)` In progress (claim before editing!) | `[x]` Done
3. **Mandatory Task Code (`<number><H|M|L>`), Priority Property (`[priority: low | medium | high]`) & Execution Order:** Every open (`[ ]` / `[~]`) or newly created task MUST declare a unique sequential task code combined with its priority letter (`H` = high, `M` = medium, `L` = low — e.g., `[1H]`, `[7M]`, `[9L]`) alongside `[priority: high]`, `[priority: medium]`, or `[priority: low]` (synced under the exact same code and `[prioridade: alta | média | baixa]` in root PT-BR docs; retain the code when marked `[x]`). Either the user defines it or the active agent assigns it based on hackathon deadlines and judging impact. Tasks MUST be executed strictly by priority (`high` → `medium` → `low`) or explicit user decision — never auto-execute newly registered/refined tasks without user confirmation (see [`AGENTS.md`](AGENTS.md) & [`CLAUDE.md`](CLAUDE.md)).
4. **Branching (`feature/*` -> `dev` -> `main`):** never commit directly to `main`; `main` only receives release merges from `dev`.
5. **TDD** for critical logic (stats, aggregation, `-999` filtering, validation) — see [`AGENTS.md`](AGENTS.md).
6. **Local Dev:** `npm` (Node 20+) + `wrangler dev` + local D1 (no Cloudflare login needed for Mylena).
7. **English only in repo** (UI strings live in `src/locales/en.json` and `src/locales/pt.json`; `docs/submission/` may contain the PT-BR pitch script).

---

## 🌿 HUBEE Local Challenge Manual Alignment (Challenge #2 — *Missão Amazônia*)
*Extracted from the official Vilhena participant manual (`MANUAL DOS DESAFIOS - Participantes.pdf`). Keep these 5 points visible across UI copy, Methods Page, README, and Pitch:*
1. **Official Recommended Data:** `NASA POWER` (implemented), `NASA Earthdata`, `NASA Giovanni`.
2. **HUBEE Idea #2 Match:** Brazilian municipal temperature & precipitation evolution panel starting with **historical data from Vilhena, RO** (our Case #01) and expanding across Amazonian/global municipalities (`<Investigation />`).
3. **Scientific Guardrail (`Correlation ≠ Causation`):** Explicitly state in the result methodology & `<MethodsPage />` Limitations that Mann-Kendall proves **statistical significance of an observed trend**, not single-cause attribution, and highlight how **regional trends can move at different rates or opposite directions** under global climate processes.
4. **Complementary Amazon & Education Context:** Reference land-cover context (*MapBiomas* in Rondônia) in regional case narratives and highlight usability for **environmental education in schools** and local climate adaptation research.
5. **UN SDGs (*Missão Amazônia*):**
   - **SDG 6 (Clean Water & Sanitation):** Precipitation (`PRECTOTCORR`) & root-zone soil moisture (`GWETROOT`) for water-resource planning.
   - **SDG 13 (Climate Action):** 45-year historical series (`1981–2025`) supporting territorial climate adaptation.
   - **SDG 15 (Life on Land):** Forest ecosystem monitoring and conservation in the Cerrado–Amazon transition.

---

## ✅ Done (Pre-Event Planning)
- [x] **(Kauê)** Initialize Git repository and push to GitHub via HTTPS
- [x] **(Kauê)** Create governance files (`TASK.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`, `README.md`)
- [x] **(Kauê)** Create [`DESIGN.md`](DESIGN.md) and enforce TDD + design-context rules
- [x] **(Kauê)** Align `.gitignore`, `README.md`, `AGENTS.md`, `CLAUDE.md` to locked `NASA POWER / MERRA-2` scope
- [x] **(Kauê)** Configure `feature/* -> dev -> main` branching workflow
- [x] **(All)** Finalize architecture, stack, and whole-team roadmap
- [x] **(Kauê)** UI/UX audit v2: evidence-based verdicts, light-paper surfaces, 4 cases, release ladder, copy ownership to Higor & Luis
- [x] **(Kauê)** Generate UI concept mockups and commit them to `docs/concepts/`

---

## 🧱 R0 — Foundation (target Sat 11:00)
- [x] **(All)** Confirm all 4 members on the same NASA Space Apps Team ID; fill Team Name above
- [x] **(All)** Decide the stage representative (Art. 6.2): **Higor** (3-minute stage pitch) & **Luis** (Slide deck)
- [x] **(Kauê)** Invite Mylena, Higor & Luis as collaborators on `KaueRian/NASASpaceAppsChallenge2026`
- [x] **(Kauê)** Scaffold project (`package.json`, Vite + React + TS + Tailwind, Hono Worker, `wrangler.jsonc`, Vitest, Biome)
- [x] **(Kauê)** Migrate from legacy Cloudflare Pages Functions to **Cloudflare Workers + Static Assets** (`src/worker/index.ts`)
- [x] **(Kauê)** GitHub Actions CI (`.github/workflows/ci.yml`): Biome, `tsc --noEmit`, `vitest` on PRs to `dev`/`main`
- [x] **(Kauê)** Create Cloudflare Worker (`nasaspaceappschallenge2026`) connected to GitHub and deploy the shell to production
- [x] **(Kauê)** Define shared contract `src/types/investigation.ts` (variables, seasons, series point, trend result, verdict enum, case preset, dossier)
- [x] **(Mylena)** Tailwind tokens (`bg`, `surface`, `text`, `text-muted`, `accent`, `border`, direction colors), 3 fonts
  - *Note (Mylena):* implemented as the "Dark Editorial" palette (`bg`/`surface`/`text`/`text-muted`/`accent`/`border`) instead of the noir `room`/`board`/`paper`/`brass`/`evidence` tokens — see `DESIGN.md` update needed before other components rely on the old names.
- [x] **(Mylena)** `<AppHeader />` with 3 links (`Investigate`/`Cases` scroll to a home section, `Methods` opens `<MethodsPage />`) + `<LanguageToggle />` (`EN | PT`) + i18n setup (`en.json`, `pt.json`)
  - *Note (Mylena):* default locale is `pt` unless a different value is already saved in `localStorage` — no `navigator.language` detection for now (kept commented in code as a future option). The attention-grabbing `<Hero />` treatment is prototyped separately before implementing for real.
  - *Note (Mylena):* `src/locales/en.json`/`pt.json`'s 4 `cases.0N.hook` strings are my draft placeholders (DESIGN.md §4.3's draft hooks) — final copy is Higor & Luis's to write, per their R1 task below.
- [x] **(Higor & Luis)** Review NASA judging criteria + HUBEE rules; create `docs/submission/`
- [x] **(Kauê)** 🚀 **Release R0:** merge `dev -> main`, deploy, smoke test

## ⭐ R1 — Minimum Shippable Demo (target Sat 17:00)
*One page, no runtime backend needed: `<Investigation />` wired only to the 4 real presets as shortcuts → the demo survives venue Wi-Fi failures.*
- [x] **(Kauê)** TDD: `-999` filtering + monthly → Annual / Oct–Mar (`2024/25` labels) / Apr–Sep aggregation with correct units (`PRECTOTCORR` = monthly mm/day × days summed; `GWETROOT` × 100) in `src/lib/`
- [x] **(Kauê)** TDD: **Mann-Kendall** (S, variance with ties, Z, two-sided p) in `src/lib/stats/`
- [x] **(Kauê)** TDD: **Sen's Slope** (per year, per decade, total change over period) + anomalies vs full-period mean (|z| > 1.5) + verdict enum (`STRONG` p<0.01 / `CONFIRMED` p<0.05 / `INSUFFICIENT`)
  - *Note:* pending alignment with Mylena (see transition banner at top) — she has her own JS engine (adds confidence intervals, regression, Benjamini-Hochberg) already validated against `pymannkendall`/`scipy`, proposed to port to TS. Needs a joint decision before R2 on which engine is canonical.
- [x] **(Kauê)** Script `scripts/build-presets.ts`: fetch NASA POWER `temporal/monthly/point` for the 4 cases, run the engine, write `src/data/presets/*.json` (with retrieval date)
- [x] **(Kauê)** Run the 4 cases with real data and report verdicts to the team; swap/reorder cases if needed (strongest = #01, max 1 inconclusive)
- [x] **(Higor & Luis)** Write final case hooks + result copy templates and verdict sentence templates (EN + PT) in `src/locales/`, based on the real verdicts (4 geographic scales × 4 variables: `#01 Vilhena, RO`, `#02 Ariquemes, RO`, `#03 Corumbá/Pantanal, MS`, `#04 Svalbard, Arctic`, including regional Amazon/Pantanal context, school/research usability, and explicit note that statistical trend ≠ direct single-cause causation per the HUBEE Challenge Manual)
- [x] **(Mylena)** `<Hero />` placeholder (simple version; the real attention-grabbing treatment is prototyped separately, lands in R3)
- [x] **(Mylena)** `<Investigation />` wired only to the 4 presets: form pre-filled when a case is picked, result area (verdict line, headline, chart, layered methodology disclosure, actions row) rendered from the static preset JSON
  - *Note (Mylena):* defaults to case `01` (no picker yet — `<CasesGrid />` wires that next); chart is a placeholder until `<TrendChart />` lands; actions row reuses Kauê's `<ShareSheet />` as-is (covers share link/image/CSV/citation in one). Headline/methodology copy in `src/locales/*.json` is my draft, final wording is Higor & Luis's per their task above.
- [x] **(Mylena)** `<CasesGrid />` with the 4 **"Featured Cases"** `<CaseCard />`s — clicking one fills `<Investigation />` and shows its result in place
- [x] **(Mylena)** `<TrendChart />` (line/trend view only for R1 — "View as" bars/stripes land in R3): `text` series, dashed `accent` Sen's line, marked anomalies, axis units
  - *Note (Mylena):* hand-rolled inline SVG (no charting lib added — Recharts is still listed in the tech stack line above but unused so far; matches Kauê's existing hand-rolled approach in `ClimateStripes`/`EvidenceCard`).
- [x] **(Mylena)** `<MethodsPage />` short version (data source, aggregation, tests, limitations) + the 1-line method teaser/link on the home page
  - *Note (Mylena):* Limitations section covers the HUBEE Manual alignment points from `CLAUDE.md` (significance ≠ single-cause causation, Rondônia vs. Arctic regional contrast, classroom education/MapBiomas context, UN SDGs 6/13/15). Copy is my draft; final wording is Higor & Luis's.
- [x] **(Kauê)** 🚀 **Release R1:** merge `dev -> main`, deploy, test in incognito **and with network throttled**

## 🔎 R2 — Live Investigation (target Sat 23:30)
*Analysis can run in the browser (direct fetch to NASA POWER + stats computed client-side, with browser-side caching) or via the ready `/api/investigate` endpoint; D1 also backs the shareable-link feature in R3.*
- [x] **(Kauê)** Port and finalize canonical stats engine in TS (`src/lib/stats/`: Mann-Kendall, Sen's Slope with 95% CI, OLS regression $R^2$, lag-1 autocorrelation + warnings, Benjamini-Hochberg FDR, monthly→seasonal aggregation) + client-side NASA POWER runner with browser caching (`src/lib/nasa/clientInvestigate.ts`)
- [x] **(Kauê)** Create Cloudflare D1 (`earthtrend-db`) + `d1/schema.sql` (`nasa_cache`, `dossiers`), bind in `wrangler.jsonc`, add `db:migrate:local` / `db:migrate:remote`, and auto-initialize tables via `src/worker/dbSchema.ts`
- [x] **(Kauê)** `GET /api/investigate` (Hono): NASA POWER fetch with timeout/retry, D1 cache keyed by `(round(lat,2), round(lon,2), variable)`, reuse `src/lib/` engine, min 15 years validation
- [x] **(Kauê)** `GET /api/geocode` (Open-Meteo Geocoding wrapper, max 5 results) — ready if free-text location search is used
- [x] **(Kauê)** TDD: request/response validation (`src/lib/validation/investigate.ts`, `tests/validation.test.ts`, `tests/workerApi.test.ts`: coordinate bounds, allowed variables/seasons, year range)
- [x] **(Mylena)** `<Investigation />` form: location via a city list + coordinates + map (Leaflet); wire to a live NASA POWER fetch + the client-side stats engine (or `/api/investigate`), with browser-side caching; minimum 15 years validation
  - *Note (Mylena):* added `leaflet`+`react-leaflet@5` (not installed before, despite the tech-stack line) + `<LocationPicker />` (search via `/api/geocode`, manual lat/lon, click-to-pick map — OSM tiles, not CARTO, which now requires an API key). Reuses Kauê's `investigateClientSide`/`validateInvestigateQuery` as-is. Race protection via a request-id ref (stale submit/preset-switch responses are ignored). Error display is minimal (`errors.*` text only) — full illustrated error/empty states are the next task.
- [x] **(Mylena)** Error/empty states in the result area: NASA unavailable, all `-999`, invalid coordinates, fewer than 15 years of data
  - *Note (Mylena):* a bordered notice block (title + the existing `errors.*` message + "still showing the previous result below") replaces the one-line error text; "More options" auto-opens for errors fixable there (year range, coordinates). DESIGN.md groups error/empty as one concept — no separate empty state exists since Investigation always has a valid preset result to fall back to.
- [x] **(Mylena)** "Derived from Case #0X" mode when editing a loaded case's variable/season, with `Restore original case`
  - *Note (Mylena):* any successful live submit while a preset is loaded flips to "derived" (banner + restore button, using Kauê's existing `cases.derivedBanner`/`cases.restoreAction` copy) — not just variable/season specifically, since editing location/years counts too.
- [x] **(Higor & Luis)** Copy for all error/empty states and form labels (EN + PT) (`src/locales/en.json` & `src/locales/pt.json`)
- [x] **(Kauê)** 🚀 **Release R2:** merge `dev -> main`, deploy, test live searches (Manaus, Cuiabá, Tokyo, ocean point — verified live against `https://nasaspaceappschallenge2026.kauerian342.workers.dev`, D1 cache `lat_round`/`lon_round` fixed & active)

## 🎬 R3 — Showtime (target Sun 08:30, before UI Freeze)
- [x] **(Mylena)** `<Hero />` real/attention-grabbing version (`src/components/Hero.tsx` featuring Vilhena Case #01 `<ClimateStripes tone="dark" />` + `prefers-reduced-motion` smooth scroll & transitions)
- [x] **(Mylena)** "View as" toggle finished on the result chart (`line+trend` / `bars` / `stripes` in `<TrendChart />`, wired with `variable` in `<Investigation />`)
- [x] **(Mylena)** Mobile polish: header + home sections stack cleanly (`mx-auto max-w-5xl`, `px-4 sm:px-6`, responsive phrase bar & Leaflet height, `overflow-x-clip` / `max-w-[calc(100vw-3rem)]` dropdown, zero horizontal overflow)
- [x] **(Kauê)** Evidence/share image generation (`<ClimateStripes />` + `<EvidenceCard />`: Story 9:16 with stats + QR code, Square 1:1 minimal) + `Download PNG` (HTML5 Canvas PNG generator in `src/components/share/`)
- [x] **(Kauê)** `POST /api/dossiers` + `GET /api/dossiers/:id` (structured fields only, no free text) — **backed by D1** — + read-only shared-result page with a CTA (`src/worker/routes/dossiers.ts` + `<SharedDossierView />` in `src/components/share/SharedDossierView.tsx`)
- [x] **(Kauê)** `<ShareSheet />` ready to wire into `<Investigation />`'s actions row: `Copy Share Link` (auto-save via the endpoint above), `Download PNG`, `Download CSV`, `Copy Citation` (`src/lib/export/dossierExport.ts`), native `navigator.share` on mobile (`src/components/share/ShareSheet.tsx`)
- [x] **(Higor & Luis)** Logo/wordmark, favicon, static OG image in `public/brand/` (`public/favicon.svg`, `public/brand/favicon.svg`, `public/brand/logo-wordmark.svg`, `public/brand/og-card.svg`)
- [x] **(Kauê)** 🚀 **Release R3:** merge `dev -> main`, deploy → **UI Freeze ready** (`https://nasaspaceappschallenge2026.kauerian342.workers.dev`)

## 🗂️ R4 — Credibility & Extras (target Sun 13:30)
*Should first, then Could. Stop at 13:30 no matter what.*
- [x] **(Mylena)** **Should:** `<MethodsPage />` complete (all 7 sections: NASA data, seasonal aggregation, Mann-Kendall, Sen's Slope + CI, Benjamini-Hochberg FDR provenance, empirical 4-scale validation table from `CASE_PRESETS`, and scientific limitations)
- [x] **(Higor & Luis)** **Should:** Methods page text in plain language (EN + PT), including Limitations (MERRA-2 ~50 km grid, autocorrelation, short records, **correlation vs. causation**, and opposite regional trends driven by global processes) (`src/locales/en.json` & `src/locales/pt.json`)
- [x] **(Kauê)** **Should:** OG meta tags (static image) for `/` and the shared-result page (`index.html` + `public/brand/og-card.svg`)
- [x] **(Mylena)** **Could:** "Already viewed" indicator on Featured Cases (`etd.viewedCases` persisted in `localStorage` inside `<CasesGrid />`)
- [x] **(Kauê)** **Could:** QR code + short URL on the share image (`src/components/share/EvidenceCard.tsx`)
- [x] **(Kauê)** **Could:** `GET /api/dossiers` "Recent shared results" list (structured fields only) + drawer UI (`src/worker/routes/dossiers.ts` + `<RecentDossiersDrawer />` in `src/components/share/RecentDossiersDrawer.tsx`)
- [x] **(Kauê)** **Could:** `<SatelliteTimelapse />` base panel (`src/components/share/SatelliteTimelapse.tsx`): **NASA GIBS / Worldview WMTS** (`MODIS_Terra_CorrectedReflectance_TrueColor` `Aug 29` & `MODIS_Terra_L3_NDVI_Monthly` `Aug 01`, `2000–2025`, 100% HTTP 200 coverage) with a **Play/Pause year-by-year timeline scrubber**
- [x] **(Kauê)** Upgrade `<SatelliteTimelapse />` with a default-open **"Before vs. After" (`2000` vs. `2025` side-by-side comparison)** + Timelapse mode toggle (`True Color` & `NDVI`), Dark Editorial styling, full PT/EN i18n, and wire it directly below `<TrendChart />` inside `<Investigation />` — plus wire deep-link SPA routing (`src/lib/routing.ts` for `/dossier/:id`, `/?case=`, `/investigate?...`), `<SharedDossierView />`, `<RecentDossiersDrawer />`, lazy-load Leaflet (`LocationPicker`), `db:migrate:remote --yes`, and live Worker + D1 deployment (`https://nasaspaceappschallenge2026.kauerian342.workers.dev`)
- [x] **(Kauê)** Create formal scientific provenance & audit document (`docs/science/AUDIT.md`) + upgrade `README.md` to Global Winner format (scientific scope disclaimer, *Signature Moment*, 4-scale verified table, 3-tier offline-first architecture, mathematical provenance matrix)
- [x] **(Antigravity — Mylena / Kauê)** **Could:** Temperature unit toggle (`°C | °F`) alongside `EN | PT` in `<AppHeader />` (persisted preference in `localStorage`), converting `T2M` / `T2M_MIN` (`unit === "C"`) across UI, `<TrendChart />`, `<Investigation />` (headline + FDR scan + CI), `<MethodsPage />` empirical table, `<EvidenceCard />`, `<SharedDossierView />`, and `dossierExport.ts` CSV/citation exports (absolute temperatures `°C × 9/5 + 32` vs. slopes/deltas/stdDev `Δ°C × 9/5` without `+32` offset; `PRECTOTCORR` `mm` and `GWETROOT` `%` unchanged) + Vitest unit coverage
- [x] **(Antigravity — Mylena / Kauê)** **Could:** Interactive hover & visual explanation on `<ClimateStripes />` (`src/components/share/ClimateStripes.tsx`, rendered in `<TrendChart />` `stripes` view and `<Hero />`): floating Dark Editorial hover tooltip matching `Barras Sazonais` (showing year/window label, formatted value + unit, z-score, extreme anomaly tag `|z| > 1.5`, and active stripe highlight) + compact color-scale legend & plain-language PT/EN caption explaining how each vertical stripe encodes yearly z-score anomalies relative to the period mean (`TEMP_PALETTE` cooling blue ↔ warming crimson; `HYDRO_PALETTE` drought ochre ↔ moisture teal)
- [x] **(Kauê)** **Could:** AI Natural-Language Investigation Assistant (`POST /api/ai/translate` + `POST /api/ai/interpret` backed by Gemini API `responseJsonSchema` + `thinkingLevel`, server-side `GEMINI_API_KEY` secret + D1/isolate caching + input/rate bounds, AI-first prompt bar in `<Investigation />` with synchronized editable manual filters under `Advanced options`, Layer 2 execution through existing geocode + NASA POWER + BH FDR scan pipeline, non-empty unhappy-path scope/error recovery, scientific synthesis card + Layer 1 JSON disclosure inside expanded method panel) + TDD Vitest coverage
- [x] **(Antigravity — Kauê)** **Could (Follow-up):** AI outage resilient fallback mode (client-side deterministic semantic parser + local statistical synthesis summary when Gemini routes return `503`/`429` or no `GEMINI_API_KEY` is configured)
- [x] **(Antigravity — Kauê)** Configure explicit `vars` (`GEMINI_MODEL`) and non-inheritable `previews` bindings (`vars` + `d1_databases`) in `wrangler.jsonc`, plus `.dev.vars.example` template for local `wrangler dev` (keeping secret `GEMINI_API_KEY` out of Git)
- [x] **(Antigravity — Mylena / Kauê)** **Could (Share UI & Site-Wide i18n Audit):** Localize `<ShareSheet />` (including the Share card title, format toggles, PNG/CSV/citation/link buttons, close button, `aria-label`, and native share summary), `<EvidenceCard />` (DOM preview & HTML5 Canvas PNG export — verdict, variable, season, stat headers, source metadata, and verification QR label), `<ClimateStripes />` (localized caption `FAIXAS DE ANOMALIA (Z-SCORE)` / `ANOMALY STRIPES (Z-SCORE)`, SVG `aria-label`, and formatted/°F-aware stripe `<title>`), `<LanguageToggle />` `aria-label`, `<TrendChart />` SVG `aria-label`, and `buildCitationText()` PT confidence interval (`IC 95%` / `/década`) + localized variable/season/verdict labels in `dossierExport.ts`, plus full PT/EN regression tests
- [ ] **[4H]** **[priority: high]** **(Kauê)** **Release Gate:** Promote validated `dev` integration (Gemini 4 AI assistant, 20-investigation catalog + API filters, and NASA GIBS tile preloading) to `main` after manual testing on `dev` (CI/CD production deploy)
- [ ] **[9L]** **[priority: low]** **(Kauê / Mylena)** **Could (Academic Share & Satellite Visual Evidence Sharing):** Upgrade the share & export experience in `src/components/share/` and `src/lib/export/dossierExport.ts`:
  - **Academic Share Modes (`Slides 16:9` & `Paper / Article` alongside `Story 9:16` & `Square 1:1`):** add publication-ready `Paper / Article` (high-contrast figure layout with full statistical provenance: Sen's Slope + 95% CI, Mann-Kendall $S/Z/p$, $n$ years, OLS $R^2$, correlation ≠ causation caveat, coordinates, and NASA POWER / MERRA-2 source) and `Slide 16:9` (widescreen presentation deck layout) presets in `EvidenceCard.tsx` / `ShareSheet.tsx`, plus ready-to-copy academic citation formats (BibTeX, ABNT, APA) alongside existing CSV, PNG, and dossier link actions.
  - **Satellite Evidence Sharing (`SatelliteTimelapse.tsx`):** add share & export controls to NASA GIBS satellite visual evidence (`Before vs. After` comparison or selected Timelapse year, `MODIS True Color` / `NDVI` layer, coordinates, and NASA GIBS / Worldview attribution), supporting shareable deep links preserving satellite layer/mode/year, copyable NASA GIBS figure caption/citation, native `navigator.share`, and downloadable side-by-side PNG figure export (with CORS-safe tile handling/fallback).
- [ ] **[1H]** **[priority: high]** **(Antigravity — Kauê / Mylena)** **Transparent AI Step-by-Step Pipeline Status (`src/components/AiAssistantBar.tsx`, `src/components/Investigation.tsx`):** Keep the 3-step pipeline tracker visible during/after AI queries (`stage !== "idle"`, including errors) and redesign it into compact 2-line Dark Editorial cards so every step makes it unmistakable whether AI ran, is running, used local mode, or was not executed:
  - Line 1: step label (`1. AI Filters`, `2. NASA + Mann-Kendall`, `3. AI Synthesis`); Line 2: icon + explicit status (`● Running…` with `motion-safe:animate-pulse`, `✓ Done · AI` on AI stages, `✓ Done · Real data` on Stage 2, `◈ Local mode · no AI` when deterministic fallback runs, `— Not executed` for skipped steps — fixing out-of-scope queries that previously marked Stage 3 done — and `✕ Failed` on the exact interrupted step instead of resetting `stage` to `"idle"`).
  - Detect AI vs. local fallback independently per stage (`aiTranslation?.model === LOCAL_TRANSLATE_MODEL` vs. `aiInterpretation?.model === LOCAL_INTERPRET_MODEL`), align the discrete local-mode notice below the steps, and add TDD coverage (`tests/aiFallback.test.ts`, `tests/r3r4Components.test.ts`).
- [ ] **[2H]** **[priority: high]** **(Antigravity — Kauê / Mylena)** **Remove Visible AI Model & Provider References Across UI (`src/locales/*.json`, `AiSynthesisPanel.tsx`, `Investigation.tsx`):** Remove all user-facing mentions of model names, provider brands (`"Gemini"`), technical IDs (`gemini-3.5-flash-lite`, `local-*-fallback`), and `"Model"` / `"Modelo"` labels across the entire site — displaying at most `"IA"` (PT) / `"AI"` (EN) or `"Local · no AI"` / `"Modo local · sem IA"`:
  - Update locale strings (`ai.eyebrow` `"NASA POWER + AI"` / `"NASA POWER + IA"`, `ai.fallbackTitle`, `ai.fallbackBody`, `ai.errors.AI_NOT_CONFIGURED`, `ai.errors.AI_UPSTREAM_ERROR`), map the badge in `AiSynthesisPanel.tsx` (`interpretation.model`) to clean `"AI"` / `"IA"` vs. `"Local Statistical Summary"` (plus cached indicator), strip `(Model: ...)` from `Investigation.tsx` expanded method details, keep backend `model` internal to `/api/ai/*` JSON/Worker code (UI-only cleanup), and update UI assertions in `tests/aiFallback.test.ts`.
- [ ] **[3H]** **[priority: high]** **(Higor & Luis / Mylena / Kauê)** **Could (Professional UI Copy & Unambiguous Status UX):** Audit and polish remaining user-facing messages across `Investigation.tsx`, `RecentDossiersDrawer`, `CasesGrid`, `SatelliteTimelapse`, and `src/locales/*.json` (PT + EN) to eliminate leftover internal engineering jargon (`"Camada 1"`, `"D1"`, abbreviated developer labels) in complement to the two AI UI tasks above and elevate scientific readability across every feature.
- [x] **[18H]** **[priority: high]** **(Antigravity — All)** Add mandatory `<number><H|M|L>` task code convention (`1H`, `7M`, `9L`...) across `AGENTS.md`, `CLAUDE.md`, `TASK.md`, `task.md`, and `SPACE_APPS_2026.md` and assign codes to all open tasks
- [x] **[priority: high]** **(Antigravity — All)** Enforce priority-driven / user-approved execution order rule in [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md), [`TASK.md`](TASK.md) (and root docs) and log new AI UI transparency & model-masking tasks without auto-executing them
- [x] **[priority: high]** **(Antigravity — All)** **Establish mandatory `priority` property across all tasks & AI guides:** document required `[priority: low | medium | high]` (`AGENTS.md`, `CLAUDE.md`, `TASK.md`, plus PT-BR root docs) and tag all open `[ ]` / `[~]` tasks
- [x] **(Antigravity — All)** **Rebrand software name from `EarthTrend Detective` to `GeoTrend`:** update user-facing brand copy (`index.html`, `src/locales/en.json`, `src/locales/pt.json`), SVG brand assets (`public/brand/logo-wordmark.svg`, `og-card.svg`, `favicon.svg`, `public/favicon.svg`), exports/cards (`EvidenceCard.tsx`, `ShareSheet.tsx`, `dossierExport.ts` PNG/CSV filenames & citations), `src/worker/index.ts` `service` field + affected tests (`contract.test.ts`, `workerApi.test.ts`, `shareHelpers.test.ts`), project/submission docs (`README.md`, `DESIGN.md`, `AGENTS.md`, `CLAUDE.md`, `TASK.md`, `docs/science/AUDIT.md`, `docs/submission/*`), and evaluate safe/backwards-compatible handling for `localStorage` keys (`etd.*` / `earthtrend:power:v1:`), custom domain selection, and keeping existing Cloudflare D1 resource `earthtrend-db` binding intact without breaking live prod data
- [ ] **[7M]** **[priority: medium]** **(Kauê)** Register custom domain via GoDaddy Global Offer (`geotrend.*` / `earthtrend.*`) and bind Custom Domain in Cloudflare Workers (`wrangler.jsonc`)
- [~] **[8M]** **[priority: medium]** **(Kauê)** Add MIT `LICENSE`; finalize `README.md` (`LICENSE` and full scientific `README.md` created; final live URL/screenshots added at Code Freeze)
- [ ] **[5H]** **[priority: high]** **(Kauê)** Make repository public on GitHub and enable branch protection on `main` and `dev`
- [ ] **[6H]** **[priority: high]** **(Kauê)** 🚀 **Code Freeze Sun 14:00:** final `dev -> main` deploy, incognito + projector/TV test

**Won't (this hackathon):** 3D globe, daily data, extra NASA datasets, accounts/login, free-text notes.

---

## 🎤 Pitch, Video & Submission Track (Higor & Luis — runs in parallel)
- [x] **(Higor & Luis)** Research regional impact context for the 4 cases (`#01 Vilhena-RO`, `#02 Ariquemes-RO`, `#03 Corumbá/Pantanal-MS`, `#04 Svalbard-Arctic` + **Missão Amazônia: ODS 6, ODS 13, ODS 15, MapBiomas land-use context & environmental education in schools** in `docs/submission/regional-impact-context.md`)
- [x] **(Higor & Luis)** 30-second video script (EN) in `docs/submission/video-script-30s.md` (0–5s hero/intro, 5–15s a Featured Case result, 15–25s live investigation, 25–30s impact + share image)
- [x] **(Higor & Luis)** 3-minute pitch script (PT-BR) in `docs/submission/pitch-script-pt.md` + 5–7 slide structure
- [x] **(Higor & Luis)** Draft NASA portal fields (EN) in `docs/submission/nasa-portal-copy.md`
- [ ] **[10M]** **[priority: medium]** **(Higor & Luis)** Attend HUBEE Pitch Workshop (Sun 09:00–09:45)
- [ ] **[11H]** **[priority: high]** **(Higor & Luis)** Capture 4–7 English UI screenshots after UI Freeze
- [ ] **[12H]** **[priority: high]** **(Higor & Luis)** Record/edit the 30s video (≤ 30s, EN audio or PT audio + EN subtitles) and upload to YouTube; verify playback
- [ ] **[13H]** **[priority: high]** **(Higor & Luis)** Final PDF slides (PT-BR) + offline copy of slides, demo video and screenshots on the stage laptop
- [ ] **[14H]** **[priority: high]** **(Higor & Luis + Stage Rep)** Rehearse the 3-minute pitch at least twice
- [ ] **[15H]** **[priority: high]** **(All)** Submit local HUBEE deliverables (15:00–15:30)
- [ ] **[16H]** **[priority: high]** **(Stage Rep)** Deliver the 3-minute pitch (15:30–17:00)
- [ ] **[17H]** **[priority: high]** **(All 4)** Verify repo, live URL, video, screenshots, English fields → submit on the NASA portal before Sun 21:30
