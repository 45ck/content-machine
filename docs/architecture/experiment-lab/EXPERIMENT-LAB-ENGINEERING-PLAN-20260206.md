# Engineering Plan: Local Experiment Lab (Principal Engineer Level)

Date: 2026-02-06
Status: Planned

This document is the code-level plan to implement the Lab in a maintainable, clear, duplication-free
way. It is intentionally prescriptive about module boundaries, contracts, and test strategy.

## 1) Engineering principles (non-negotiable)

1. Contract-first:
   - API shapes and schemas are written down and versioned before feature work.
   - Integration tests assert the contract.

2. Local-first and safe-by-default:
   - Bind to 127.0.0.1 by default.
   - Runner is disabled by default.
   - No arbitrary filesystem reads. Everything is `runId` scoped.
   - No secret material is stored or exported.

3. Single source of truth:
   - One canonical store per entity (JSONL).
   - Export is derived from stores, not a separate truth.
   - Normalized metric summaries are additive; raw report paths are retained.

4. Write-once utilities:
   - Generic JSONL append/read with schema validation and cursors.
   - One Range streaming utility for video (no duplicate implementations).
   - One safe-path resolver for registered roots.
   - One error shape across server endpoints.

5. Maintainability over cleverness:
   - Prefer boring, explicit code with small functions.
   - Prefer Node built-ins over new deps unless a dependency reduces risk significantly.

6. Determinism and provenance:
   - Every user-visible decision is traceable: what changed, what ran, what was rated.
   - Runner captures argv and redacted provenance.

## 2) Scope boundaries (what lives where)

### Existing modules to reuse

- `src/feedback/*`
  - Keep as the canonical human feedback store (JSONL) and schema.
  - Extend schema with optional linking fields (sessionId/runId/experimentId/variantId and
    autoMetricsSnapshot) while preserving backward compatibility.

- `src/cli/*`
  - Use runtime conventions (JSON mode behavior).
  - Keep stdout contract: JSON mode stays machine-readable; human mode uses stderr for logs.

### New Lab modules (proposed)

All Lab code lives under `src/lab/` and is imported by `src/cli/commands/lab.ts`.

CLI UX (high ROI):

- Human mode (TTY):
  - print a clickable URL
  - default to `--open` behavior (auto-open browser) with `--no-open` escape hatch
- JSON mode:
  - do not auto-open (keep deterministic automation)
  - print exactly one JSON envelope then stay quiet on stdout

One-shot mode (agent-driven evaluator tasks):

- Provide flags such as:
  - `--task compare --experiment <id>` (preferred) or `--task review --run <id>`
  - `--exit-after-submit <n>` (default 0 = never)
- The server should expose the active task and exit policy via `GET /api/config` (`task` and
  `exitAfterSubmit`) so the UI can route immediately without extra clicks.
- When `--exit-after-submit` is set, the server should shutdown cleanly after the Nth matching task
  submission is persisted (best-effort "auto close"; browser tab may remain open).
- For compare tasks, UI should submit via `POST /api/experiments/:experimentId/submit` so "submit once"
  can atomically persist both sides + winner and correctly trigger one-shot exit.

Convenience CLI (high ROI for evaluators):

- `cm lab compare <pathA> <pathB> [--hypothesis ...]`
  - defaults (TTY): auto-open + one-shot exit after submit
  - escape hatches: `--no-open`, `--stay-open`
  - imports both paths
  - creates a minimal experiment record linking the two runs
  - opens directly into A/B compare (blind metrics by default)

- `src/lab/schema/`
  - zod schemas for:
    - `LabSession`
    - `LabRunIndexEntry`
    - `LabExperiment`
    - `LabEvent` (future `/api/events` + runner progress)
    - `LabExport`

- `src/lab/security/`
  - `allowed-roots.ts`: configure and validate allowed import roots.
  - `safe-path.ts`: safe resolve under registered root (prevents traversal).
  - `artifact-allowlist.ts`: canonical list of artifact names.

- `src/lab/stores/`
  - `jsonl-store.ts`: generic append/read with schema and cursor support.
  - `runs-store.ts`: Lab run index (runId -> artifacts root, topic, summary).
  - `experiments-store.ts`: experiments and variant specs.
  - `events-store.ts`: per-session event log (future `/api/events` + runner; optional for MVP).

- `src/lab/metrics/`
  - `discover.ts`: locate known reports/artifacts in artifactsDir.
  - `extract.ts`: parse known report JSON and extract normalized metrics.
  - `normalize.ts`: convert raw metrics into stable `autoMetricsSummary`.

- `src/lab/server/`
  - `server.ts`: create HTTP server, config, routing.
  - `routes.ts`: route table and handlers (thin; business logic in separate modules).
  - `responses.ts`: JSON responses, error shape, content-type helpers.
  - `static.ts`: static asset serving (UI bundle).
  - `range.ts`: Range parsing + streaming helper used by `/video`.

- `src/lab/session/`
  - `session.ts`: create sessionId + session token for POST mutation auth.
  - `cursor.ts`: cursor encoding/decoding (feedback byte offsets; future events).

- `src/lab/runner/` (optional; gated)
  - `spec.ts`: validated command spec (topic, baseline flags, variant diff).
  - `queue.ts`: sequential worker queue.
  - `spawn.ts`: spawn `cm generate --json` without shell; parse JSON envelope.
  - `provenance.ts`: collect argv, cm version, git hash (best-effort), redact env.

- `src/lab/export/`
  - `export.ts`: build a self-contained export JSON from runs/experiments/feedback filtered by session.

## 3) Versioning strategy (schemas and exports)

Rules:

1. All stored entities have `schemaVersion` as an int.
2. Additive changes:
   - Prefer adding optional fields.
   - Never remove fields in a minor release.
3. Parsing:
   - Reads should be tolerant: `safeParse` and keep valid entries, ignore malformed lines.
4. Exports:
   - Export schema version increments only when breaking changes occur.

## 4) Storage strategy (avoid duplication and race hazards)

### Generic JSONL store utility (write-once)

`jsonl-store.ts` provides:

- `append(path, entity)`:
  - validates with zod before write
  - writes a single JSON line with trailing `\n`
- `readAll(path)`:
  - returns parsed entities, ignoring invalid lines
- `readSinceCursor(path, cursor)`:
  - supports byte-offset cursors for JSONL tailing (used by feedback polling)

Rationale:

- Avoid re-implementing JSONL logic across runs/experiments/events/feedback.

### Cursor semantics (feedback polling)

Cursor semantics for agent polling are defined in:

- `docs/architecture/experiment-lab/EXPERIMENT-LAB-CURSOR-IDEMPOTENCY-20260206.md`

For MVP:

- `GET /api/feedback` uses a byte-offset cursor into the canonical feedback JSONL store
  (`~/.cm/feedback/feedback.jsonl`).

Optional (future):

- A per-session events log at `~/.cm/lab/sessions/<sessionId>/events.jsonl` can back `/api/events`
  and runner progress, but feedback polling should not depend on it (avoid duplicated truth).

## 5) API implementation plan (no spaghetti)

### Handler rule

Each route handler is a small function that:

1. Parses input (query/body/params)
2. Calls a pure-ish service function (domain logic)
3. Writes a response

No handler should:

- traverse filesystem directly
- parse large JSON blobs inline
- duplicate error formatting

### Error handling (one shape)

Write-once:

- `toApiError(error)` converts known errors to `{ code, message, context }`.
- All endpoints use it.

## 6) File access and safety (must be correct)

### Import allowed roots

Allowed roots are resolved once at startup:

- default: current working directory and `./output` (configurable)
- additional roots via CLI flags or config file (future)

Import validates:

- path exists
- resolved absolute path is within one of the allowed roots
- resolved `realpath` is within one of the allowed roots (prevents symlink escape)

### Registered run roots

After import, the server stores:

- `runId -> artifactsDir -> discovered artifacts`

All reads must resolve within `artifactsDir`.

### Artifact allowlist

Canonical allowlist lives in one module.
Never accept user-supplied arbitrary filenames.

## 7) Video streaming plan (Range must work)

Write-once Range streamer:

- Parse `Range` header (bytes)
- Validate ranges and clamp
- Use `createReadStream(file, { start, end })`
- Set headers:
  - `Accept-Ranges: bytes`
  - `Content-Range` for partial
  - `Content-Length`
  - `Content-Type: video/mp4`

Unit tests must cover:

- no Range
- valid range
- invalid range
- suffix range (optional)

## 8) Metrics extraction plan (normalize once)

Goal: UI and agents should compare runs without re-reading full reports.

Approach:

1. `discover.ts`: find known files (`script.json`, `timestamps.json`, `visuals.json`, `score.json`,
   `sync-report.json`, etc.).
2. `extract.ts`: parse and extract:
   - sync rating + drift stats
   - caption quality overall + OCR confidence + coverage
   - proxy score overall (if present)
3. `normalize.ts`: map to:
   - numeric 0-100 values where possible
   - stable nulls for missing data

Rule:

- Never drop raw JSON; summaries are only for quick view/deltas.

## 9) Feedback integration plan (reuse and extend)

We already have:

- `cm feedback add/list/export`
- feedback JSONL store

For Lab:

1. Extend feedback schema (add optional fields):
   - `sessionId`
   - `runId`
   - `experimentId`, `variantId`
   - `autoMetricsSnapshot`
   - `answers` for targeted questions

2. Lab uses the same append function to store feedback (no separate feedback system).

3. Exports combine:
   - feedback entries
   - run index entries
   - experiment entries

## 10) UI build plan (static, shipped)

MVP UI stack:

- Minimal: vanilla TS + small amount of CSS, no heavy frameworks initially.
- Bundle with esbuild into `assets/lab/`.

Why:

- Fast start and minimal deps.
- Easier to ship in npm package.

UI code organization (source):

- `src/lab/ui/pages/*`
- `src/lab/ui/components/*`
- `src/lab/ui/api/*` (typed client to API contract)

Build:

- `npm run lab:build` produces `assets/lab/index.html` + bundle JS/CSS.
- Hook into `prepack`/`prepublishOnly` so global installs always have the UI.

## 11) Runner plan (only after review-only is solid)

Gating:

- Runner must be enabled via CLI flag at lab start.

Runner contract:

- Implement exactly: `docs/architecture/experiment-lab/EXPERIMENT-LAB-RUNNER-PROVENANCE-CONTRACT-20260206.md`

Design:

- Sequential queue; each job is "generate baseline" or "generate variant".
- Spawn `node dist/cli/index.cjs generate ... --json` (or `cm generate` if installed)
  with argv array, no shell.
- Parse JSON envelope output and:
  - register run
  - store provenance
  - emit events
  - enforce unique output directories per run and always pass `--keep-artifacts`

Safety:

- Default runner disallows network and workflow exec.
- Enabling requires explicit CLI flags.

## 12) Test plan (ship gates)

Unit tests:

- path safety: allowed roots + safe resolve
- artifact allowlist
- JSONL store append/read + invalid line tolerance
- Range parsing + streaming headers
- metrics normalization from fixture report JSON

Integration tests:

- boot server on ephemeral port
- import fixture artifacts dir
- fetch run detail, artifact JSON, and video headers
- submit feedback and verify stored entry and event emission

## 13) Step-by-step implementation order (minimize rework)

Phase 1 (review-only, minimal):

1. Schemas + stores + session model
2. Server skeleton + static UI placeholder
3. Import + run registry + safe artifact reads
4. Video Range streaming
5. Metrics discovery + normalization summary
6. Feedback POST endpoint (write to shared feedback store)
7. Poll endpoint using event cursor
8. Export endpoint (session filtered)
9. UI Runs + Review pages (no compare yet)

Phase 2 (compare + experiments):

10. Experiment entity + compare UI
11. Winner + targeted questions storage

Phase 3 (runner, gated):

12. Runner queue + spawn + provenance
13. UI experiment builder + run button when enabled

## 14) Hard “no” list (to prevent long-term debt)

- No ad-hoc file reads in handlers.
- No duplicated JSONL parsing code.
- No duplicated Range streaming code.
- No storing env values or secrets.
- No reliance on transitive dependencies (only direct deps or Node built-ins).
