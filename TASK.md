# 📋 Task Board — EarthTrend Detective (`TASK.md`)

> **Challenge:** `Be An Earth System Trend Detective!` (NASA Space Apps Challenge 2026 — Vilhena, RO, Brazil)  
> **Repository:** `KaueRian/NASASpaceAppsChallenge2026`  
> **Tech Stack:** React + Vite + Tailwind CSS + Leaflet + Recharts | Cloudflare Pages & Pages Functions (Hono + TypeScript) | Cloudflare D1 (SQLite) | Biome + Vitest + GitHub Actions  
> **Team:**
> - **Kauê** (`Dev 1 — Backend, NASA Data, Stats & Infra`)
> - **Mylena** (`Dev 2 — Frontend, Map, Charts & i18n`)
> - **Higor & Luis** (`Pitch, Slides, 30s Video, Storytelling & Official Submission`)

---

## 🤝 Multi-Dev Collaboration & Git Workflow
1. **Task-Driven Rule (Single Source of Truth):** Every code, doc, or config change—no matter how small—must map to a task in this file. If a task does not exist yet, add it here before starting work.
2. **Status Legend:**
   - `[ ]` Pending
   - `[~] (<Name>)` In progress (claim it before editing!)
   - `[x]` Done
3. **Branching & PR Flow (`feature/*` -> `dev` -> `main`):**
   - **NEVER commit directly to `main`.** `main` is strictly for tested, deployable releases (promoted from `dev`).
   - Always branch off `dev` using short-lived feature branches (`feat/stats-engine`, `feat/map-ui`, `docs/gitflow`, etc.), merge back into `dev` via PR (or after CI passes), and then merge `dev` -> `main`.
   - Separate file ownership: `Kauê` owns `functions/api/`, `d1/`, `.github/`, and `tests/`; `Mylena` owns `src/components/`, `src/locales/`, and `src/pages/`. Both share `src/types/investigation.ts`.
4. **Local Dev Standard:** Unified full-stack local dev using `npm` (Node 20+) + `wrangler pages dev` + local Cloudflare D1 SQLite (no Cloudflare login required for Mylena to run locally).
5. **English Only:** Keep all tasks, code, comments, docs, and commit messages in English.

---

## 🚀 Phase 0: Setup, Access & Alignment
- [x] **(Kauê)** Initialize Git repository and push to GitHub via HTTPS (`KaueRian/NASASpaceAppsChallenge2026`)
- [x] **(Kauê)** Create repository governance files (`TASK.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`, English `README.md`)
- [x] **(Both)** Finalize architecture & stack (Cloudflare Pages + Hono + D1 SQLite + React/Vite/Tailwind + Leaflet + Recharts)
- [x] **(Kauê)** Configure `feature/* -> dev -> main` branching workflow in `dev`, `AGENTS.md`, `CLAUDE.md`, and `TASK.md`
- [ ] **(Kauê)** Invite **Mylena** as collaborator on `KaueRian/NASASpaceAppsChallenge2026` (add GitHub handle once confirmed)
- [ ] **(Kauê)** Enable GitHub branch protection on `main` (block direct pushes; require PR from `dev`)
- [ ] **(Kauê)** Authenticate Wrangler CLI, create Cloudflare D1 database (`earthtrend-db`), and create Cloudflare Pages project (`earthtrend-detective`)
- [ ] **(Kauê)** Scaffold single-project structure (`package.json` with `npm`/Node 20+, Vite + React + Tailwind, Hono Pages Functions, `wrangler.toml`, Vitest, Biome)
- [ ] **(Kauê)** Set up GitHub Actions CI workflow (`.github/workflows/ci.yml`) running Biome lint, `tsc --noEmit`, and `vitest` on PRs to `dev` and `main`
- [ ] **(Kauê)** Define shared TypeScript API contract in `src/types/investigation.ts` (i18n-first structured metrics + enum keys so backend never hardcodes prose; Request/Response, Presets, Season modes, Dossier types)
- [ ] **(Kauê)** Configure Cloudflare D1 schema (`d1/schema.sql`) for NASA API cache (`nasa_cache`) and shareable Dossiers (`dossiers`)
- [ ] **(Kauê)** Smoke-test **NASA POWER API** historical endpoint for Vilhena (`lat=-12.74, lon=-60.14`) and verify `-999` sentinel handling
- [ ] **(Mylena)** Set up dark investigative UI theme and i18n dictionaries (`src/locales/en.json`, `src/locales/pt.json`)

---

## 🔬 Phase 1: Data Ingestion & Statistical Forensics Engine (`functions/api/` & `tests/`)
*Goal: Guarantee scientific rigor for NASA's `Validity` and `Best Use of Science` criteria.*

- [ ] **(Kauê)** Build **NASA POWER API** `temporal/monthly/point` historical fetcher (1981–latest full year: `T2M`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT`) with timeout/retry handling and `-999` missing-value filtering
- [ ] **(Kauê)** Implement temporal aggregator supporting **Annual**, **Oct–Mar (`ONDJFM`, Wet in RO)**, and **Apr–Sep (`AMJJAS`, Dry in RO)** series
- [ ] **(Kauê)** Implement Cloudflare D1 caching layer keyed by `(round(lat, 2), round(lon, 2), variable)` for raw monthly series so season/year-range changes recalculate in `<1ms` and repeated queries return in `<50ms`
- [ ] **(Kauê)** Implement **Sen's Slope Estimator** (annual & decadal rate of change) in TypeScript
- [ ] **(Kauê)** Implement **Mann-Kendall Trend Test** (S-statistic, Z-score, p-value for 95%/99% significance) in TypeScript
- [ ] **(Kauê)** Write Vitest unit tests verifying Mann-Kendall, Sen's Slope, seasonal aggregation, and `-999` filtering against known reference datasets
- [ ] **(Kauê)** Implement `GET /api/investigate` Hono endpoint returning time-series, trend stats, anomalies, and NASA citation metadata
- [ ] **(Kauê)** Implement `POST /api/dossiers` and `GET /api/dossiers/:id` in Hono + D1 (saving coordinates, label, variable, season, year range, investigator note, and stats snapshot)
- [ ] **(Kauê)** Pre-seed D1 cache for **5 Pre-loaded Case Studies (3 Regional + 2 Global)** so demo loads instantaneously even on slow venue Wi-Fi:
  - [ ] *Case #01 (Vilhena, RO):* Rainy season onset / precipitation shift (`PRECTOTCORR`, Southern Cone of Rondônia)
  - [ ] *Case #02 (Porto Velho, RO):* Extreme drought & root-zone soil wetness trend (`GWETROOT`, Madeira River Basin)
  - [ ] *Case #03 (Ariquemes, RO):* Rising tropical night minimum temperatures (`T2M_MIN`)
  - [ ] *Case #04 (Svalbard / Arctic):* Polar amplification & rapid surface warming benchmark (`T2M`)
  - [ ] *Case #05 (Niamey / Sahel):* Semi-arid precipitation variability & soil moisture stress (`PRECTOTCORR` / `GWETROOT`)

---

## 🗺️ Phase 2: "EarthTrend Detective" UI, Map & Localization (`src/`)
*Goal: Engaging investigative UX, interactive dark map, and seamless bilingual support.*

- [ ] **(Mylena)** Build Header with **"EarthTrend Detective"** branding and language switcher `[ 🇺🇸 EN | 🇧🇷 PT ]`
- [ ] **(Mylena)** Implement automatic language detection (`localStorage` -> `navigator.language` -> `'en'` fallback)
- [ ] **(Mylena)** Integrate **Leaflet (`react-leaflet`)** with CartoDB Dark Matter tiles, auto-loading **Case #01 (Vilhena, RO)** on initial page load + click-to-investigate anywhere on Earth (displaying preset name or formatted coordinates)
- [ ] **(Mylena)** Add the 5 preset Case Study pins on the map (3 Rondônia + 2 Global) with quick-jump selector cards
- [ ] **(Mylena)** Build environmental variable selector (`T2M`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT`), season selector (`Annual` / `Oct–Mar` / `Apr–Sep` with clear hemisphere/RO labels), and year-range controls
- [ ] **(Mylena)** Render interactive **Recharts** time-series chart with Sen's Slope trendline, decadal delta, and anomaly highlights
- [ ] **(Mylena)** Build the **"Investigative Dossier / Forensic Report"** card answering the 4 challenge questions + explicit NASA dataset citation badge (`NASA POWER / MERRA-2`):
  1. *What is changing?*
  2. *Where is it changing?*
  3. *By how much?*
  4. *Is it statistically significant? ("Proven Trend" vs. "No Significant Trend" badge)*
- [ ] **(Mylena)** Add "Save & Share Dossier" modal/button with optional investigator note and shareable `/dossier/:id` route
- [ ] **(Kauê & Mylena)** Connect frontend UI to `/api/investigate` and `/api/dossiers` endpoints, test loading/error states, and freeze core demo UI for **Higor & Luis** to capture screenshots & 30s video

---

## 🎬 Phase 3: Polish, 30s Video & Local Pitch
*Goal: Complete all submission assets before Sunday 14:00 local departure!*

- [ ] **(Kauê)** Promote `dev` -> `main`, deploy live demo to **Cloudflare Pages** (`*.pages.dev`) with D1 bound, and verify in incognito window
- [ ] **(Kauê)** Finalize `README.md` with screenshots, live demo URL, architecture diagram, and explicit NASA dataset citations
- [ ] **(Higor & Luis)** Prepare local pitch slide deck in PDF (5–7 slides in PT-BR for the 3-minute HUBEE presentation)
- [ ] **(Higor & Luis)** Record and edit the **Official 30-Second Pitch Video** (max **30s**, English audio or PT-BR audio with mandatory English subtitles)
- [ ] **(Higor & Luis)** Upload 30s video to YouTube (Public or Unlisted) while on stable venue Wi-Fi
- [ ] **(Higor & Luis)** Draft complete project submission fields on the NASA Space Apps portal (in English) and verify team roster registration

---

## 🏁 Phase 4: Presentation & Official Submission
- [ ] **(Higor & Luis)** Present local 3-minute pitch in Vilhena (1 representative on stage, Art. 6.2)
- [ ] **(Higor & Luis)** Submit final project on the NASA Space Apps portal before **Sunday 21:30 UTC-4** (with all links verified)
