# 📋 Master Task Board & Single Source of Truth (`TASK.md`)

> **Challenge:** `Be An Earth System Trend Detective!` (NASA Space Apps Challenge 2026 — Vilhena, RO, Brazil)  
> **Project Name:** **EarthTrend Detective**  
> **Official Team Name / ID:** `TBD — Fill on Saturday morning`  
> **Repository:** `KaueRian/NASASpaceAppsChallenge2026`  
> **Slides / Media Workspace (Canva / Drive):** `TBD — Add link here`  
> **Stage Representative (Art. 6.2 — 1 person on stage):** `TBD — Decide Saturday morning`  
> **Tech Stack:** React + Vite + Tailwind CSS + Leaflet + Recharts | Cloudflare Pages & Pages Functions (Hono + TypeScript) | Cloudflare D1 (SQLite) | Biome + Vitest + GitHub Actions

---

## 👥 Team Roster & Ownership
| Member | Role | Owned Paths / Assets |
|---|---|---|
| **Kauê** (`Dev 1`) | Backend, NASA Data, Stats Engine, CI & Deploy | `functions/api/`, `d1/`, `.github/`, `tests/`, `wrangler.toml` |
| **Mylena** (`Dev 2`) | Frontend UI, Map, Charts & i18n | `src/components/`, `src/pages/`, `src/locales/` |
| **Higor & Luis** | Storytelling, Pitch, Slides, 30s Video & Submission | `docs/submission/` (scripts & portal copy) + external Canva/Drive |
| **Shared Contract** | Frontend ↔ Backend TypeScript types | `src/types/investigation.ts` |

---

## ⏱️ Team Synchronization Checkpoints (HUBEE Vilhena — UTC-4)
| Checkpoint | Target Time | Goal |
|---|---|---|
| **C0 — Kickoff & Registration** | **Sat 07:30–09:00** | HUBEE check-in, confirm all 4 members in the same NASA Team ID, decide stage rep |
| **C1 — Contract & Data Alive** | **Sat 13:00** | `src/types/investigation.ts` locked, NASA POWER returning real data, Higor & Luis align narrative |
| **C2 — Core Engine & UI Wired** | **Sat 20:00** | Mann-Kendall/Sen's Slope tests green, Leaflet + Recharts connected to `/api/investigate` |
| **C3 — UI Freeze & Pitch Workshop** | **Sun 09:00–09:45** | Stable demo UI for Higor & Luis to capture English screenshots & record 30s video; attend HUBEE Pitch Workshop |
| **C4 — Code Freeze & Prod Deploy** | **Sun 14:00** | Merge `dev -> main`, verify Cloudflare Pages production URL + D1 cache in incognito |
| **C5 — Local HUBEE Deadline** | **Sun 15:00–15:30** | Submit local deliverables (PDF slides + link) — **HARD LOCAL DEADLINE** |
| **C6 — Local Stage Pitch** | **Sun 15:30–17:00** | 3-minute live pitch on stage (1 representative, Art. 6.2, PT-BR, offline backup ready) |
| **C7 — Global NASA Submission** | **Sun ≤ 21:30** | All 4 members verify links, 30s YouTube video, public repo & English form before final Submit |

---

## 🤝 Multi-Dev Collaboration & Git Workflow
1. **Single Source of Truth:** Every code, doc, media-script, or config change must map to a task in this file. Add a task first if one does not exist.
2. **Status Legend:** `[ ]` Pending | `[~] (<Name>)` In progress (claim before editing!) | `[x]` Done
3. **Branching & PR Flow (`feature/*` -> `dev` -> `main`):**
   - **NEVER commit directly to `main`.** `main` is strictly for tested, deployable releases (promoted from `dev`).
   - Branch off `dev` (`feat/*`, `fix/*`, `docs/*`), merge back into `dev` after CI passes, and promote `dev -> main` for releases.
4. **Local Dev Standard:** Unified full-stack local dev using `npm` (Node 20+) + `wrangler pages dev` + local Cloudflare D1 SQLite (no Cloudflare login required for Mylena to run locally).
5. **English Only in Repo:** Keep all code, comments, commit messages, and repo docs (`docs/submission/` can have PT-BR pitch script alongside EN submission texts) in English.

---

## 🚀 Phase 0: Setup, Access & Alignment (Pre-Event & Sat Morning)
- [x] **(Kauê)** Initialize Git repository and push to GitHub via HTTPS (`KaueRian/NASASpaceAppsChallenge2026`)
- [x] **(Kauê)** Create repository governance files (`TASK.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`, English `README.md`)
- [x] **(All)** Finalize architecture, stack, and whole-team roadmap in `TASK.md`
- [x] **(Kauê)** Configure `feature/* -> dev -> main` branching workflow in `dev`, `AGENTS.md`, `CLAUDE.md`, and `TASK.md`
- [ ] **(All)** Confirm all 4 members are linked to the same official Team ID on the NASA Space Apps portal & fill Team Name in `TASK.md`
- [ ] **(All)** Decide the **1 stage representative** for Sunday's 3-minute pitch (Art. 6.2) on Saturday morning
- [ ] **(Kauê)** Invite **Mylena** (and Higor/Luis if editing `docs/submission/`) to `KaueRian/NASASpaceAppsChallenge2026`
- [ ] **(Kauê)** Enable GitHub branch protection on `main` (block direct pushes; require PR from `dev`)
- [ ] **(Kauê)** Authenticate Wrangler CLI, create Cloudflare D1 database (`earthtrend-db`), and create Cloudflare Pages project (`earthtrend-detective`)
- [ ] **(Kauê)** Scaffold single-project structure (`package.json` with `npm`/Node 20+, Vite + React + Tailwind, Hono Pages Functions, `wrangler.toml`, Vitest, Biome)
- [ ] **(Kauê)** Set up GitHub Actions CI workflow (`.github/workflows/ci.yml`) running Biome lint, `tsc --noEmit`, and `vitest` on PRs to `dev` and `main`
- [ ] **(Kauê)** Define shared TypeScript API contract in `src/types/investigation.ts` (i18n-first structured metrics + enum keys so backend never hardcodes prose; Request/Response, Presets, Season modes, Dossier types)
- [ ] **(Kauê)** Configure Cloudflare D1 schema (`d1/schema.sql`) for NASA API cache (`nasa_cache`) and shareable Dossiers (`dossiers`)
- [ ] **(Kauê)** Smoke-test **NASA POWER API** `temporal/monthly/point` endpoint for Vilhena (`lat=-12.74, lon=-60.14`) and verify `-999` sentinel handling
- [ ] **(Mylena)** Set up **Old NY Noir Detective Office** theme (espresso charcoal `#12100E`, brass amber `#D49B42`, crimson pins `#B9382C`, aged-paper dossier accents, CSS grain, legible mono/sans for data) and i18n dictionaries (`src/locales/en.json`, `src/locales/pt.json`)
- [ ] **(Higor & Luis)** Review official NASA judging criteria (`Impact`, `Creativity`, `Validity`, `Relevance`, `Presentation`) and HUBEE local rules, and create `docs/submission/` + external Canva/Drive link

---

## 🔬 Phase 1: Data Ingestion, Stats Engine & Storytelling (Sat)
*Code Goal: Guarantee scientific rigor (`Validity` & `Best Use of Science`). Story Goal: Lock scripts & NASA portal copy in parallel.*

- [ ] **(Kauê)** Build **NASA POWER API** `temporal/monthly/point` historical fetcher (1981–latest full year: `T2M`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT`) with timeout/retry handling and `-999` missing-value filtering
- [ ] **(Kauê)** Implement temporal aggregator supporting **Annual**, **Oct–Mar (`ONDJFM`, Wet in RO)**, and **Apr–Sep (`AMJJAS`, Dry in RO)** series
- [ ] **(Kauê)** Implement Cloudflare D1 caching layer keyed by `(round(lat, 2), round(lon, 2), variable)` for raw monthly series so season/year-range changes recalculate in `<1ms` and repeated queries return in `<50ms`
- [ ] **(Kauê)** Implement **Sen's Slope Estimator** (annual & decadal rate of change) in TypeScript
- [ ] **(Kauê)** Implement **Mann-Kendall Trend Test** (S-statistic, Z-score, p-value for 95%/99% significance) in TypeScript
- [ ] **(Kauê)** Write Vitest unit tests verifying Mann-Kendall, Sen's Slope, seasonal aggregation, and `-999` filtering against known reference datasets
- [ ] **(Kauê)** Implement `GET /api/investigate` Hono endpoint returning time-series, trend stats, anomalies, and NASA citation metadata
- [ ] **(Kauê)** Implement `GET /api/geocode` Hono endpoint (wrapping Open-Meteo Geocoding API) to resolve typed city/region names into `(lat, lon)` + location label
- [ ] **(Kauê)** Implement `POST /api/dossiers` and `GET /api/dossiers/:id` in Hono + D1 (saving coordinates, label, variable, season, year range, investigator note, and stats snapshot)
- [ ] **(Kauê)** Pre-seed D1 cache for **5 Pre-loaded Case Studies (3 Regional + 2 Global)** so demo loads instantaneously even on slow venue Wi-Fi:
  - [ ] *Case #01 (Vilhena, RO):* Rainy season onset / precipitation shift (`PRECTOTCORR`, Southern Cone of Rondônia)
  - [ ] *Case #02 (Porto Velho, RO):* Extreme drought & root-zone soil wetness trend (`GWETROOT`, Madeira River Basin)
  - [ ] *Case #03 (Ariquemes, RO):* Rising tropical night minimum temperatures (`T2M_MIN`)
  - [ ] *Case #04 (Svalbard / Arctic):* Polar amplification & rapid surface warming benchmark (`T2M`)
  - [ ] *Case #05 (Niamey / Sahel):* Semi-arid precipitation variability & soil moisture stress (`PRECTOTCORR` / `GWETROOT`)
- [ ] **(Higor & Luis)** Research regional impact context for the 5 Case Studies (agriculture/water/health in Rondônia + global relevance) to enrich UI captions and pitch narrative
- [ ] **(Higor & Luis)** Write timed **30-Second Global Video Script (EN)** in `docs/submission/video-script-30s.md` (0–5s Hook, 5–15s Live Map/Chart Demo, 15–25s Mann-Kendall/Sen's Slope Proof, 25–30s Impact)
- [ ] **(Higor & Luis)** Write **3-Minute Local Pitch Script (PT-BR)** in `docs/submission/pitch-script-pt.md` and build the 5–7 slide deck structure
- [ ] **(Higor & Luis)** Draft all **NASA Portal Submission Fields (EN)** in `docs/submission/nasa-portal-copy.md` (Summary, How It Works, NASA Data Used, Goals)

---

## 🗺️ Phase 2: "EarthTrend Detective" Noir Office UI, Map & Localization (Sat–Sun Morning)
*Goal: Memorable first-person Detective Office UX (no character/avatar — the user IS the detective using real NASA data & math tools) before Sunday 09:00 UI Freeze.*

- [ ] **(Mylena)** Build Noir Header with **"EarthTrend Detective"** branding, room navigation (`Evidence Corkboard` | `Detective Desk` | `Top Secret Manual`), and language switcher `[ 🇺🇸 EN | 🇧🇷 PT ]`
- [ ] **(Mylena)** Implement automatic language detection (`localStorage` -> `navigator.language` -> `'en'` fallback)
- [ ] **(Mylena)** Build **The Evidence Corkboard**: pinned preset case cards connected by SVG red yarn/lines; clicking a pinned card brings the case forward into foreground focus while dimming/blurring the background (auto-opening **Case #01 Vilhena** on initial load with 1-click return to Corkboard)
- [ ] **(Mylena)** Build **The Messy Detective Desk (New Case Search)**: cluttered desk-paper aesthetic with a **"Case Intake Paper Form"** at the top (type city/place name or coordinates + variable/season/year filters) and the **Forensic Report, Recharts & compact Leaflet dark-noir map pin** appearing on aged-paper dossier sheets directly below (supporting click-on-map adjustment too, no heavy 3D globe)
- [ ] **(Mylena)** Build **Top Secret / Classified Methodology Manual**: declassified folder view explaining **NASA POWER / MERRA-2** data, **Mann-Kendall**, and **Sen's Slope** formulas
- [ ] **(Mylena)** Build forensic tool controls: environmental variable selector (`T2M`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT`), season selector (`Annual` / `Oct–Mar` / `Apr–Sep`), and year-range controls
- [ ] **(Mylena)** Render interactive **Recharts** time-series chart with Sen's Slope trendline, decadal delta, and anomaly highlights on aged-paper/noir forensic styling
- [ ] **(Mylena)** Build the **"Forensic Case Dossier"** card with rubber-stamp verdict (`PROVEN TREND` vs `NO SIGNIFICANT TREND`), explicit `NASA POWER / MERRA-2` badge, and the 4 challenge answers:
  1. *What is changing?*
  2. *Where is it changing?*
  3. *By how much?*
  4. *Is it statistically significant?*
- [ ] **(Mylena)** Add "Save & Share Dossier" modal/button with optional investigator note and shareable `/dossier/:id` route
- [ ] **(Kauê & Mylena)** Connect frontend UI to `/api/investigate` and `/api/dossiers` endpoints, test loading/error states, and hit **C3 UI Freeze (Sun 09:00)** for Higor & Luis

---

## 🎬 Phase 3: Polish, Production Deploy, 30s Video & Pitch Prep (Sun 09:00–15:00)
*Goal: Complete all deployment and media assets before Sunday 14:00 Code Freeze and 15:00 local deadline.*

- [ ] **(Higor & Luis)** Attend HUBEE **Pitch Workshop (Sun 09:00–09:45)** and refine slides/delivery
- [ ] **(Higor & Luis)** Capture **4–7 high-resolution UI screenshots (in English)** after UI Freeze for NASA portal & slides
- [ ] **(Higor & Luis)** Record and edit the **Official 30-Second Pitch Video** (strictly `<= 30s`, English audio or PT-BR audio with hardcoded/CC English subtitles)
- [ ] **(Higor & Luis)** Upload 30s video to YouTube (`Public` or `Unlisted`) on stable venue Wi-Fi and verify playback
- [ ] **(Higor & Luis)** Finalize 5–7 slide deck in **PDF (PT-BR)** and save an **offline copy + offline demo/video backup** on the stage laptop
- [ ] **(Higor & Luis & Stage Rep)** Rehearse the timed 3-minute local pitch at least 2 times
- [ ] **(Kauê)** Promote `dev -> main`, deploy live demo to **Cloudflare Pages** (`*.pages.dev`) with D1 bound, and verify in incognito window (**C4 Code Freeze Sun 14:00**)
- [ ] **(Kauê)** Finalize `README.md` with screenshots, live demo URL, architecture overview, and explicit NASA dataset citations

---

## 🏁 Phase 4: Local Pitch & Official NASA Submission (Sun Afternoon/Night)
- [ ] **(All)** Submit local HUBEE deliverables (PDF slides + project link) between **15:00 and 15:30 UTC-4**
- [ ] **(Stage Rep + Higor & Luis)** Deliver the 3-minute local pitch at HUBEE (**15:30–17:00 UTC-4**, 1 representative on stage, Art. 6.2)
- [ ] **(All 4 Members)** Jointly verify public GitHub repo, live Cloudflare Pages URL, YouTube 30s video, screenshots, and English project fields, then submit on the NASA Space Apps portal before **Sunday 21:30 UTC-4**
