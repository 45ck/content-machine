# Data Model: Local Experiment Lab

Date: 2026-02-06
Status: MVP implemented (JSONL source-of-truth)

## 1) Storage strategy

Source of truth is append-only JSONL for durability and easy export/sharing.

Update semantics:

- Stores are append-only.
- For entities that need updates (e.g., experiments gaining a winner), the store may contain multiple
  records with the same id; readers treat the **last valid record** for an id as the current state.

Default locations:

- Feedback: `~/.cm/feedback/feedback.jsonl` (existing)
- Lab runs index: `~/.cm/lab/runs.jsonl`
- Lab experiments: `~/.cm/lab/experiments.jsonl`
- Lab session files (runner + optional events/idempotency):
  - `~/.cm/lab/sessions/<sessionId>/` (runner outputs)
  - `~/.cm/lab/sessions/<sessionId>/events.jsonl` (future `/api/events` and runner status; optional for MVP)
  - `~/.cm/lab/sessions/<sessionId>/idempotency.jsonl` (optional; requestId -> entityId mapping)

Exports:

- A single JSON file that includes all entities needed for analysis and reproducibility.

## 2) Identifiers

- `sessionId`: identifies a single Lab process (agent uses it to scope feedback).
- `runId`: identifies a registered artifacts directory.
- `experimentId`: identifies an A/B or A/B/N comparison.
- `variantId`: identifies a variant inside an experiment.
- `feedbackId`: identifies a human rating submission (field name is `id` in the current feedback schema).

All ids should be opaque strings (UUIDs with prefixes are acceptable).

## 3) Entity schemas (conceptual)

### LabRun

Minimum fields:

- `schemaVersion` (int)
- `runId`
- `sessionId`
- `createdAt` (ISO datetime)
- `topic` (optional)
- `artifactsDir` (absolute)
- `artifactsDirRealpath` (absolute; used for safe idempotent import)
- `fingerprint` (optional; used for safe idempotent import):
  - `video` (optional): `{ sizeBytes, mtimeMs, path }`
  - `script` (optional): `{ sizeBytes, mtimeMs, path }`
- `supersedesRunId` (optional; set when the same artifactsDir is re-imported but fingerprint differs)
- `videoPath` (optional absolute)
- `provenance` (optional):
  - `cmVersion`
  - `gitCommit`
  - `cwd`
  - `argv` (exact args for reproducibility, runner mode)
- `reports`:
  - known report paths (sync, caption quality, score)
- `autoMetricsSummary`:
  - normalized metrics for quick comparison

### LabExperiment

Minimum fields:

- `schemaVersion`
- `experimentId`
- `sessionId`
- `createdAt`
- `name`
- `hypothesis` (one sentence)
- `topic`
- `baseline` (either `runId` or `commandSpec`)
- `variants` (array):
  - `variantId`, `label`
  - `runId` or `commandSpec`
  - `diffFromBaseline` (machine-readable summary)
- `status` (queued/running/done/failed)
- `winner` (optional):
  - `variantId` or `runId`
  - `reason` (freeform)
- `questions` (optional):
  - agent-authored targeted questions to show in UI

Command spec shape (runner mode):

- `argv` array
- `envAllowlist` (keys only; never store secrets)
- `cwd`

### FeedbackEntry

This builds on the existing feedback schema in `src/feedback/schema.ts` and adds linking and
metrics snapshot fields.

Minimum fields:

- `schemaVersion`
- `id` (feedback id)
- `sessionId` (optional; required for entries created via Lab UI)
- `createdAt`
- `runId` (optional; required for entries created via Lab UI)
- optional `experimentId` + `variantId` (when feedback is part of an experiment)
- `ratings` (0-100):
  - baseline dimensions are optional; Lab defaults to:
    - `overall`, `hook`, `pacing`, `visuals`, `motion`, `captions`, `sync`
  - existing feedback ratings include `script`; Lab may keep it for backward compatibility
- `notes` (optional)
- `tags` (optional)
- `topic` (optional; may be inferred from `script.json`)
- `videoPath` and `artifactsDir` (optional; recommended for portability)
- `reports` (optional; discovered report paths for traceability)
- `autoMetricsSnapshot` (optional):
  - a copy of the normalized metrics at time of rating

## 4) Normalized metric conventions

Goal: allow comparisons and agent reasoning without re-parsing every report.

Recommended normalized fields:

- `syncRating` (0-100) + `syncLabel` + `meanDriftMs` + `maxDriftMs`
- `captionOverall` (0-100) + `captionCoverageRatio` + `ocrConfidenceMean`
- `proxyScoreOverall` (0-100) if score output exists

Rule: do not drop raw report paths; normalization is additive.

## 5) Cursors for polling/events

MVP approach:

- Cursor semantics for `GET /api/feedback` are defined in:
  `docs/dev/architecture/experiment-lab/EXPERIMENT-LAB-CURSOR-IDEMPOTENCY-20260206.md`.
- For MVP: `cursor` is a byte offset into the canonical feedback JSONL store
  (`~/.cm/feedback/feedback.jsonl`).

Future:

- `/api/events` may use a per-session monotonic event id stored in:
  `~/.cm/lab/sessions/<sessionId>/events.jsonl`.

Design requirement:

- Idempotent consumption: repeated polls should not duplicate feedback in agent logic.

## 6) Export format

Single JSON file:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-02-06T00:00:00.000Z",
  "sessionId": "lab_...",
  "runs": [],
  "experiments": [],
  "feedback": []
}
```

Rule:

- Export must be self-contained: include enough metadata to interpret feedback without the original filesystem.
