# 📋 Master Task Board & Single Source of Truth (`TASK.md`)

> **Challenge:** `Be An Earth System Trend Detective!` (NASA Space Apps Challenge 2026 — Vilhena, RO, Brazil)  
> **Project Name:** **EarthTrend Detective**  
> **Official Team Name / ID:** `TBD — Fill on Saturday morning`  
> **Repository:** `KaueRian/NASASpaceAppsChallenge2026`  
> **Slides / Media Workspace (Canva / Drive):** `TBD — Add link here`  
> **Stage Representative (Art. 6.2 — 1 person on stage):** `TBD — Decide Saturday morning`  
> **Tech Stack:** React + Vite + Tailwind CSS + Recharts + Leaflet | Cloudflare Workers + Static Assets (Hono + TypeScript) | Cloudflare D1 (SQLite) | Biome + Vitest + GitHub Actions  
> **Design Spec:** [`DESIGN.md`](DESIGN.md) · **Concept mockups:** [`docs/concepts/`](docs/concepts/)

---

## 👥 Team Roster & Ownership
| Member | Role | Owned Paths / Assets |
|---|---|---|
| **Kauê** (`Dev 1`) | Stats engine, NASA data, API, D1, CI/Deploy, **Evidence Card & Share flow** | `src/lib/`, `scripts/`, `src/worker/`, `d1/`, `tests/`, `.github/`, `wrangler.jsonc`, `src/components/share/` |
| **Mylena** (`Dev 2`) | Frontend UI: Case Board, Dossier, New Investigation, Methods File layout, i18n wiring | `src/components/` (except `share/`), `src/pages/`, `src/styles/` |
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
| **R0 — Foundation** | Sat 11:00 | Live URL with the noir shell (header, tabs, EN/PT) |
| **R1 — Minimum Shippable Detective** ⭐ | Sat 17:00 | Case Board with 4 real NASA cases + full Forensic Dossier (verdict, stamp, chart, 4 answers). **Works offline (static data).** |
| **R2 — Live Investigation** | Sat 23:30 | + Investigate any place on Earth (search/map → live NASA POWER → dossier) |
| **R3 — Showtime** | Sun 08:30 | + Opening animation, stamp slam, didactic loader, Evidence Card PNG + Share link, mobile layout |
| — **UI Freeze** | Sun 09:00 | Higor & Luis capture screenshots & record the 30s video |
| **R4 — Credibility & Extras** | Sun 13:30 | + Methods File, OG image, extras (Could items) |
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
3. **Branching (`feature/*` -> `dev` -> `main`):** never commit directly to `main`; `main` only receives release merges from `dev`.
4. **TDD** for critical logic (stats, aggregation, `-999` filtering, validation) — see [`AGENTS.md`](AGENTS.md).
5. **Local Dev:** `npm` (Node 20+) + `wrangler dev` + local D1 (no Cloudflare login needed for Mylena).
6. **English only in repo** (UI strings live in `src/locales/en.json` and `src/locales/pt.json`; `docs/submission/` may contain the PT-BR pitch script).

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
- [ ] **(All)** Confirm all 4 members on the same NASA Space Apps Team ID; fill Team Name above
- [ ] **(All)** Decide the stage representative (Art. 6.2)
- [x] **(Kauê)** Invite Mylena, Higor & Luis as collaborators on `KaueRian/NASASpaceAppsChallenge2026`
- [x] **(Kauê)** Scaffold project (`package.json`, Vite + React + TS + Tailwind, Hono Worker, `wrangler.jsonc`, Vitest, Biome)
- [x] **(Kauê)** Migrate from legacy Cloudflare Pages Functions to **Cloudflare Workers + Static Assets** (`src/worker/index.ts`)
- [x] **(Kauê)** GitHub Actions CI (`.github/workflows/ci.yml`): Biome, `tsc --noEmit`, `vitest` on PRs to `dev`/`main`
- [x] **(Kauê)** Create Cloudflare Worker (`nasaspaceappschallenge2026`) connected to GitHub and deploy the shell to production
- [x] **(Kauê)** Define shared contract `src/types/investigation.ts` (variables, seasons, series point, trend result, verdict enum, case preset, dossier)
- [ ] **(Mylena)** Tailwind tokens (`room`, `board`, `paper`, `ink`, `brass`, `evidence`, direction colors), 3 fonts, paper/board textures
- [ ] **(Mylena)** `<AppHeader />` with 3 tabs + `<LanguageToggle />` (`EN | PT`, auto-detect) + i18n setup (`en.json`, `pt.json`)
- [ ] **(Higor & Luis)** Review NASA judging criteria + HUBEE rules; create `docs/submission/` and the Canva/Drive workspace
- [ ] **(Kauê)** 🚀 **Release R0:** merge `dev -> main`, deploy, smoke test

## ⭐ R1 — Minimum Shippable Detective (target Sat 17:00)
*Static, real NASA data for the 4 cases. No runtime backend needed → the demo survives venue Wi-Fi failures.*
- [x] **(Kauê)** TDD: `-999` filtering + monthly → Annual / Oct–Mar (`2024/25` labels) / Apr–Sep aggregation with correct units (`PRECTOTCORR` = monthly mm/day × days summed; `GWETROOT` × 100) in `src/lib/`
- [x] **(Kauê)** TDD: **Mann-Kendall** (S, variance with ties, Z, two-sided p) in `src/lib/stats/`
- [x] **(Kauê)** TDD: **Sen's Slope** (per year, per decade, total change over period) + anomalies vs full-period mean (|z| > 1.5) + verdict enum (`STRONG` p<0.01 / `CONFIRMED` p<0.05 / `INSUFFICIENT`)
- [x] **(Kauê)** Script `scripts/build-presets.ts`: fetch NASA POWER `temporal/monthly/point` for the 4 cases, run the engine, write `src/data/presets/*.json` (with retrieval date)
- [x] **(Kauê)** Run the 4 cases with real data and report verdicts to the team; swap/reorder cases if needed (strongest = #01, max 1 inconclusive)
- [ ] **(Higor & Luis)** Write final case hooks + all dossier microcopy and verdict sentence templates (EN + PT) in `src/locales/`, based on the real verdicts
- [ ] **(Mylena)** `<CaseBoard />` + 4 `<CaseCard />` + `<YarnLayer />` (cards linked to each other), focus mode (dim + blur, `Esc`, Back), mobile vertical stack
- [ ] **(Mylena)** `<ForensicDossier />` on paper: verdict sentence, `<VerdictStamp />` (static), 4 answers with units, `<MiniMap />` (static SVG), NASA attribution badge
- [ ] **(Mylena)** `<TrendChart />` (Recharts on paper): `ink` series, dashed `evidence` Sen's line, `brass` anomaly dots, axis units
- [ ] **(Mylena)** Auto-open Case #01 on load (no animation yet) + deep link `/?case=0X`
- [ ] **(Kauê)** 🚀 **Release R1:** merge `dev -> main`, deploy, test in incognito **and with network throttled**

## 🔎 R2 — Live Investigation (target Sat 23:30)
- [ ] **(Kauê)** Create Cloudflare D1 (`earthtrend-db`) + `d1/schema.sql` (`nasa_cache`, `dossiers`) and bind it in `wrangler.jsonc`
- [ ] **(Kauê)** `GET /api/investigate` (Hono): NASA POWER fetch with timeout/retry, D1 cache keyed by `(round(lat,2), round(lon,2), variable)`, reuse `src/lib/` engine, min 15 years validation
- [ ] **(Kauê)** `GET /api/geocode` (Open-Meteo Geocoding wrapper, max 5 results)
- [ ] **(Kauê)** TDD: request validation (coordinate bounds, allowed variables/seasons, year range)
- [ ] **(Mylena)** `New Investigation` screen: desk layout (clutter at edges only), `<IntakeForm />`, `<LocationSearch />` (autocomplete + pasted `lat, lon`), `<PickerMap />` (Leaflet, sepia-filtered tiles)
- [ ] **(Mylena)** Render `<ForensicDossier />` below the form from `/api/investigate`; error states (NASA down, all `-999`, no geocode result, invalid coords) + empty states
- [ ] **(Mylena)** "Derived investigation" mode when variables/season change on a preset, with `Restore original case`
- [ ] **(Higor & Luis)** Copy for all error/empty states and form labels (EN + PT)
- [ ] **(Kauê)** 🚀 **Release R2:** merge `dev -> main`, deploy, test live searches (Manaus, Cuiabá, Tokyo, ocean point)

## 🎬 R3 — Showtime (target Sun 08:30, before UI Freeze)
- [ ] **(Mylena)** Opening sequence (~1.5 s: pins drop, yarn draws, `START HERE` pulse → Case #01 opens) with `prefers-reduced-motion`
- [ ] **(Mylena)** Stamp slam animation on `<VerdictStamp />` + `<DidacticLoader />` (4 steps)
- [ ] **(Mylena)** Experimental `<PaperWorldMap />` in the board center with yarn to location pins (behind a flag; remove if cluttered)
- [ ] **(Mylena)** Mobile polish: bottom tab bar, dossier as full-screen sheet, no horizontal overflow
- [ ] **(Kauê)** `<ClimateStripes />` + `<EvidenceCard />` (Story 9:16 with stats, Square 1:1 minimal) + `Download PNG` (`html-to-image`)
- [ ] **(Kauê)** `POST /api/dossiers` + `GET /api/dossiers/:id` (structured fields only, no free text) + `/dossier/:id` read-only page with CTA
- [ ] **(Kauê)** `<ShareSheet />`: `Copy link` (auto-save), `Download PNG`, native `navigator.share` on mobile; deep link `/investigate?…`
- [ ] **(Higor & Luis)** Logo/wordmark, favicon, static OG image in `public/brand/`
- [ ] **(Kauê)** 🚀 **Release R3:** merge `dev -> main`, deploy → **UI Freeze Sun 09:00**

## 🗂️ R4 — Credibility & Extras (target Sun 13:30)
*Should first, then Could. Stop at 13:30 no matter what.*
- [ ] **(Mylena)** **Should:** `<MethodsFile />` binder (`01. NASA Data`, `02. Mann-Kendall`, `03. Sen's Slope`, `04. Limitations`) + contextual "How do we know?" links from the dossier
- [ ] **(Higor & Luis)** **Should:** Methods File text in plain language (EN + PT), including Limitations (MERRA-2 ~50 km grid, autocorrelation, short records)
- [ ] **(Kauê)** **Should:** OG meta tags (static image) for `/` and `/dossier/:id`
- [ ] **(Mylena)** **Could:** `REVIEWED` seal on opened cards (`localStorage`)
- [ ] **(Kauê)** **Could:** QR code + short URL on the Story Evidence Card
- [ ] **(Kauê)** **Could:** `GET /api/dossiers` "Recent Case Files" list (structured fields only) + drawer UI
- [ ] **(Kauê)** Add MIT `LICENSE`; finalize `README.md` (screenshots, live URL, architecture, NASA citations)
- [ ] **(Kauê)** Make repository public on GitHub and enable branch protection on `main` and `dev`
- [ ] **(Kauê)** 🚀 **Code Freeze Sun 14:00:** final `dev -> main` deploy, incognito + projector/TV test

**Won't (this hackathon):** 3D globe, daily data, extra NASA datasets, accounts/login, free-text notes.

---

## 🎤 Pitch, Video & Submission Track (Higor & Luis — runs in parallel)
- [ ] **(Higor & Luis)** Research regional impact context for the 4 cases (agriculture, water, health in Rondônia + Arctic relevance)
- [ ] **(Higor & Luis)** 30-second video script (EN) in `docs/submission/video-script-30s.md` (0–5s board intro, 5–15s case + stamp slam, 15–25s live search, 25–30s impact + share card)
- [ ] **(Higor & Luis)** 3-minute pitch script (PT-BR) in `docs/submission/pitch-script-pt.md` + 5–7 slide structure
- [ ] **(Higor & Luis)** Draft NASA portal fields (EN) in `docs/submission/nasa-portal-copy.md`
- [ ] **(Higor & Luis)** Attend HUBEE Pitch Workshop (Sun 09:00–09:45)
- [ ] **(Higor & Luis)** Capture 4–7 English UI screenshots after UI Freeze
- [ ] **(Higor & Luis)** Record/edit the 30s video (≤ 30s, EN audio or PT audio + EN subtitles) and upload to YouTube; verify playback
- [ ] **(Higor & Luis)** Final PDF slides (PT-BR) + offline copy of slides, demo video and screenshots on the stage laptop
- [ ] **(Higor & Luis + Stage Rep)** Rehearse the 3-minute pitch at least twice
- [ ] **(All)** Submit local HUBEE deliverables (15:00–15:30)
- [ ] **(Stage Rep)** Deliver the 3-minute pitch (15:30–17:00)
- [ ] **(All 4)** Verify repo, live URL, video, screenshots, English fields → submit on the NASA portal before Sun 21:30
