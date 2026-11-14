# 🕵️‍♂️ EarthTrend Detective

Official repository for the **2026 NASA International Space Apps Challenge** (**Vilhena, Rondônia, Brazil**), competing in the **`Be An Earth System Trend Detective!`** challenge.

---

## 🎯 Overview
**EarthTrend Detective** is a first-person climate and environmental forensics workbench styled after an Old New York Noir detective office. It enables investigators, farmers, students, and decision-makers to examine any location on Earth using decades of open NASA climatology data (`1981–2025`), determining:
1. **What** is changing? *(Mean Temperature `T2M`, Minimum Temperature `T2M_MIN`, Precipitation `PRECTOTCORR`, Root-Zone Soil Wetness `GWETROOT`)*
2. **Where** is it changing? *(Regional Rondônia & Global case dossiers + custom city/coordinate search)*
3. **By how much?** *(Annual/decadal rate of change via Sen's Slope Estimator)*
4. **Is it statistically significant?** *(Non-parametric Mann-Kendall trend test with Z-score and p-value)*

---

## 🛰️ Data Sources & Scientific Guardrails
- **[NASA POWER API (MERRA-2 Climatology)](https://power.larc.nasa.gov/):** Official recommended dataset in the HUBEE Challenge Manual (`temporal/monthly/point`, `1981–2025`) providing `T2M`, `T2M_MIN`, `PRECTOTCORR`, and `GWETROOT`.
- **[NASA GIBS / Worldview WMTS](https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs):** Optional R4 visual satellite evidence layer (`MODIS_Terra_CorrectedReflectance_TrueColor` & `MODIS_Terra_NDVI_8Day`, `2000–2025`) powering the interactive year-by-year `<SatelliteTimelapse />` scrubber inside the dossier.
- **[Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api):** Resolves typed city/municipality names into coordinates `(lat, lon)`.
- **Correlation ≠ Causation:** Every forensic dossier and the `Methods File` explicitly distinguish **statistical trend significance** (Mann-Kendall / Sen's Slope) from single-cause physical attribution, and illustrate how different regions experience distinct rates or directions of change under global processes.

---

## 📊 Verified Preset Case Files (NASA POWER `1981–2025`, `n = 45` years)

| Case | Location | Variable (Season) | Verdict | Direction | Mann-Kendall `p` | Sen's Slope / Decade | Total Shift (`1981–2025`) |
|---|---|---|---|---|---|---|---|
| **#01** | **Vilhena, RO, Brazil** | `PRECTOTCORR` (`Apr–Sep`) | `STRONG_EVIDENCE` (99%) | Drier | `0.000131` | `-53.29 mm/decade` | **`-234.46 mm`** |
| **#02** | **Porto Velho, RO, Brazil** | `GWETROOT` (`Annual`) | `STRONG_EVIDENCE` (99%) | Drier | `< 0.000001` | `-3.24 pts/decade` | **`-14.26 pts (%)`** |
| **#03** | **Ariquemes, RO, Brazil** | `T2M_MIN` (`Annual`) | `STRONG_EVIDENCE` (99%) | Warming | `0.000001` | `+0.41 °C/decade` | **`+1.82 °C`** |
| **#04** | **Svalbard, Arctic** | `T2M` (`Annual`) | `STRONG_EVIDENCE` (99%) | Warming | `< 0.000001` | `+0.79 °C/decade` | **`+3.50 °C`** |

---

## 🌿 HUBEE *Missão Amazônia* & UN SDG Alignment
Aligned with the official Vilhena Challenge Manual (*Desafio #2 — Seja um detetive das tendências do sistema terrestre!*):
- **Brazilian Municipal Climate Panel (Starting in Vilhena, RO):** Directly implements Suggestion #2 from the local manual—allowing students, researchers, farmers, and citizens to inspect historical temperature, rainfall, and soil moisture starting in Vilhena and expanding to any Amazonian or global municipality.
- **Environmental Education & Territorial Research:** Designed for classroom use (`Methods File` plain-language explainers + downloadable *Show Your Stripes* Evidence Cards) and regional cross-analysis with land-cover data (*MapBiomas*).
- **Sustainable Development Goals (SDGs):**
  - **SDG 6 (Clean Water & Sanitation):** Precipitation (`PRECTOTCORR`) and root-zone water availability (`GWETROOT`).
  - **SDG 13 (Climate Action):** 45-year empirical trend evidence supporting local climate adaptation.
  - **SDG 15 (Life on Land):** Monitoring environmental conditions across the Cerrado–Amazon transition.

---

## 📋 Project Governance & Architecture
- **[`TASK.md`](TASK.md):** Single source of truth for all team tasks, HUBEE checkpoints, and module ownership.
- **[`DESIGN.md`](DESIGN.md):** Full Old NY Noir Detective Office UI/UX specification, color palette, 3-room layout, and *Show Your Stripes*-inspired Evidence Card rules.
- **[`AGENTS.md`](AGENTS.md) & [`CLAUDE.md`](CLAUDE.md):** Mandatory rules for AI assistants and developers (TDD, English-only repo, Conventional Commits).

### Git Workflow (`feature/*` -> `dev` -> `main`)
1. Check out the development branch: `git checkout dev && git pull origin dev`
2. Create a short-lived feature branch: `git checkout -b feat/<task-name>`
3. Implement with TDD (for critical logic), update `TASK.md`, and merge back into `dev` (`main` is strictly for tested production releases).

---

## 📄 License
Open-source under the MIT License (`LICENSE` file to be added prior to final submission).
