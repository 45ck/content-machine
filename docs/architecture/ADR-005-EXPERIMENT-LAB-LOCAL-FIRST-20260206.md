# ADR-005: Local Experiment Lab (Agent-in-the-Loop, Local-First)

Date: 2026-02-06
Status: Accepted (MVP implemented; runner pending)

## Context

Content Machine needs a tight iteration loop to improve short-form output quality. Automated heuristics
(sync rating, caption OCR quality, proxy scoring) are useful but insufficient. We need structured
human feedback at scale across many generations, linked to exact artifacts and configuration/code
changes.

Key constraint: this Lab is primarily used by coding agents (including Codex) running locally. Agents
propose hypotheses/experiments, humans review in a UI, and the agent consumes the feedback to iterate
on configuration and/or code.

Non-functional goals:

- Local-first by default: no cloud dependency, no telemetry.
- Fast start: `cm lab` should start in seconds with minimal deps.
- High maintainability: small surface area, stable schemas, testable contracts.
- Reproducibility: every rating must be linkable to artifacts + provenance (version/config/flags).
- Safety: avoid arbitrary filesystem reads and avoid accidental expensive/risky execution.

## Decision (summary)

We will build a local Experiment Lab as:

1. `cm lab`: a minimal Node HTTP server that serves a static UI bundle and a JSON API on `127.0.0.1`.
2. Default mode is review-only: Lab never runs generation unless explicitly enabled.
3. Optional runner mode (`--enable-runner`) spawns `cm generate --json` for baseline + variants.
4. Storage is append-only JSONL, compatible with existing `cm feedback` log, with a single-file export.
5. Lab is session-scoped: each lab process has a `sessionId` for agents to filter feedback/events.
6. UI supports single-run review and A/B compare as first-class flows; A/B/N is supported as an
   extension of the same model.

## Decision drivers

1. Minimize dependency and operational footprint.
2. Keep provenance complete and machine-readable.
3. Make the agent workflow deterministic: start -> create experiment -> wait for feedback -> export.
4. Reduce security risk: local-only, explicit runner enablement, strict path allowlists.
5. Keep UI and server contract stable and testable with unit/integration tests.

## Alternatives (10 per axis) and scoring

Scoring scale: 1..5 (higher is better).
Weights: Maintainability (25), Fast start/min deps (20), UX quality (15),
Reproducibility (15), Testability (10), Extensibility (10), Security/local-first (5).

### Axis A: Runtime architecture

Options brainstormed:

1. Minimal Node server + static UI bundle
2. Node server + Vite dev server (dev) + built bundle (prod)
3. Electron desktop app
4. Tauri desktop app
5. Pure static HTML with file picker (no server)
6. Web app using Remotion Player for preview
7. Next.js app
8. Python FastAPI server + web UI
9. TUI + browser hybrid
10. MCP-first (use generic MCP UI client)

Top candidates scored (weighted):

- (1) Minimal Node server + static UI: 5/5/4/4/4/4/5 -> best overall
- (2) Node + Vite dev/prod: 4/3/4/4/4/4/5 -> good dev UX, more moving parts
- (3) Electron: 3/2/5/4/3/4/4 -> heavy packaging and maintenance

Decision: (1). Keep (2) as optional dev workflow if needed.

### Axis B: Storage model

Options brainstormed:

1. JSONL append-only log (per entity)
2. JSON files per experiment/run in a tree
3. SQLite
4. DuckDB
5. LevelDB
6. Postgres
7. Store feedback inside artifactsDir
8. Git commits per feedback
9. Remote telemetry DB
10. Hybrid JSONL writes + SQLite compaction

Top candidates:

- (1) JSONL: 5/5/3/4/4/4/5 -> best MVP and exportability
- (3) SQLite: 4/4/3/5/4/5/5 -> good later when queries grow
- (10) Hybrid: 3/3/3/5/3/5/5 -> complexity too early

Decision: JSONL as source of truth; optional SQLite later as an optimization layer.

### Axis C: Orchestration (generation execution)

Options brainstormed:

1. Spawn `cm generate --json` child process
2. Call internal TS pipeline APIs directly
3. In-process queue + sequential child processes
4. Worker threads
5. Artifacts-only review (no execution)
6. Output commands to run manually
7. Docker runner
8. Spawn `npm run cm -- ...`
9. MCP tool calls (Lab as client)
10. Pluggable runners

Decision:

- Default: (5) artifacts-only review
- Optional (explicit): (3) queue + (1) spawn `cm generate --json`

Rationale: aligns with safety and "agent active" enablement; keeps coupling low.

### Axis D: Review UX

Options brainstormed:

1. Single-run review
2. A/B compare baseline vs variant
3. A/B/N leaderboard
4. Rubric checklist + dimension scores
5. Time-coded annotations
6. Scene-level ratings
7. Blind evaluation (reduce bias)
8. Auto-suggested fixes and rerun
9. Caption density heatmap overlay
10. Guided hypothesis wizard

Decision:

MVP includes (1) + (2) + (4). Add (5) and (10) next.

## Consequences

Positive:

- Fast, low-dep local tool.
- Clear agent-human handshake with session scoping.
- Strong provenance and export for offline analysis/iteration.
- Safer execution model (runner explicit).

Negative / tradeoffs:

- JSONL requires small helper code for queries and dedupe.
- Review-only default adds a step when a user wants auto-runs (addressed by `--enable-runner`).
- UI bundle management adds build steps (handled via repository scripts).

## Implementation notes (non-normative)

- Serve from `127.0.0.1`, not `0.0.0.0`.
- Support HTTP Range requests for video streaming.
- Use `sessionId` in server state and include it in every stored record written during the session.
- Prefer polling + `since` cursor initially; SSE can be added once core flows stabilize.

## Related documents

- `docs/architecture/experiment-lab/README.md`
- `docs/architecture/experiment-lab/EXPERIMENT-LAB-PRD-20260206.md`
- `docs/architecture/experiment-lab/EXPERIMENT-LAB-SYSTEM-DESIGN-20260206.md`
- `docs/architecture/experiment-lab/EXPERIMENT-LAB-DECISION-MATRIX-20260206.md` (full scoring)
- `docs/architecture/experiment-lab/EXPERIMENT-LAB-RUNNER-PROVENANCE-CONTRACT-20260206.md`
- `docs/architecture/experiment-lab/EXPERIMENT-LAB-CURSOR-IDEMPOTENCY-20260206.md`
