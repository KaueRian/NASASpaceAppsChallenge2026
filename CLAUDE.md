# 🤖 Claude Code & AI Assistant Instructions (`CLAUDE.md`)

> See also [`AGENTS.md`](AGENTS.md) and [`TASK.md`](TASK.md).

## Mandatory Workflow
1. **Task-Driven Development (`TASK.md`):**
   - Read [`TASK.md`](TASK.md) before making any change.
   - **Every change—even a single-line fix or doc tweak—must have an associated task in `TASK.md`.** If one does not exist, create a new task in `TASK.md` first.
   - Update task status (`[ ]` -> `[~]` -> `[x]`) as you work.
2. **English Only:**
   - All code, comments, documentation, commit messages, branch names, and PR descriptions in this repository MUST be written in **English**.
3. **Git & GitHub Best Practices:**
   - Use **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
   - Work in small, atomic commits and avoid editing files owned by the other developer without coordination.
   - Never commit secrets (`.env*`), dependencies (`node_modules/`, `.venv/`), or build artifacts.
4. **Project Context (`EarthTrend Detective`):**
   - Challenge: **NASA Space Apps Challenge 2026 — `Be An Earth System Trend Detective!`**
   - Core Engine: Real NASA open data (**NASA POWER API**, **GISTEMP**, **SMAP**) + unit-tested statistical forensics (**Mann-Kendall** & **Sen's Slope**).
   - UI: Bilingual (`EN` / `PT-BR`) with browser auto-detection and a header language toggle.
