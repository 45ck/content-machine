# System Design: Local Experiment Lab

Date: 2026-02-06
Status: MVP implemented (review-only; runner pending)

## 1) Overview

The Lab is a local web UI + API designed for an agent-human feedback loop.

- Agent runs `cm lab` (optionally with runner enabled).
- Human evaluates videos and submits feedback.
- Agent consumes feedback + auto-metrics and iterates on config/code.

Key principle: make the system boring and reliable: local-first, explicit execution, strict file access.

## 2) High-level architecture

Components:

1. CLI entry (`cm lab`)
   - Starts the server, prints URL and sessionId.
   - In JSON mode prints a single envelope then stays quiet on stdout.

2. Lab server (Node)
   - Serves static UI assets.
   - Provides JSON API to import runs, read artifacts, stream video, create experiments, write feedback, export.
   - Optional runner (explicitly enabled).

3. Static UI (browser)
   - Runs/Review/Compare/Experiments views.
   - Talks only to the local server.

4. Stores (local)
   - Feedback store: reuse existing `~/.cm/feedback/feedback.jsonl`.
   - Lab run index and experiments: new JSONL stores under `~/.cm/lab/`.

## 3) Default runtime modes

### Review-only (default)

- No generation execution.
- User imports artifacts directories produced by prior runs.
- Good for safety and when the agent is not actively orchestrating runs.

### Runner-enabled (explicit)

Enable via:

- `cm lab --enable-runner`

Runner capabilities are further gated:

- `--runner-allow-network` (default false)
- `--runner-allow-workflow-exec` (default false)

### One-shot compare/review (recommended for evaluator throughput)

Purpose: minimize evaluator friction when an agent is actively running a specific task.

Properties:

- Lab can auto-open the browser (TTY mode) and deep-link directly into A/B compare or single-run review.
- "Blind" A/B compare by default (hide auto-metrics unless explicitly revealed).
- Optional auto-exit after submit (server shuts down once the required feedback is received).
- Server exposes one-shot task hints via `GET /api/config` (e.g. `task` and `exitAfterSubmit`) so the UI can
  immediately route into the intended workflow without extra clicks.

This mode is an additive UX layer on top of the same API/stores; it does not change the data model.

## 4) Session model (agent-in-the-loop)

Every Lab process has a `sessionId` (opaque string).

Rules:

- All new entities written during the session must include `sessionId`.
- API endpoints include `sessionId` in responses so an agent can filter.
- Exports can be filtered by `sessionId` so agents can reliably collect only the feedback for a run.

## 5) Proposed code organization (maintainability-first)

New modules (proposal):

- `src/lab/`
  - `src/lab/server/` HTTP server, routing, static serving, API handlers
  - `src/lab/stores/` JSONL stores for runs/experiments
  - `src/lab/metrics/` extract + normalize metrics from known artifacts/reports
  - `src/lab/runner/` child-process orchestration (optional, gated)
  - `src/lab/security/` path allowlist + safe artifact serving
  - `src/lab/session/` session id creation, event cursors
  - `src/lab/schema/` versioned schemas (zod)

CLI wiring:

- `src/cli/commands/lab.ts` (thin wrapper)
- `src/cli/index.ts` registers the `lab` command

UI assets:

- Source: `src/lab/ui/` (TypeScript + minimal framework, or plain TS)
- Build output: `assets/lab/` (static files served by the server)

Packaging:

- ensure `assets/lab/**` is included in npm package files list.

## 6) File access and artifact model

The Lab never serves arbitrary filesystem paths.

Import flow:

1. User provides `artifactsDir` (or a video file path).
2. Server validates it against allowed roots.
3. Server registers it as a `runId` and stores its root.

Serving:

- `GET /api/runs/:runId/video` streams only the run’s videoPath (or a configured default).
- `GET /api/runs/:runId/artifact/:name` serves only known safe artifact names.

## 7) Auto-metrics extraction (normalization contract)

The server extracts a normalized summary so UI and agents can compare runs consistently.

Example normalized metrics (0-100 where possible):

- syncRating (0-100) + label + drift stats
- captionOverall (0-100) + coverage ratio + OCR confidence
- proxyScoreOverall (0-100) if `score.json` exists

Raw metrics and report paths are preserved for debugging.

## 8) Runner design (optional)

Runner must:

- Run baseline + variants deterministically.
- Capture stdout/stderr and JSON envelope output.
- Capture flags/config snapshot as provenance.
- Write a LabRun record for each attempt.
- Be resilient: partial results still importable.

Concurrency:

- Default: sequential queue (1 worker) for predictability and to avoid resource contention.
- Future: N workers with explicit limits.

## 9) Events and agent waiting

Minimal viable approach:

- Polling endpoint: `GET /api/feedback?since=<cursor>&sessionId=<id>` returns new entries.
- Cursor semantics are defined in:
  `docs/dev/architecture/experiment-lab/EXPERIMENT-LAB-CURSOR-IDEMPOTENCY-20260206.md`.
- For MVP: `since` is a byte-offset cursor into the canonical feedback JSONL store
  (`~/.cm/feedback/feedback.jsonl`). Agents should filter by `sessionId`.

Future:

- SSE endpoint: `/api/events` for real-time feedback notifications.

## 10) Failure modes (design must handle)

Artifacts:

- Missing `timestamps.json` or `visuals.json` -> UI still works (degraded metrics).
- Corrupt JSON -> show error panel but keep feedback available.
- Missing video -> allow rating script-only and tag "no-video".

Server:

- Port in use -> auto-increment.
- Store file locked or unwritable -> read-only mode with clear error.

Runner:

- Missing API keys -> surface as preflight errors, do not partially execute.
- Workflow exec hooks -> disabled unless explicitly allowed.
