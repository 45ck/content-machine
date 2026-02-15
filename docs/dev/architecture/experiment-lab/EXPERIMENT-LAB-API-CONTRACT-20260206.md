# API Contract: Local Experiment Lab

Date: 2026-02-06
Status: MVP implemented (review-only; runner endpoints pending)

## 1) Principles

- Local only: server binds to 127.0.0.1 by default.
- No arbitrary filesystem reads: all access is via registered `runId`.
- Stable error shape for agent robustness.
- Video streaming must support HTTP Range.
- All API mutations (POST endpoints) require a per-session token header to mitigate local CSRF.

## 2) Common response shapes

### Error response (non-200)

```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "Human readable message",
    "context": { "fix": "Suggested fix", "details": "..." }
  }
}
```

### Cursor-based list responses

```json
{
  "items": [],
  "nextCursor": "opaque-or-null"
}
```

### Mutation auth (required headers)

All POST endpoints require:

- `Content-Type: application/json`
- `X-CM-LAB-TOKEN: <session token>`

Optional (recommended for idempotency on retries / double-submit protection):

- `X-CM-LAB-REQUEST-ID: <uuid>`

The token is generated per Lab session and is discoverable by the served UI (e.g. from `/api/config`).
This token is not a secret against a determined local attacker; its purpose is to block drive-by form
POSTs that cannot set custom headers.

## 3) Endpoints (MVP)

### GET /api/config

Returns Lab configuration and session info.

Response:

```json
{
  "sessionId": "lab_...",
  "token": "tok_...",
  "version": "0.2.2",
  "runnerEnabled": false,
  "runnerAllowNetwork": false,
  "runnerAllowWorkflowExec": false,
  "allowedRoots": ["/home/user/output"],
  "ui": {
    "blindMetricsDefault": true,
    "revealMetricsEnabled": true
  },
  "task": null,
  "exitAfterSubmit": 0
}
```

Notes:

- `task` is `null` by default.
- In one-shot mode, `task` can instruct the UI to start directly in a workflow. Example:

```json
{
  "task": { "type": "compare", "experimentId": "exp_..." },
  "exitAfterSubmit": 1
}
```

### POST /api/runs/import

Body:

```json
{ "path": "/abs/path/to/artifacts-or-video" }
```

Response:

```json
{ "runId": "run_..." }
```

Notes:

- If the path is a file, its directory is treated as `artifactsDir`.
- The server may infer `videoPath` by matching `*.mp4` or by known filename conventions.
- Import fails fast if no recognizable artifacts are found (must contain at least one known artifact
  or a video).
- Import should be idempotent by default (see cursor/idempotency doc).

### GET /api/runs

Response:

```json
{
  "items": [
    {
      "runId": "run_...",
      "sessionId": "lab_...",
      "createdAt": "2026-02-06T00:00:00.000Z",
      "topic": "Redis vs Postgres",
      "artifactsDir": "/abs/path",
      "videoPath": "/abs/path/video.mp4",
      "autoMetricsSummary": { "syncRating": 82, "captionOverall": 78 }
    }
  ],
  "nextCursor": null
}
```

### GET /api/runs/:runId

Response includes discovered artifacts and parsed summaries where available:

```json
{
  "runId": "run_...",
  "sessionId": "lab_...",
  "createdAt": "2026-02-06T00:00:00.000Z",
  "topic": "Test topic",
  "artifactsDir": "/abs/path",
  "videoPath": "/abs/path/video.mp4",
  "artifacts": {
    "script": true,
    "timestamps": true,
    "visuals": true,
    "score": false,
    "reports": { "sync": true, "caption": false }
  },
  "autoMetricsSummary": { "syncRating": 82, "captionOverall": null }
}
```

### GET /api/runs/:runId/video

Streams the video. Must support:

- `Accept-Ranges: bytes`
- `Range: bytes=start-end` requests
- `HEAD` requests (video elements may probe headers)

### GET /api/runs/:runId/artifact/:name

`name` is restricted to a safe allowlist:

- `script.json`
- `timestamps.json`
- `visuals.json`
- `score.json`
- known report names (server-defined)

Response: JSON file content.

### POST /api/experiments

Creates an experiment entity that links baseline + variants (review-only or runner).

Body:

```json
{
  "name": "Caption CPS experiment",
  "hypothesis": "Lower caption max CPS improves readability without hurting sync.",
  "topic": "Redis vs Postgres",
  "baselineRunId": "run_...",
  "variants": [{ "label": "B", "runId": "run_..." }],
  "questions": [
    { "id": "q1", "prompt": "Were captions easier to read in B?", "type": "yes_no_unsure" }
  ]
}
```

Response:

```json
{ "experimentId": "exp_..." }
```

Notes:

- This endpoint is available even when runner is disabled.
- Runner execution is a separate endpoint (`POST /api/experiments/:experimentId/run`).

### GET /api/experiments

Response:

```json
{
  "items": [
    {
      "experimentId": "exp_...",
      "sessionId": "lab_...",
      "createdAt": "2026-02-06T00:00:00.000Z",
      "name": "Caption CPS experiment",
      "topic": "Redis vs Postgres",
      "status": "done"
    }
  ],
  "nextCursor": null
}
```

### GET /api/experiments/:experimentId

Response:

```json
{
  "experimentId": "exp_...",
  "sessionId": "lab_...",
  "createdAt": "2026-02-06T00:00:00.000Z",
  "name": "Caption CPS experiment",
  "hypothesis": "Lower caption max CPS improves readability without hurting sync.",
  "topic": "Redis vs Postgres",
  "baselineRunId": "run_...",
  "variants": [{ "variantId": "var_...", "label": "B", "runId": "run_..." }],
  "status": "done",
  "winner": { "variantId": "var_...", "reason": "Captions easier to read." },
  "questions": [
    { "id": "q1", "prompt": "Were captions easier to read in B?", "type": "yes_no_unsure" }
  ]
}
```

### POST /api/experiments/:experimentId/submit

Submits an A/B review in a single request (one-shot UX) and persists:

- the per-run feedback entries
- the experiment winner + question answers (if provided)

Body:

```json
{
  "requestId": "optional-client-generated-uuid",
  "winnerVariantId": "var_...",
  "reason": "B captions easier to read; pacing felt the same.",
  "answers": { "q1": "yes" },
  "perRun": [
    {
      "runId": "run_...",
      "variantId": "baseline",
      "ratings": {
        "overall": 72,
        "hook": 60,
        "pacing": 70,
        "visuals": 65,
        "captions": 68,
        "sync": 80
      },
      "notes": "Captions dense early",
      "tags": ["captions-dense"]
    },
    {
      "runId": "run_...",
      "variantId": "var_...",
      "ratings": {
        "overall": 80,
        "hook": 60,
        "pacing": 70,
        "visuals": 65,
        "captions": 85,
        "sync": 80
      },
      "notes": "Much easier captions",
      "tags": ["captions-better"]
    }
  ]
}
```

Response:

```json
{ "experimentId": "exp_...", "feedbackIds": ["fb_...", "fb_..."] }
```

### POST /api/feedback

Body:

```json
{
  "requestId": "optional-client-generated-uuid",
  "runId": "run_...",
  "experimentId": "exp_...",
  "variantId": "var_...",
  "ratings": {
    "overall": 80,
    "hook": 70,
    "pacing": 75,
    "visuals": 60,
    "motion": 72,
    "captions": 85,
    "sync": 90
  },
  "notes": "Hook too generic",
  "tags": ["needs-hook", "visuals-off"]
}
```

Response:

```json
{ "feedbackId": "fb_..." }
```

Notes:

- Clients should send `X-CM-LAB-REQUEST-ID` (preferred) or `requestId` (body) for idempotency.
- If the same request id is replayed, the server should return the original `feedbackId` and not
  append a duplicate entry.

### GET /api/feedback?since=<cursor>&sessionId=<id?>

Returns feedback entries, optionally filtered by sessionId. Used by agents to wait/poll.

Cursor semantics:

- Defined in `docs/dev/architecture/experiment-lab/EXPERIMENT-LAB-CURSOR-IDEMPOTENCY-20260206.md`.
- For MVP: `since` is a byte-offset cursor into the canonical feedback JSONL store.
- `nextCursor` is a cursor string to use for the next poll (never `null` for this endpoint).

Response:

```json
{
  "items": [
    /* feedback entries */
  ],
  "nextCursor": "..."
}
```

### POST /api/export

Body:

```json
{ "sessionId": "lab_...", "path": "/abs/path/export.json" }
```

Response:

```json
{ "path": "/abs/path/export.json", "count": 12 }
```

Notes:

- If `path` is omitted, the server writes to a safe default under `~/.cm/lab/exports/`.
- If `path` is provided, the server must restrict it to a safe directory (e.g. `~/.cm/lab/exports/` or
  a configured allowed root) to avoid arbitrary file writes.

## 4) Runner endpoints (only when enabled)

### POST /api/experiments/:experimentId/run

Runs baseline + variants via child process runner and registers resulting runs.

Notes:

- When runner is enabled, `GET /api/experiments/:experimentId` may include additional runner progress/log fields.

## 5) Events (planned)

SSE (future):

- `GET /api/events?since=<cursor>`
- Events: `feedback_created`, `run_imported`, `experiment_status`

MVP can ship with polling only.
