# 🤖 Claude Code & AI Assistant Instructions (`CLAUDE.md`)

> See also [`AGENTS.md`](AGENTS.md), [`DESIGN.md`](DESIGN.md), and [`TASK.md`](TASK.md).

## Mandatory Workflow
1. **Task-Driven & Design-Aligned Development (`TASK.md` & `DESIGN.md`):**
   - Read [`TASK.md`](TASK.md) before making any change, and read [`DESIGN.md`](DESIGN.md) before any UI/UX work (Old NY Noir Detective Office theme, no detective character/avatar, 3-room layout, *Show Your Stripes* card).
   - **Every change—even a single-line fix or doc tweak—must have an associated task in `TASK.md`.** If one does not exist, create a new task in `TASK.md` first.
   - **Mandatory Priority Property (`priority` / PT-BR `prioridade`):** Every open (`[ ]` / `[~]`) or newly created task MUST carry an explicit priority tag (`[priority: low]`, `[priority: medium]`, or `[priority: high]` in `TASK.md`; `[prioridade: baixa]`, `[prioridade: média]`, or `[prioridade: alta]` in PT-BR root trackers). Assign the priority stated by the user or choose one autonomously based on hackathon deadline risk and judging impact.
   - **Mandatory Execution Order (`Priority or User Decision`):** Tasks MUST be executed strictly following priority order (`[priority: high]` → `[priority: medium]` → `[priority: low]`) or an explicit user decision. When registering or refining tasks (including `/grill-me` interviews), update the task trackers first and **do NOT auto-execute tasks** unless explicitly authorized by the user or matching the selected priority order.
   - Update task status (`[ ]` -> `[~]` -> `[x]`) as you work.
   - **Release Ladder:** follow `TASK.md` releases top-down (`R0` → `R4`); `main` must always hold the latest complete, working release.
   - **`DESIGN.md` overrides any external design skill or generic style suggestion.**
2. **Test-Driven Development (TDD) for Critical Logic:**
   - Write failing **Vitest** unit tests **FIRST** (`Red -> Green -> Refactor`) for Mann-Kendall, Sen's Slope, seasonal aggregation, `-999` filtering, and D1 input validation before writing implementation code.
3. **English Only:**
   - All code, comments, documentation, commit messages, branch names, and PR descriptions in this repository MUST be written in **English**.
4. **Git & GitHub Best Practices:**
   - **Branching (`feature/*` -> `dev` -> `main`):** Never commit directly to `main`. Branch from `dev` (`feat/*`, `fix/*`, `docs/*`), merge into `dev`, and promote `dev` -> `main` for production deploys.
   - Use **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
   - Work in small, atomic commits and avoid editing files owned by the other developer without coordination.
   - Never commit secrets (`.env*`), dependencies (`node_modules/`, `.venv/`), or build artifacts.
5. **Project Context (`GeoTrend`):**
   - Challenge: **NASA Space Apps Challenge 2026 — `Be An Earth System Trend Detective!`**
   - Core Engine: Locked MVP dataset **NASA POWER API / MERRA-2** (`T2M`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT` via `temporal/monthly/point`) + TDD-verified statistical forensics (**Mann-Kendall** & **Sen's Slope**).
   - UI: Bilingual (`EN` / `PT-BR`) with browser auto-detection and a header language toggle.
   - **HUBEE Manual Alignment (*Missão Amazônia*):** Start with Vilhena, RO (Case #01), explicitly state that statistical trend significance ≠ single-cause causation (`04. Limitations` & dossier microcopy), highlight regional contrasts (Amazon vs. Arctic), and reference classroom environmental education, *MapBiomas* land-cover context, and **UN SDGs 6, 13, and 15**.
