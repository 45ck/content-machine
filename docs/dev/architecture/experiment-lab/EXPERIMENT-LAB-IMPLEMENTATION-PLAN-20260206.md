# Implementation Plan: Local Experiment Lab

Date: 2026-02-06
Status: Planned

This plan is structured to keep the system maintainable, safe, and agent-friendly.

## 0) Definitions of done (global)

- `cm lab` starts a local server and prints a URL.
- Review flow works without runner.
- Feedback writes to the feedback store with session scoping.
- Export produces a single JSON file usable by agents.
- Unit + integration tests cover path safety and video streaming.

## 1) Milestone A: Contracts and scaffolding (review-only)

Deliverables:

- New CLI command skeleton: `cm lab`
- CLI UX:
  - prints a clickable URL in human mode
  - optional `--open` to auto-open in default browser (recommended default when TTY)
  - optional `--exit-after-submit 1` for one-shot evaluator tasks
  - optional one-shot helpers:
    - `cm lab review <path>` (imports and opens review)
    - `cm lab compare <pathA> <pathB>` (imports both and opens A/B compare)
    - `cm lab compare` defaults to one-shot + auto-open in TTY; support `--stay-open` and `--no-open`
- Lab server skeleton:
  - static UI serving (placeholder page)
  - `/api/config`, `/api/runs/import`, `/api/runs`, `/api/runs/:id`
  - safe file access layer (allowlist + registered roots)
- Versioned schemas for:
  - session
  - run index entry
  - experiment (stub)
  - feedback linkage additions (sessionId/runId)

Acceptance criteria:

- `cm lab --json` prints one envelope with `{ url, sessionId }`.
- `cm lab` prints a clickable URL (human mode) and can auto-open with `--open`.
- Import rejects paths outside allowed roots.
- Import is idempotent for unchanged artifacts roots (same path returns same runId).
- Run detail returns correct artifact presence detection.

Tests:

- unit: path allowlist + normalization
- unit: artifact allowlist
- integration: start server and hit `/api/config`

## 2) Milestone B: Review UI + feedback write

Deliverables:

- UI pages:
  - Runs list + import input
  - Review page with video player and tabs
  - Feedback form with default 6 dimensions
- API endpoints:
  - video streaming with Range
  - artifact serving
  - feedback submission (idempotent via `X-CM-LAB-REQUEST-ID`)
- Store:
  - write feedback entry with sessionId/runId and auto-metrics snapshot

Acceptance criteria:

- A run can be reviewed end-to-end and rated.
- Feedback entry is appended and visible via a feedback list endpoint.
- Accidental double-submit does not create duplicate feedback entries (idempotency key).
- Video seek works (Range supported).

Tests:

- unit: Range response logic (headers + partial reads)
- integration: submit feedback then fetch it back

## 3) Milestone C: A/B compare and experiments (review-only)

Deliverables:

- Compare view:
  - side-by-side A/B with shared controls
  - compute deltas for key metrics (shown only after "Reveal metrics")
  - winner selection
  - hide auto-metrics by default (Reveal toggle)
  - single-submit compare review (writes both sides + winner)
- Experiment store:
  - create experiment record linking baseline + variants as runIds
  - API:
    - `POST /api/experiments` (create)
    - `GET /api/experiments/:experimentId` (read)
    - `POST /api/experiments/:experimentId/submit` (one-shot compare submit)

Acceptance criteria:

- Evaluator can rate A/B quickly, winner stored.
- Export includes experiment + feedback + run summaries.

Tests:

- unit: experiment schema and store append/read
- integration: compare submit is idempotent (same request id does not duplicate feedback)

## 4) Milestone D: Agent waiting and exports

Deliverables:

- Feedback polling endpoint:
  - `GET /api/feedback?since=<cursor>&sessionId=...`
  - cursor semantics per `EXPERIMENT-LAB-CURSOR-IDEMPOTENCY-20260206.md`
- Export endpoint:
  - export JSON including runs/experiments/feedback filtered by sessionId
- CLI helper:
  - `cm lab export --session <id> -o export.json` (optional if API is enough)

Acceptance criteria:

- Agent can reliably fetch "new feedback since cursor" without duplicates.
- Export file is self-contained for analysis.

Tests:

- integration: submit feedback then poll since cursor

## 5) Milestone E: Runner (explicit, gated)

Deliverables:

- `cm lab --enable-runner` support
- Runner queue:
  - spawn baseline + variants
  - parse JSON envelope outputs
  - register run roots
  - capture provenance safely (no secrets)
  - enforce runner output layout + provenance contract
- UI experiment builder:
  - define hypothesis and variants
  - run when runner enabled, otherwise emit commands

Acceptance criteria:

- Runner never uses a shell.
- Network and workflow exec are disabled unless explicitly allowed at lab start.
- Partial failures are visible and do not corrupt stores.
- Baseline and variants never overwrite each other; each run has its own artifacts directory.

Tests:

- unit: command spec validation
- integration: mocked runner execution path

## 6) Milestone F: High-signal feedback (v1.1)

Deliverables:

- Time-coded notes (annotations)
- Targeted questions per experiment (agent-authored)
- Caption density overlays (CPS/WPM)

Acceptance criteria:

- Faster iteration: fewer ambiguous notes, more actionable feedback.

## 7) Implementation sequencing (recommended)

1. Contracts + server skeleton
2. Video streaming + artifact serving
3. Feedback write + list + export
4. UI runs/review
5. Compare + experiment storage
6. Agent waiting/polling
7. Runner (last, behind a gate)
