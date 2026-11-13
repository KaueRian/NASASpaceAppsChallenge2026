# 📋 Task Board — EarthTrend Detective (`TASK.md`)

> **Challenge:** `Be An Earth System Trend Detective!` (NASA Space Apps Challenge 2026 — Vilhena, RO, Brazil)  
> **Repository:** `KaueRian/NASASpaceAppsChallenge2026`  
> **Developers:** **Kauê** (`Dev 1`) & **Teammate** (`Dev 2`)

---

## 🤝 Collaboration & Workflow Rules
1. **Task-Driven Rule:** Every code, doc, or config change—no matter how small—must map to a task in this file. If a task does not exist yet, add it here before starting work.
2. **Status Legend:**
   - `[ ]` Pending
   - `[~] (<Name>)` In progress (claim it before editing!)
   - `[x]` Done
3. **Avoid Conflicts:** Work on separate files/directories or separate feature branches (`feat/<topic>`).
4. **English Only:** Keep all tasks, code, comments, docs, and commit messages in English.

---

## 🚀 Phase 0: Setup & Pre-Event
- [x] **(Kauê)** Initialize Git repository and push to GitHub via HTTPS (`KaueRian/NASASpaceAppsChallenge2026`)
- [x] **(Kauê)** Create repository governance files (`TASK.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore`, English `README.md`)
- [ ] **(Both)** Finalize tech stack inside the repository (e.g., Next.js + Tailwind + Recharts/Leaflet, or FastAPI + Python)
- [ ] **(Kauê)** Register [NASA Earthdata Login](https://urs.earthdata.nasa.gov/) account
- [ ] **(Kauê)** Smoke-test **NASA POWER API** historical endpoint for Vilhena (`lat=-12.74, lon=-60.14`)
- [ ] **(Dev 2)** Scaffold initial app directory structure, dark investigative UI theme, and i18n dictionaries (`locales/en.json`, `locales/pt.json`)

---

## 🔬 Phase 1: Data Ingestion & Statistical Forensics Engine
*Goal: Guarantee scientific rigor for NASA's `Validity` and `Best Use of Science` criteria.*

- [ ] **(Kauê)** Build **NASA POWER API** historical data fetcher (1981–2026: Max/Min Temperature, Precipitation, Humidity)
- [ ] **(Kauê)** Implement **Sen's Slope Estimator** (annual/decadal rate of change)
- [ ] **(Kauê)** Implement **Mann-Kendall Trend Test** (Z-score and p-value for statistical significance)
- [ ] **(Kauê)** Write unit tests verifying Mann-Kendall and Sen's Slope math against known reference datasets
- [ ] **(Kauê)** Prepare **3 Pre-loaded Regional Case Studies (Rondônia / Brazil)**:
  - [ ] *Case #01:* Rainy season onset shift in Vilhena (Southern Cone of Rondônia)
  - [ ] *Case #02:* Extreme drought trend in the Madeira River Basin (Porto Velho)
  - [ ] *Case #03:* Rising tropical night minimum temperatures in Ariquemes / RO

---

## 🗺️ Phase 2: "EarthTrend Detective" UI, Map & Localization
*Goal: Engaging investigative UX, interactive globe/map, and seamless bilingual support.*

- [ ] **(Dev 2)** Build Header with **"EarthTrend Detective"** branding and language switcher `[ 🇺🇸 EN | 🇧🇷 PT ]`
- [ ] **(Dev 2)** Implement automatic language detection (`localStorage` -> `navigator.language` -> `'en'` fallback)
- [ ] **(Dev 2)** Integrate interactive map (Leaflet or Mapbox) allowing click-to-investigate on any coordinate worldwide
- [ ] **(Dev 2)** Build environmental variable selector (Temperature, Precipitation, Humidity) and date-range controls
- [ ] **(Dev 2)** Render interactive time-series chart with trendline and anomaly highlights (Recharts or Plotly)
- [ ] **(Both)** Connect frontend UI to the Data & Statistics Engine
- [ ] **(Dev 2)** Build the **"Investigative Dossier / Forensic Report"** card answering the 4 challenge questions:
  1. *What is changing?*
  2. *Where is it changing?*
  3. *By how much?*
  4. *Is it statistically significant? ("Proven Trend" vs. "No Significant Trend" badge)*

---

## 🎬 Phase 3: Polish, 30s Video & Local Pitch
*Goal: Complete all submission assets before Sunday 14:00 local departure!*

- [ ] **(Kauê)** Deploy live demo to production (Vercel / Streamlit Cloud) and verify in an incognito window
- [ ] **(Kauê)** Finalize `README.md` with screenshots, architecture diagram, live demo URL, and explicit NASA dataset citations
- [ ] **(Dev 2)** Prepare local pitch slide deck in PDF (5–7 slides in PT-BR for the 3-minute HUBEE presentation)
- [ ] **(Both)** Record and edit the **Official 30-Second Pitch Video** (max **30s**, English audio or PT-BR audio with mandatory English subtitles)
- [ ] **(Kauê)** Upload 30s video to YouTube (Public or Unlisted) while on stable venue Wi-Fi
- [ ] **(Both)** Draft complete project submission fields on the NASA Space Apps portal (in English)

---

## 🏁 Phase 4: Presentation & Official Submission
- [ ] Present local 3-minute pitch in Vilhena (1 representative on stage, Art. 6.2)
- [ ] Submit final project on the NASA Space Apps portal before **Sunday 21:30 UTC-4** (with all links verified)
