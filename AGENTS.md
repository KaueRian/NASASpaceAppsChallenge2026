# 🤖 AI Agent Operating Guide (`AGENTS.md`)

This repository (`NASASpaceAppsChallenge2026`) hosts the **GeoTrend** software for the **NASA Space Apps Challenge 2026** (`Be An Earth System Trend Detective!` — Vilhena, RO, Brazil).

---

## 🎯 Core Rules (Mandatory for All Agents & Developers)

### 1. `TASK.md` & `DESIGN.md` Are Mandatory Guides
- **Always read [`TASK.md`](TASK.md) before starting any task.**
- **Always read [`DESIGN.md`](DESIGN.md) before designing or editing any UI/UX or frontend component** (it holds the full Old NY Noir Detective Office aesthetic, color tokens, 3-room layout, and *Show Your Stripes* card specs so no context is lost across sessions).
- **Every change—no matter how minimal—MUST correspond to a task in `TASK.md`.**
  - If no task exists for the change you are about to make, **add a new task to `TASK.md` first** before writing code or modifying files.
  - **Mandatory Priority Property (`priority` / PT-BR `prioridade`):** Every open (`[ ]` / `[~]`) or newly created task MUST declare a priority tag: `[priority: low]`, `[priority: medium]`, or `[priority: high]` in `TASK.md` (matching `[prioridade: baixa]`, `[prioridade: média]`, or `[prioridade: alta]` in the PT-BR root checklists `SPACE_APPS_2026.md` and `task.md`). The user may specify the priority explicitly, or the agent must assign one autonomously based on hackathon deadline urgency, rubric impact, and release dependencies.
  - **Mandatory Execution Order (`Priority or User Decision`):** Open tasks MUST be executed strictly in priority order (`[priority: high]` → `[priority: medium]` → `[priority: low]`) or following an explicit user decision selecting which task to execute. When creating, updating, or refining tasks (e.g., during `/grill-me` planning), document them in `TASK.md` first and **do NOT automatically execute tasks** without user authorization or out of priority order.
  - Mark the task as `[~] (<YourName/Agent>)` while in progress and `[x]` upon completion.
- Respect task ownership so the two developers do not collide on the same files.
- **Release Ladder ("always shippable"):** work on tasks top-down by release (`R0` → `R4` in `TASK.md`). Never start a later release while the current one is unfinished, and never leave `main` broken — `main` always holds the latest complete release.
- **Design precedence:** `DESIGN.md` overrides any external design skill, template, or generic style suggestion (e.g. glassmorphism, SaaS palettes). Use external skills only for accessibility/UX checklists.

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
2. **Real NASA Data Only:** Never ship mocked data as final output. Use the locked MVP dataset (**NASA POWER API / MERRA-2** for `T2M`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT` via `temporal/monthly/point`) and cite it explicitly. Do not add extra NASA APIs unless explicitly requested in `TASK.md`.
3. **Test-Driven Development (TDD) for Critical Logic:**
   - **Mandatory TDD (`Red -> Green -> Refactor`):** For all critical statistical, scientific, data-parsing, and validation logic (**Mann-Kendall**, **Sen's Slope**, **seasonal aggregation**, **NASA `-999` sentinel filtering**, **D1 input/bounds validation**), **write failing Vitest unit tests FIRST**, confirm they fail, and only then implement the production code to make them pass.
4. **Native Bilingual UI (`EN` / `PT-BR`):** Auto-detect browser language (`localStorage` -> `navigator.language` -> `'en'` fallback) and expose a visible toggle in the header. Backend must return structured enums/numbers (never hardcoded English prose).
5. **HUBEE Challenge Manual Alignment (*Missão Amazônia* & Scientific Rigor):**
   - **Correlation ≠ Causation:** Always distinguish statistical trend significance (Mann-Kendall / Sen's Slope) from direct single-cause physical attribution in UI copy and `04. Limitations`.
   - **Regional & Educational Relevance:** Anchor the preset narrative in **Vilhena & Rondônia** (matching HUBEE Suggestion #2), highlight contrasting regional trends (Amazon vs. Arctic), reference complementary land-cover context (*MapBiomas*) and classroom environmental education, and align documentation with **UN SDGs 6, 13, and 15**.
