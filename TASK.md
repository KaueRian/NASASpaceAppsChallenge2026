# 📋 Task Board — EarthTrend Detective (`TASK.md`)

> **Challenge:** `Be An Earth System Trend Detective!` (NASA Space Apps Challenge 2026 — Vilhena, RO, Brazil)  
> **Repository:** `KaueRian/NASASpaceAppsChallenge2026`  
> **Tech Stack:** React + Vite + Tailwind CSS + Leaflet + Recharts | Cloudflare Pages & Pages Functions (Hono + TypeScript) | Cloudflare D1 (SQLite)  
> **Developers:** **Kauê** (`Dev 1 — Backend, NASA Data & Stats`) & **Teammate** (`Dev 2 — Frontend, Map, Charts & i18n`)

---

## 🤝 Multi-Dev Collaboration & Git Workflow
1. **Task-Driven Rule:** Every code, doc, or config change—no matter how small—must map to a task in this file. If a task does not exist yet, add it here before starting work.
2. **Status Legend:**
   - `[ ]` Pending
   - `[~] (<Name>)` In progress (claim it before editing!)
   - `[x]` Done
3. **Branching & PR Flow (Zero Conflict):**
   - `main` is always clean and deployable (connected to Cloudflare Pages).
   - Work on short-lived feature branches (`feat/stats-engine`, `feat/map-ui`, etc.), then merge into `main`.
   - Separate file ownership: `Kauê` owns `functions/api/`, `db/`, and `tests/`; `Dev 2` owns `src/components/`, `src/locales/`, and `src/pages/`. Both share `src/types/investigation.ts`.
4. **English Only:** Keep all tasks, code, comments, docs, and commit messages in English.

---

## 🚀 Phase 0: Setup & Pre-Event
- [x] **(Kauê)** Initialize Git repository and push to GitHub via HTTPS (`KaueRian/NASASpaceAppsChallenge2026`)
- [x] **(Kauê)** Create repository governance files (`TASK.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`, English `README.md`)
- [x] **(Both)** Finalize architecture & stack (Cloudflare Pages + Hono + D1 SQLite + React/Vite/Tailwind + Leaflet + Recharts)
- [ ] **(Kauê)** Scaffold single-project structure (`package.json`, Vite + React + Tailwind, Wrangler/Pages Functions, Vitest)
- [ ] **(Kauê)** Define shared TypeScript API contract in `src/types/investigation.ts` (Request/Response types for both devs)
- [ ] **(Kauê)** Configure Cloudflare D1 schema (`d1/schema.sql`) for NASA API cache and shareable Dossiers
- [ ] **(Kauê)** Smoke-test **NASA POWER API** historical endpoint for Vilhena (`lat=-12.74, lon=-60.14`)
- [ ] **(Dev 2)** Set up dark investigative UI theme and i18n dictionaries (`src/locales/en.json`, `src/locales/pt.json`)

---

## 🔬 Phase 1: Data Ingestion & Statistical Forensics Engine (`functions/api/` & `tests/`)
*Goal: Guarantee scientific rigor for NASA's `Validity` and `Best Use of Science` criteria.*

- [ ] **(Kauê)** Build **NASA POWER API** historical fetcher (1981–present: `T2M`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT`)
- [ ] **(Kauê)** Implement Cloudflare D1 caching layer so repeated or preset queries return in <50ms
- [ ] **(Kauê)** Implement **Sen's Slope Estimator** (annual/decadal rate of change) in TypeScript
- [ ] **(Kauê)** Implement **Mann-Kendall Trend Test** (S-statistic, Z-score, p-value for 95%/99% significance) in TypeScript
- [ ] **(Kauê)** Write Vitest unit tests verifying Mann-Kendall and Sen's Slope math against known reference datasets
- [ ] **(Kauê)** Implement `POST /api/dossiers` and `GET /api/dossiers/:id` in Hono + D1 for shareable public links
- [ ] **(Kauê)** Prepare **3 Pre-loaded Regional Case Studies (Rondônia / Brazil)**:
  - [ ] *Case #01:* Rainy season onset / precipitation shift in Vilhena (Southern Cone of Rondônia)
  - [ ] *Case #02:* Extreme drought & soil wetness trend in the Madeira River Basin (Porto Velho)
  - [ ] *Case #03:* Rising tropical night minimum temperatures (`T2M_MIN`) in Ariquemes / RO

---

## 🗺️ Phase 2: "EarthTrend Detective" UI, Map & Localization (`src/`)
*Goal: Engaging investigative UX, interactive dark map, and seamless bilingual support.*

- [ ] **(Dev 2)** Build Header with **"EarthTrend Detective"** branding and language switcher `[ 🇺🇸 EN | 🇧🇷 PT ]`
- [ ] **(Dev 2)** Implement automatic language detection (`localStorage` -> `navigator.language` -> `'en'` fallback)
- [ ] **(Dev 2)** Integrate **Leaflet (`react-leaflet`)** with CartoDB Dark Matter tiles + click-to-investigate anywhere on Earth
- [ ] **(Dev 2)** Add preset Case Study pins on the map (Vilhena, Porto Velho, Ariquemes)
- [ ] **(Dev 2)** Build environmental variable selector (`T2M`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT`) and year-range controls
- [ ] **(Dev 2)** Render interactive **Recharts** time-series chart with Sen's Slope trendline and anomaly highlights
- [ ] **(Dev 2)** Build the **"Investigative Dossier / Forensic Report"** card answering the 4 challenge questions:
  1. *What is changing?*
  2. *Where is it changing?*
  3. *By how much?*
  4. *Is it statistically significant? ("Proven Trend" vs. "No Significant Trend" badge)*
- [ ] **(Both)** Connect frontend UI to `/api/investigate` and `/api/dossiers` endpoints

---

## 🎬 Phase 3: Polish, 30s Video & Local Pitch
*Goal: Complete all submission assets before Sunday 14:00 local departure!*

- [ ] **(Kauê)** Deploy live demo to **Cloudflare Pages** (`*.pages.dev`) with D1 bound and verify in incognito window
- [ ] **(Kauê)** Finalize `README.md` with screenshots, live demo URL, and explicit NASA dataset citations
- [ ] **(Dev 2)** Prepare local pitch slide deck in PDF (5–7 slides in PT-BR for the 3-minute HUBEE presentation)
- [ ] **(Both)** Record and edit the **Official 30-Second Pitch Video** (max **30s**, English audio or PT-BR audio with mandatory English subtitles)
- [ ] **(Kauê)** Upload 30s video to YouTube (Public or Unlisted) while on stable venue Wi-Fi
- [ ] **(Both)** Draft complete project submission fields on the NASA Space Apps portal (in English)

---

## 🏁 Phase 4: Presentation & Official Submission
- [ ] Present local 3-minute pitch in Vilhena (1 representative on stage, Art. 6.2)
- [ ] Submit final project on the NASA Space Apps portal before **Sunday 21:30 UTC-4** (with all links verified)
