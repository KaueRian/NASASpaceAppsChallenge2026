# 🤖 Claude Code & AI Assistant Instructions (`CLAUDE.md`)

> See also [`AGENTS.md`](AGENTS.md), [`DESIGN.md`](DESIGN.md), and [`TASK.md`](TASK.md).

## Mandatory Workflow
1. **Task-Driven & Design-Aligned Development (`TASK.md` & `DESIGN.md`):**
   - Read [`TASK.md`](TASK.md) before making any change, and read [`DESIGN.md`](DESIGN.md) before any UI/UX work (Old NY Noir Detective Office theme, no detective character/avatar, 3-room layout, *Show Your Stripes* card).
   - **Every change—even a single-line fix or doc tweak—must have an associated task in `TASK.md`.** If one does not exist, create a new task in `TASK.md` first.
   - **Mandatory Task Code (`<number><H|M|L>`) & Priority Property (`priority` / PT-BR `prioridade`):** Every open (`[ ]` / `[~]`) or newly created task MUST carry a unique sequential code paired with its priority initial (`H` = high, `M` = medium, `L` = low — e.g., `[1H]`, `[7M]`, `[9L]`) and an explicit priority tag (`[priority: low]`, `[priority: medium]`, or `[priority: high]` in `TASK.md`; `[prioridade: baixa]`, `[prioridade: média]`, or `[prioridade: alta]` with the same numeric code in PT-BR root trackers). Keep the code when marking `[x]`, and assign the priority stated by the user or choose one autonomously based on hackathon deadline risk and judging impact.
   - **Mandatory Execution Order & Tie-Breaker (`Priority First → Lowest Task Number`):** To determine which task to execute next, filter open tasks by **highest priority** (`[priority: high]` / `H` → `[priority: medium]` / `M` → `[priority: low]` / `L`) first, and **break ties within the same priority tier by selecting the oldest task—the one with the lowest numeric code** (e.g., `[4H]` before `[5H]` or `[20H]`; `[7M]` before `[8M]` or `[19M]`), unless overridden by an explicit user decision (or when the lower-numbered task is blocked awaiting human approval/external gate, advancing to the next lowest numeric code in that tier). When registering or refining tasks (including `/grill-me` interviews), update the task trackers first and **do NOT auto-execute tasks** unless explicitly authorized by the user or matching this priority + lowest-number order.
   - **Mandatory Completion Rule (Test & Push to GitHub):** Before wrapping up any completed task, always run `npm run format && npm run check` (0 failures), commit atomically with `TASK.md` updated, and push to `origin/dev` on GitHub (never push directly to `main` or run manual `wrangler deploy` without explicit `[4H]` release authorization). Whenever runtime/UI changed, verify GitHub Actions (`verify`), Cloudflare preview build, and live `dev` preview behavior.
   - Update task status (`[ ]` -> `[~]` -> `[x]`) as you work.
   - **Release Ladder:** follow `TASK.md` releases top-down (`R0` → `R4`); `main` must always hold the latest complete, working release.
   - **`DESIGN.md` overrides any external design skill or generic style suggestion.**
2. **Test-Driven Development (TDD) for Critical Logic:**
   - Write failing **Vitest** unit tests **FIRST** (`Red -> Green -> Refactor`) for Mann-Kendall, Sen's Slope, seasonal aggregation, `-999` filtering, and D1 input validation before writing implementation code.
3. **English Only:**
   - All code, comments, documentation, commit messages, branch names, and PR descriptions in this repository MUST be written in **English**.
4. **Git & GitHub Best Practices:**
   - **Branching (`feature/*` -> `dev` -> `main`):** Never commit directly to `main`. Branch from `dev` (`feat/*`, `fix/*`, `docs/*`), run `npm run format && npm run check`, merge into `dev`, **push completed tasks to `origin/dev` on GitHub immediately**, and promote `dev` -> `main` only for explicit production releases (`[4H]`).
   - Use **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
   - Work in small, atomic commits and avoid editing files owned by the other developer without coordination.
   - Never commit secrets (`.env*`), dependencies (`node_modules/`, `.venv/`), or build artifacts.
5. **Project Context (`GeoTrend`):**
   - Challenge: **NASA Space Apps Challenge 2026 — `Be An Earth System Trend Detective!`**
   - Core Engine: Locked MVP dataset **NASA POWER API / MERRA-2** (`T2M`, `T2M_MIN`, `PRECTOTCORR`, `GWETROOT` via `temporal/monthly/point`) + TDD-verified statistical forensics (**Mann-Kendall** & **Sen's Slope**).
   - UI: Bilingual (`EN` / `PT-BR`) with browser auto-detection and a header language toggle.
   - **HUBEE Manual Alignment (*Missão Amazônia*):** Start with Vilhena, RO (Case #01), explicitly state that statistical trend significance ≠ single-cause causation (`04. Limitations` & dossier microcopy), highlight regional contrasts (Amazon vs. Arctic), and reference classroom environmental education, *MapBiomas* land-cover context, and **UN SDGs 6, 13, and 15**.
