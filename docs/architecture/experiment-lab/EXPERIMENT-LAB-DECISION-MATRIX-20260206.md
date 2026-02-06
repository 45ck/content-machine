# Decision Matrix: Local Experiment Lab

Date: 2026-02-06
Status: Draft (calibrated scoring; adjust as real constraints emerge)

This document expands ADR-005 with a full scoring matrix for the major design axes.

## 1) Criteria and weights

Scale: 1..5 (higher is better).

- Maintainability (25)
- Fast start / minimal deps (20)
- UX quality (15)
- Reproducibility / provenance (15)
- Testability (10)
- Extensibility (10)
- Security / local-first (5)

Weighted total (max 500):

`total = 25*M + 20*F + 15*U + 15*R + 10*T + 10*E + 5*S`

Note: totals are used for ranking only; do not treat them as "precise truth".

## 2) Axis A: Runtime architecture

Options:

1. Minimal Node server + static UI bundle
2. Node server + Vite dev server (dev) + built bundle (prod)
3. Electron desktop app
4. Tauri desktop app
5. Pure static HTML with File System Access API (no server)
6. Web app with Remotion Player-heavy preview
7. Next.js app
8. Python FastAPI server + web UI
9. TUI + browser hybrid
10. MCP-first (use generic MCP UI client)

Scores:

| #   | Option            | M   | F   | U   | R   | T   | E   | S   | Total | Notes                         |
| --- | ----------------- | --- | --- | --- | --- | --- | --- | --- | ----- | ----------------------------- |
| 1   | Node + static     | 5   | 5   | 4   | 4   | 4   | 4   | 5   | 450   | smallest surface area         |
| 2   | Node + Vite       | 4   | 3   | 4   | 4   | 4   | 4   | 5   | 390   | better dev UX, more parts     |
| 3   | Electron          | 3   | 2   | 5   | 4   | 3   | 4   | 4   | 320   | packaging + updates cost      |
| 4   | Tauri             | 3   | 3   | 5   | 4   | 3   | 4   | 4   | 340   | Rust complexity               |
| 5   | Static-only       | 4   | 5   | 2   | 2   | 3   | 3   | 4   | 350   | hard to spawn runner          |
| 6   | Remotion-heavy UI | 3   | 3   | 5   | 3   | 3   | 4   | 4   | 330   | heavy client bundle           |
| 7   | Next.js           | 2   | 2   | 4   | 3   | 3   | 4   | 4   | 270   | overkill                      |
| 8   | FastAPI           | 2   | 2   | 4   | 3   | 2   | 4   | 4   | 260   | split stack                   |
| 9   | TUI+browser       | 3   | 4   | 3   | 3   | 3   | 3   | 5   | 335   | awkward UX                    |
| 10  | MCP-first         | 3   | 4   | 2   | 3   | 3   | 4   | 5   | 340   | UX depends on external client |

Ranked decision: Option 1.

## 3) Axis B: Storage model

Options:

1. JSONL append-only logs
2. JSON files per experiment/run tree
3. SQLite
4. DuckDB
5. LevelDB
6. Postgres
7. Store feedback inside artifactsDir
8. Git commits per feedback
9. Remote telemetry DB
10. Hybrid JSONL writes + SQLite compaction

| #   | Option          | M   | F   | U   | R   | T   | E   | S   | Total | Notes                         |
| --- | --------------- | --- | --- | --- | --- | --- | --- | --- | ----- | ----------------------------- |
| 1   | JSONL           | 5   | 5   | 3   | 4   | 4   | 4   | 5   | 435   | best for export/share         |
| 2   | JSON tree       | 4   | 5   | 3   | 4   | 3   | 3   | 5   | 405   | more file mgmt                |
| 3   | SQLite          | 4   | 4   | 3   | 5   | 4   | 5   | 5   | 430   | great later; slightly heavier |
| 4   | DuckDB          | 3   | 3   | 2   | 5   | 3   | 5   | 5   | 350   | analytics-heavy               |
| 5   | LevelDB         | 3   | 4   | 2   | 4   | 3   | 4   | 5   | 345   | hard to inspect               |
| 6   | Postgres        | 2   | 1   | 2   | 5   | 3   | 5   | 5   | 275   | not fast start                |
| 7   | In artifactsDir | 3   | 5   | 3   | 3   | 2   | 3   | 5   | 355   | scattered state               |
| 8   | Git commits     | 2   | 1   | 2   | 4   | 2   | 3   | 5   | 235   | too heavy                     |
| 9   | Remote          | 1   | 1   | 3   | 5   | 2   | 5   | 1   | 225   | violates local-first          |
| 10  | Hybrid          | 3   | 2   | 3   | 5   | 3   | 5   | 5   | 345   | too complex early             |

Ranked decision: JSONL for MVP; optional SQLite later.

## 4) Axis C: Orchestration (generation execution)

Options:

1. Spawn `cm generate --json` child process
2. Call internal TS pipeline APIs directly
3. In-process queue + sequential child processes
4. Worker threads
5. Artifacts-only review (no execution)
6. Output commands to run manually
7. Docker runner
8. Spawn `npm run cm -- ...`
9. MCP tool calls
10. Pluggable runners

| #   | Option         | M   | F   | U   | R   | T   | E   | S   | Total | Notes                       |
| --- | -------------- | --- | --- | --- | --- | --- | --- | --- | ----- | --------------------------- |
| 1   | spawn cm       | 4   | 4   | 3   | 5   | 4   | 4   | 4   | 395   | low coupling; needs parsing |
| 2   | internal APIs  | 2   | 4   | 3   | 4   | 2   | 4   | 4   | 305   | tight coupling              |
| 3   | queue+spawn    | 4   | 3   | 3   | 5   | 4   | 4   | 4   | 375   | predictable, safe           |
| 4   | workers        | 3   | 2   | 3   | 4   | 3   | 4   | 4   | 315   | complexity                  |
| 5   | review-only    | 5   | 5   | 3   | 4   | 4   | 3   | 5   | 435   | safest default              |
| 6   | print commands | 4   | 5   | 2   | 4   | 3   | 3   | 5   | 390   | more manual steps           |
| 7   | docker         | 2   | 1   | 3   | 5   | 3   | 4   | 4   | 260   | heavy                       |
| 8   | spawn npm      | 3   | 3   | 3   | 4   | 3   | 3   | 4   | 325   | more brittle                |
| 9   | MCP            | 3   | 3   | 2   | 4   | 3   | 4   | 5   | 335   | extra infra                 |
| 10  | pluggable      | 4   | 2   | 3   | 5   | 3   | 5   | 4   | 345   | best later                  |

Ranked decision: default review-only, optional queue+spawn behind an explicit gate.

## 5) Axis D: Review UX

Options:

1. Single-run review
2. A/B compare
3. A/B/N leaderboard
4. Rubric checklist
5. Time-coded annotations
6. Scene-level ratings
7. Blind evaluation
8. Auto-suggested fixes and rerun
9. Caption density heatmap overlay
10. Guided hypothesis wizard

This axis is not a single pick; it is a roadmap ordering problem. MVP should maximize signal with
minimum UI complexity.

| #   | Option       | Signal | Complexity | MVP fit | Notes                     |
| --- | ------------ | ------ | ---------- | ------- | ------------------------- |
| 1   | Single-run   | Med    | Low        | Yes     | baseline for everything   |
| 2   | A/B          | High   | Med        | Yes     | core iteration loop       |
| 3   | A/B/N        | High   | High       | Later   | needs ranking UX          |
| 4   | Rubric       | High   | Low        | Yes     | makes feedback actionable |
| 5   | Time-coded   | High   | High       | v1.1    | best for pinpoint fixes   |
| 6   | Scene-level  | Med    | High       | Later   | can overwhelm evaluator   |
| 7   | Blind        | Med    | Med        | Later   | reduce bias               |
| 8   | Auto-suggest | Med    | High       | Later   | needs stable heuristics   |
| 9   | Heatmap      | Med    | Med        | v1.1    | complements captions work |
| 10  | Wizard       | Med    | Med        | Later   | nice UX, not required     |

Roadmap decision: MVP = (1)+(2)+(4), then (5)+(9), then (3)+(7)+(10).

## 6) Axis E: Cursor/idempotency (agent polling)

This axis is critical for "agent waits for feedback" correctness.

Decision:

- Cursor semantics for `GET /api/feedback` use a byte-offset cursor into the canonical feedback JSONL store.
- POST endpoints use an idempotency key (`X-CM-LAB-REQUEST-ID`) to prevent accidental double-submits.

Full spec and alternatives:

- `docs/architecture/experiment-lab/EXPERIMENT-LAB-CURSOR-IDEMPOTENCY-20260206.md`

## 7) Axis F: Evaluator task flow (launch, bias, completion)

This axis covers the high-ROI evaluator experience details:

- How the evaluator gets into the intended task with minimal clicks.
- How we avoid bias from showing heuristic metrics too early.
- How we make "submit once, done" viable for one-shot reviews.

Options:

1. Manual: print URL only, user navigates to compare, metrics shown
2. Clickable URL + manual navigation, metrics shown
3. Auto-open + deep-link into compare/review, metrics hidden by default (Reveal toggle), optional auto-exit (chosen)
4. Auto-open + deep-link, metrics never shown
5. Auto-open + deep-link, blind A/B labeling (hide baseline identity), metrics hidden (later)
6. Electron desktop app with built-in launcher/close
7. TUI-only reviewer (no browser)
8. Browser-only static app (no server) with File System Access API
9. Remote hosted reviewer UI (cloud)
10. Integrate review into existing video players (external tools) and only capture form feedback

| #   | Option                      | Friction | Bias risk | Complexity | MVP fit | Notes                     |
| --- | --------------------------- | -------- | --------- | ---------- | ------- | ------------------------- |
| 1   | manual + metrics            | High     | High      | Low        | No      | too slow + biased         |
| 2   | clickable + metrics         | Med      | High      | Low        | No      | biased                    |
| 3   | auto-open + blind-metrics   | Low      | Low       | Med        | Yes     | best evaluator throughput |
| 4   | auto-open + no metrics ever | Low      | Lowest    | Med        | Maybe   | harder debugging          |
| 5   | full blind labeling         | Low      | Lowest    | High       | Later   | needs careful UX          |
| 6   | Electron                    | Low      | Low       | High       | Later   | packaging cost            |
| 7   | TUI                         | Med      | Low       | Med        | No      | weak A/B video UX         |
| 8   | static-only                 | Low      | Low       | High       | No      | hard video Range + stores |
| 9   | remote                      | Low      | High      | High       | No      | violates local-first      |
| 10  | external player             | Med      | Low       | High       | Later   | brittle integrations      |

Decision: Option 3 for MVP.
