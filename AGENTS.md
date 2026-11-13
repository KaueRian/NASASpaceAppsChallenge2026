# 🤖 AI Agent Operating Guide (`AGENTS.md`)

This repository (`NASASpaceAppsChallenge2026`) hosts the **EarthTrend Detective** software for the **NASA Space Apps Challenge 2026** (`Be An Earth System Trend Detective!` — Vilhena, RO, Brazil).

---

## 🎯 Core Rules (Mandatory for All Agents & Developers)

### 1. `TASK.md` Is the Single Guide for Work
- **Always read [`TASK.md`](TASK.md) before starting any task.**
- **Every change—no matter how minimal—MUST correspond to a task in `TASK.md`.**
  - If no task exists for the change you are about to make, **add a new task to `TASK.md` first** before writing code or modifying files.
  - Mark the task as `[~] (<YourName/Agent>)` while in progress and `[x]` upon completion.
- Respect task ownership so the two developers do not collide on the same files.

### 2. English-Only Repository Standard
- **Everything in this repository MUST be in English:**
  - Source code, variable/function names, type definitions, and inline comments
  - Documentation (`README.md`, `TASK.md`, `AGENTS.md`, `CLAUDE.md`)
  - Git commit messages, branch names, and Pull Request descriptions
- *(Exception: The application UI itself supports both `en` and `pt` via i18n dictionaries, and local Vilhena pitch slides may be exported in PT-BR).*

### 3. Git & GitHub Best Practices
- **Branching:** Prefer short-lived feature branches (`feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`) or clearly separated module ownership when working in parallel.
- **Conventional Commits:** Always use clear, lowercase Conventional Commit messages in English:
  - `feat: add Mann-Kendall statistical significance test`
  - `fix: handle missing values in NASA POWER API response`
  - `docs: update TASK.md with unit test milestone`
  - `test: add reference dataset tests for Sen's Slope`
  - `chore: configure Tailwind dark theme`
- **Atomic Commits:** Keep commits focused and small. Update `TASK.md` in the same commit (or immediately alongside) when completing a task.
- **Security & Hygiene:** Never commit `.env`, `.env.local`, API keys, `node_modules/`, build outputs, or temporary scrape dumps. Keep `.gitignore` clean.

---

## 🛠️ Engineering & Hackathon Standards
1. **KISS (48-Hour Hackathon Speed):** Favor simple, clean, modular code that ships fast and works reliably in a live demo. Avoid over-engineering.
2. **Real NASA Data Only:** Never ship mocked data as final output. Integrate real NASA open datasets (**NASA POWER API**, **GISTEMP**, **SMAP**, **MODIS AOD**) and cite them explicitly.
3. **Scientific Rigor (`Validity`):** The statistical engine (**Mann-Kendall** & **Sen's Slope**) MUST have unit tests verifying correctness against known mathematical baselines.
4. **Native Bilingual UI (`EN` / `PT-BR`):** Auto-detect browser language (`localStorage` -> `navigator.language` -> `'en'` fallback) and expose a visible toggle in the header.
