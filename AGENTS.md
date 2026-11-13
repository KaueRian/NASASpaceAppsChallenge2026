# 🤖 AI Agent Operating Guide (`AGENTS.md`)

This repository (`NASASpaceAppsChallenge2026`) hosts the **EarthTrend Detective** software for the **NASA Space Apps Challenge 2026** (`Be An Earth System Trend Detective!` — Vilhena, RO, Brazil).

---

## 🎯 Core Rules (Mandatory for All Agents & Developers)

### 1. `TASK.md` & `DESIGN.md` Are Mandatory Guides
- **Always read [`TASK.md`](TASK.md) before starting any task.**
- **Always read [`DESIGN.md`](DESIGN.md) before designing or editing any UI/UX or frontend component** (it holds the full Old NY Noir Detective Office aesthetic, color tokens, 3-room layout, and *Show Your Stripes* card specs so no context is lost across sessions).
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
- **Branching (`feature/*` -> `dev` -> `main`):**
  - **NEVER commit directly to `main` (or `dev`).**
  - Always create short-lived feature branches from `dev` (`feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`), merge them into `dev` once complete, and promote `dev` -> `main` for stable releases/deploys.
  - Keep module ownership clearly separated when working in parallel.
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
3. **Test-Driven Development (TDD) for Critical Logic:**
   - **Mandatory TDD (`Red -> Green -> Refactor`):** For all critical statistical, scientific, data-parsing, and validation logic (**Mann-Kendall**, **Sen's Slope**, **seasonal aggregation**, **NASA `-999` sentinel filtering**, **D1 input/bounds validation**), **write failing Vitest unit tests FIRST**, confirm they fail, and only then implement the production code to make them pass.
4. **Native Bilingual UI (`EN` / `PT-BR`):** Auto-detect browser language (`localStorage` -> `navigator.language` -> `'en'` fallback) and expose a visible toggle in the header. Backend must return structured enums/numbers (never hardcoded English prose).
