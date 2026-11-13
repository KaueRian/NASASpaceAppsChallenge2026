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

## 🛰️ Data Sources
- **[NASA POWER API (MERRA-2 Climatology)](https://power.larc.nasa.gov/):** Primary source (`temporal/monthly/point`, 1981–present) providing `T2M`, `T2M_MIN`, `PRECTOTCORR`, and `GWETROOT`.
- **[Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api):** Resolves typed city/region names into coordinates `(lat, lon)`.

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
