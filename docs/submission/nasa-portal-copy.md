# 🌐 Official NASA Space Apps Portal Submission Copy (`nasa-portal-copy.md`)

> **Challenge:** `Be An Earth System Trend Detective!`  
> **Project Title:** `GeoTrend: Forensic Climate Trend Analysis with Statistical Rigor`  
> **Live Application:** `https://geotrend.earth`  
> **Language:** English (Required for Global Judging)

---

## 1. High-Level Project Summary (Short Summary — Max 250 characters)

A Dark Editorial climate forensics workbench turning 45 years of NASA POWER/MERRA-2 data (1981–2025) into statistically verified trend dossiers via seasonal stratification, Mann-Kendall tests, Sen's Slope, FDR scans, and MODIS satellite comparisons.

---

## 2. Project Details — What Does It Do?

**GeoTrend** transforms raw, complex Earth observation time series into clear, statistically rigorous forensic case files. Designed around a clean **Dark Editorial Investigative Interface** paired with high-contrast archival shareable Evidence Cards, the platform empowers farmers, educators, students, journalists, and policymakers to investigate whether local environmental shifts are temporary weather noise or **statistically significant long-term trends**.

For every investigation, the platform answers the four core questions of the **"Be An Earth System Trend Detective!"** challenge:
1. **What is changing?** Users investigate four essential Earth system variables from NASA POWER / MERRA-2 (`1981–2025`):
   - **2m Mean Temperature (`T2M`, `°C`)**
   - **2m Minimum Night-Time Temperature (`T2M_MIN`, `°C`)**
   - **Corrected Total Precipitation (`PRECTOTCORR`, `mm`)**
   - **Root-Zone Soil Wetness Index (`GWETROOT`, `0–100%`)**
2. **Where is it changing?**
   - **4 Pre-Computed Forensic Case Files + 20-Case Paginated Catalog:** Grounded offline-first in the Amazon–Cerrado transition of Rondônia (`Vilhena`, `Ariquemes`) and Brazil's Pantanal wetland (`Corumbá`), contrasted globally against High Arctic polar amplification (`Svalbard`), plus 16 additional regional/global cases (`20` curated cases total) with paginated search & filtering (`#cases`).
   - **Live Global Investigation + 3-Stage AI Copilot:** Ask questions in natural language (`EN | PT-BR`) via our 3-stage AI pipeline (`AI Filters` → `NASA POWER + Mann-Kendall + BH FDR` → `AI Synthesis`, with Cloudflare D1 cooldowns/cache and a deterministic offline client-side fallback), or manually search any municipality, adjust seasonal windows/year spans (`°C | °F`), click coordinates on a Leaflet map, inspect side-by-side **NASA MODIS Before vs. After (`2000` vs. `2025`)** imagery, and scan `/explore` (**Your Timeline**) for a Wrapped-style climate story since your birth year.
3. **By how much is it changing?** Quantified via the non-parametric **Theil–Sen Estimator (Sen's Slope)**, reporting both the **total shift over the 45-year period** and the **decadal rate of change**, immune to single-year extreme outliers.
4. **Is the change statistically "significant"?** Verified via the **two-sided Mann-Kendall Trend Test** ($S$ statistic, tie-corrected variance, $Z$-score, and $p$-value), stamping each dossier with an evidence-based verdict:
   - **`STRONG EVIDENCE`** ($p < 0.01$, $\ge 99\%$ confidence)
   - **`EVIDENCE CONFIRMED`** ($p < 0.05$, $\ge 95\%$ confidence)
   - **`INSUFFICIENT EVIDENCE`** ($p \ge 0.05$ — indistinguishable from natural variability/noise)

---

## 3. How It Works — Scientific & Software Architecture

### Addressing the Core Challenge Complexity: Removing Regular Seasonal Cycles
A major pitfall in Earth science trend detection is running regression across raw monthly values, where regular seasonal cycles (wet vs. dry seasons) create artificial oscillations. **GeoTrend** solves this through **Seasonal Window Stratification**:
- Before any statistical test is executed, raw monthly NASA POWER readings (`YYYYMM`) are filtered for `-999` missing-value sentinels and aggregated into homologous interannual windows: **Annual (`Jan–Dec`)**, **Austral Wet Season (`Oct–Mar`, labeled `2024/25`)**, or **Austral Dry Season (`Apr–Sep`)**.
- Incomplete seasons are strictly dropped, and a minimum span of **15 complete years** is enforced.
- Physical units are preserved with exact calendar math: `PRECTOTCORR` daily rates (`mm/day`) are multiplied by exact days in each month (accounting for leap years) and summed into total `mm`; `GWETROOT` (`0–1`) is scaled to `0–100%`.

### Non-Parametric Forensic Engine (TDD-Verified)
1. **Mann-Kendall Trend Test:** Computes all pairwise sign differences across the stratified annual/seasonal series, applies tie-group variance correction, and derives the standard normal $Z$-score and two-sided $p$-value.
2. **Sen's Slope Estimator:** Calculates the median of all pairwise slopes $(y_j - y_i)/(t_j - t_i)$ to fit a robust trendline and compute decadal and full-period deltas.
3. **Standardized Anomaly Detection & 4-Format Academic/Social Share Studio:** Computes full-period mean and standard deviation, flagging extreme anomaly years ($|z| > 1.5$) on the time-series chart and exporting *Show Your Stripes*-inspired **Evidence Cards** across **Story (`9:16`)**, **Square (`1:1`)**, **Slide (`16:9`)**, and high-contrast **Paper / Article** PNGs—plus raw `CSV`, one-click citations (**Summary**, **ABNT NBR 6023**, **APA**, **BibTeX**), shareable NASA GIBS satellite mosaics, and permanent `/dossier/:id` links.
4. **Scientific Guardrail (`Correlation ≠ Causation`):** The built-in **Methods Page (`07. Scientific Limitations & Interpretation Guardrails`)**, AI synthesis safeguards, and dossier microcopy explicitly educate users that statistical trend significance proves a consistent directional shift in observed data—not single-cause attribution—and explain MERRA-2 grid resolution (~50 km) alongside regional contrasts.

### Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, custom SVG multi-view chart (`Line + Sen's Trend` / `Seasonal Bars` / `Climate Stripes`), Leaflet (`react-leaflet`), HTML5 Canvas PNG generator (`EvidenceCard`, `BirthdayCard`, `satelliteExport`), custom **GeoTrend** SVG/PNG visual kit (`public/brand/`), native `EN | PT-BR` internationalization, and `°C | °F` unit toggle.
- **Backend & Edge Cache:** Cloudflare Workers + Static Assets (`Hono`) + **Cloudflare D1 (SQLite)** caching NASA POWER responses by rounded coordinate (`0.5° × 0.625°`), storing structured shareable dossiers (`/dossier/:id` with paginated listing), and managing adaptive Gemini AI caching/cooldowns (`ai_cache`, `ai_model_cooldowns`) with transparent client-side deterministic fallback.
- **Quality Assurance:** **127 automated unit and integration tests across 19 Vitest suites** (TDD covering statistics, `-999` filtering, AI cascade/fallback, academic/satellite exports, pagination, i18n & Workers API) plus **Biome** and strict **TypeScript**.

---

## 4. Key Real Findings from Our 4 Preset Investigations (`1981–2025`, `n = 45` Years)

| Case | Scale | Location | Variable (Window) | Verdict | Mann-Kendall `p` | Sen's Slope / Decade | Total Shift (`1981–2025`) |
|---|---|---|---|---|---|---|---|
| **#01** | **Local (Host City)** | **Vilhena, RO, Brazil** | `PRECTOTCORR` (`Apr–Sep` Dry Season) | `STRONG EVIDENCE` | `0.000131` | `-53.29 mm/decade` | **`-234.46 mm`** |
| **#02** | **State (Rondônia)** | **Ariquemes, RO, Brazil** | `T2M_MIN` (`Annual`) | `STRONG EVIDENCE` | `0.000001` | `+0.41 °C/decade` | **`+1.82 °C`** |
| **#03** | **National (Brazil)** | **Corumbá (Pantanal), MS, Brazil** | `GWETROOT` (`Annual`) | `STRONG EVIDENCE` | `0.000024` | `-1.27 pts/decade` | **`-5.60 pts (%)`** |
| **#04** | **Global (World)** | **Svalbard, Arctic** | `T2M` (`Annual`) | `STRONG EVIDENCE` | `< 0.000001` | `+0.79 °C/decade` | **`+3.50 °C`** |

---

## 5. Local & Global Impact (*Missão Amazônia* & UN SDGs)

Developed in **Vilhena, Rondônia** (at the ecological transition between the Brazilian Cerrado and the Amazon Rainforest), **GeoTrend** directly addresses regional sustainability and global climate literacy:
- **Agricultural & Water-Resource Adaptation (SDG 6 & SDG 13):** Proves quantitatively that Vilhena's dry season (`Apr–Sep`) has lost **234.46 mm** of rainfall since 1981 while annual root-zone soil wetness in Corumbá (Pantanal) fell **5.60 percentage points** and minimum night-time temperature in Ariquemes rose **+1.82 °C**, equipping farmers and civil defense planners with empirical evidence for crop-window and water adaptation.
- **Ecosystem Conservation & Environmental Education (SDG 15):** Designed for immediate classroom and research adoption, pairing NASA climate forensics with regional land-cover context (*MapBiomas*) and plain-language methodology files.

---

## 6. Space Agency Data & External Resources Used

1. **NASA POWER API (`temporal/monthly/point` — MERRA-2 Assimilation Model):**
   - **URL:** `https://power.larc.nasa.gov/api/temporal/monthly/point`
   - **Usage:** Primary climatology data source (`1981–2025`) for `T2M`, `T2M_MIN`, `PRECTOTCORR`, and `GWETROOT`.
2. **NASA GIBS (Global Imagery Browse Services) / NASA Worldview WMTS (MODIS Terra):**
   - **URL:** `https://earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs`
   - **Usage:** Visual satellite comparison layers (`MODIS_Terra_CorrectedReflectance_TrueColor` Aug 29 and `MODIS_Terra_L3_NDVI_Monthly` Aug 01, `2000–2025`).
3. **NASA Earthdata & NASA Giovanni:**
   - **URL:** `https://earthdata.nasa.gov/tools/giovanni`
   - **Usage:** Reference Earth science variable catalog and cross-verification benchmark recommended by the challenge brief.
4. **Open-Meteo Geocoding API:**
   - **URL:** `https://geocoding-api.open-meteo.com/v1/search`
   - **Usage:** Resolves municipality names into geographic coordinates `(lat, lon)` for live global investigations.
