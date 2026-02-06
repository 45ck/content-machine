# Cursor + Idempotency: Local Experiment Lab

Date: 2026-02-06
Status: MVP implemented (cursor polling + idempotent submits)

## Overview

The Lab needs two reliability properties for the agent-in-the-loop workflow:

1. Agents can poll for new human feedback without duplicates or missed entries.
2. UI submits (and imports) are protected against accidental double-submits and safe to retry.

This document defines cursor semantics for polling and idempotency semantics for key POST endpoints.

## Goals

- Agent polling is deterministic: no duplicates, no missed feedback, restart-safe.
- Cursor semantics are easy to implement and test.
- Cursor works across multiple writers (Lab UI and `cm feedback` CLI) without extra plumbing.
- POST endpoints are safe to retry with an idempotency key.
- Keep the system local-first and dependency-light.

## Non-goals

- Strong distributed guarantees (no multi-host synchronization).
- Real-time push as the only mechanism (SSE/WebSocket can be added later, but polling must be correct).
- Perfect dedupe across arbitrary manual edits to the store files.

## Decision summary (normative)

1. `GET /api/feedback` uses a **byte-offset cursor** on the canonical feedback JSONL store:
   - store file: `~/.cm/feedback/feedback.jsonl`
   - cursor: a base-10 string integer representing a UTF-8 byte offset
2. `POST /api/feedback` SHOULD be idempotent via an idempotency key:
   - client sends `X-CM-LAB-REQUEST-ID: <uuid>` header
   - server dedupes within the current Lab session (and persists a tiny mapping to survive restart)
3. `POST /api/experiments/:experimentId/submit` SHOULD be idempotent via the same mechanism (one-shot compare):
   - a repeated request id must not duplicate per-run feedback entries or experiment decision state
4. `POST /api/runs/import` is idempotent by **canonical path + lightweight fingerprint**:
   - re-importing an unchanged artifacts directory returns the same `runId`
   - if the directory content fingerprint changes (e.g., overwritten output dir), import creates a new `runId`

## Cursor design: `GET /api/feedback`

### Cursor type

`cursor` is a string containing a non-negative base-10 integer (no prefix). It represents the number
of bytes (UTF-8) consumed from the start of `~/.cm/feedback/feedback.jsonl`.

Examples: `"0"`, `"184"`, `"10240"`.

### Request parameters

- `since` (optional): cursor string. Default is `"0"`.
- `sessionId` (optional but recommended for agents): returns only entries where `entry.sessionId === sessionId`
  (entries without `sessionId` are treated as non-matching).
- `limit` (optional): maximum number of returned entries. If provided, the server should stop scanning
  once it has collected `limit` returnable entries and return a `nextCursor` that allows a follow-up
  call to continue without missing entries.

### Response shape

```json
{
  "items": [],
  "nextCursor": "0"
}
```

Rules:

- `nextCursor` is always a string cursor (never `null`) for this endpoint.

### Semantics (must be implemented exactly)

1. **Exclusive cursor**: the server starts reading at byte offset `since`. Entries that are fully
   located before `since` are never returned again.
2. **Advance only past complete lines**: the server MUST NOT advance `nextCursor` past an incomplete
   trailing line (a line not terminated by `\n`). It may only advance to the byte immediately after
   the last processed newline.
3. **Filtering does not affect cursor advancement**: if `sessionId` is provided, the server filters
   returned items, but `nextCursor` still advances based on bytes consumed. This prevents agents from
   re-reading unrelated entries forever.
4. **Limit does not drop unseen entries**: if `limit` is provided, the server must stop reading after
   it has collected `limit` returnable entries (post-filter) and return a `nextCursor` that points to
   the last consumed newline. A subsequent call using that `nextCursor` must return the remaining
   entries.
5. **Malformed lines**:
   - If a line is complete (terminated by `\n`) but cannot be parsed/validated, the server should
     ignore it and still advance the cursor past it. This avoids a permanent poll loop.
   - Invalid trailing partial lines are never consumed (rule #2).
6. **Missing store file**: if `feedback.jsonl` does not exist, treat as empty and return
   `{ items: [], nextCursor: "0" }`.
7. **Cursor ahead of file**: if `since` is greater than the current file size, return
   `INVALID_CURSOR` with a suggested fix to reset `since` to `"0"`.

### Why byte-offset cursors

- Works across writers (Lab UI and `cm feedback`) because everyone appends to the same canonical file.
- Restart-safe without any per-session event plumbing.
- Efficient tailing: the server can read only the newly appended bytes.
- Keeps a single source of truth (the feedback JSONL store).

## Idempotency design

### `POST /api/feedback`

#### Client contract

Clients SHOULD send an idempotency key:

- `X-CM-LAB-REQUEST-ID: <uuid>` header

The UI should generate a new UUID for each user submission attempt and re-use it for retries.

#### Server contract

If `X-CM-LAB-REQUEST-ID` is present, the server MUST:

- Treat the request as idempotent within the current Lab session.
- If the same request id has already been processed successfully, return the original response
  (same `feedbackId`) and do not append a duplicate feedback entry.

Persistence recommendation (MVP):

- Store a per-session mapping in: `~/.cm/lab/sessions/<sessionId>/idempotency.jsonl`
- Each line: `{ "requestId": "...", "type": "feedback", "entityId": "fb_...", "createdAt": "..." }`

This keeps dedupe working after a Lab restart without introducing a database.

### `POST /api/experiments/:experimentId/submit`

This endpoint is the compare "submit once" path.

Idempotency contract:

- If `X-CM-LAB-REQUEST-ID` is present, the server MUST:
  - persist at most one "submission" for that request id
  - return the same `{ feedbackIds, experimentId }` response on retries

Practical implementation:

- The idempotency mapping record should include a stable response payload snapshot so retries can be
  answered without re-reading all stores.

### `POST /api/runs/import`

#### Idempotency rule

Import is idempotent by **canonical artifacts root + fingerprint**.

Canonicalization:

1. Resolve to absolute path.
2. If the input is a file, set `artifactsDir = dirname(path)` and optionally record `videoPath = path`.
3. Compute `artifactsDirRealpath = realpath(artifactsDir)` and use that as the key.

Lightweight fingerprint (recommended):

- `video.mp4` stat when present: `{ sizeBytes, mtimeMs }`
- `script.json` stat when present: `{ sizeBytes, mtimeMs }`

Idempotency behavior:

- If an existing `LabRun` has the same `artifactsDirRealpath` AND the same fingerprint, return the
  existing `runId`.
- If the `artifactsDirRealpath` matches but the fingerprint differs, create a new `runId` and store:
  - `supersedesRunId` (optional) to preserve history and make overwrites obvious in the UI.

Rationale: evaluators often re-run into the same output directory. Fingerprinting prevents the Lab
from silently treating overwritten runs as the same run.

## Alternatives considered (cursor + dedupe)

Criteria (1..5): Maintainability, Minimal deps, Robustness, Cross-process support, Testability.

| #   | Option                | Cursor       | Dedupe            | Pros                   | Cons                         |
| --- | --------------------- | ------------ | ----------------- | ---------------------- | ---------------------------- |
| 1   | Byte offset (chosen)  | file offset  | request id        | simplest, cross-writer | must handle partial lines    |
| 2   | Per-session event seq | int seq      | request id        | clean per-session      | needs extra event plumbing   |
| 3   | Global event seq      | int seq      | request id        | clean global           | requires atomic counter      |
| 4   | Timestamp cursor      | ISO time     | none              | easy                   | duplicates/misses likely     |
| 5   | UUID cursor           | id sort      | none              | easy                   | not monotonic                |
| 6   | SQLite                | rowid        | unique constraint | very robust            | heavier deps/ops             |
| 7   | FS watcher            | n/a          | none              | instant                | cross-platform pain          |
| 8   | SSE only              | recon cursor | request id        | great UX               | still needs cursor semantics |
| 9   | One file per entry    | file name    | file exists       | idempotent by fs       | lots of files                |
| 10  | In-memory only        | memory       | memory            | trivial                | breaks on restart            |

### Scoring (calibrated, ranking only)

Scale: 1..5 (higher is better).

| #   | Option                | M   | F   | R   | C   | T   | Notes                     |
| --- | --------------------- | --- | --- | --- | --- | --- | ------------------------- |
| 1   | Byte offset           | 5   | 5   | 4   | 5   | 4   | simplest robust MVP       |
| 2   | Per-session event seq | 4   | 4   | 4   | 3   | 4   | more plumbing; ok later   |
| 3   | Global event seq      | 3   | 4   | 5   | 5   | 4   | needs atomic counter/lock |
| 4   | Timestamp             | 4   | 5   | 2   | 4   | 3   | hard to make correct      |
| 5   | UUID sort             | 4   | 5   | 1   | 4   | 3   | not monotonic             |
| 6   | SQLite                | 4   | 3   | 5   | 5   | 4   | great, but heavier        |
| 7   | FS watcher            | 2   | 3   | 3   | 2   | 2   | portability issues        |
| 8   | SSE only              | 3   | 3   | 4   | 3   | 3   | still needs cursor        |
| 9   | File per entry        | 2   | 4   | 4   | 5   | 3   | too many files            |
| 10  | In-memory only        | 5   | 5   | 1   | 1   | 3   | breaks on restart         |

Legend:

- M = Maintainability
- F = Fast start / minimal deps
- R = Robustness (no misses/dupes)
- C = Cross-process support (multiple writers)
- T = Testability

## Testing plan (ship gate)

Unit tests:

- Cursor parsing: invalid, negative, non-integer.
- Cursor advancement: partial trailing line does not advance past last `\n`.
- Filtering: `sessionId` filter does not change `nextCursor`.
- Cursor ahead of file: returns `INVALID_CURSOR`.

Integration tests:

- Start server, submit feedback, poll `since=0` returns entry and advances cursor.
- Poll again with returned cursor returns no duplicates.
- Simulate double-submit with same `X-CM-LAB-REQUEST-ID` returns same `feedbackId` and appends only once.
- Import the same artifactsDir twice returns the same `runId` when fingerprint is unchanged.

## Related

- API: `docs/architecture/experiment-lab/EXPERIMENT-LAB-API-CONTRACT-20260206.md`
- Data model: `docs/architecture/experiment-lab/EXPERIMENT-LAB-DATA-MODEL-20260206.md`
- Engineering plan: `docs/architecture/experiment-lab/EXPERIMENT-LAB-ENGINEERING-PLAN-20260206.md`
- Ship checklist: `docs/architecture/experiment-lab/EXPERIMENT-LAB-CHECKLIST-20260206.md`
