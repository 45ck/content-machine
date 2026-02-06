# TASK-027: Local Experiment Lab (MVP)

**Type:** Feature
**Priority:** P0
**Estimate:** L
**Created:** 2026-02-06
**Owner:** Unassigned
**Status:** Done

---

## Description

Implement a local-first Experiment Lab (`cm lab`) that lets a human evaluator review single runs and
A/B compares, submit structured feedback, and let agents poll/consume feedback deterministically for
iteration loops (config/code changes).

This is intentionally review-only by default; runner execution remains gated and can be added later.

---

## Acceptance Criteria

- [x] Given `cm lab --json`, when started, then it emits one JSON envelope containing `url` and `sessionId`.
- [x] Given `cm lab` in TTY mode, when started, then it prints a clickable URL and auto-opens by default (with `--no-open` escape hatch).
- [x] Given an artifacts directory under an allowed root, when imported, then it registers a `runId` and serves video/artifacts safely via `runId`-scoped endpoints.
- [x] Given two imported runs, when compared, then the UI provides side-by-side playback and a single "submit once" action that persists both sides + winner atomically.
- [x] Given a compare submit, when retried with the same `X-CM-LAB-REQUEST-ID`, then it does not create duplicate feedback entries.
- [x] Given agent polling, when calling `GET /api/feedback?since=<cursor>&sessionId=...`, then it returns new feedback without duplicates (byte-offset cursor semantics).
- [x] Given `cm lab compare <pathA> <pathB>`, when run in TTY, then it imports both and opens directly into compare with metrics hidden by default and exits after submit (with `--stay-open` escape hatch).

---

## Required Documentation

**Pre-Work (read these first):**

- [x] `docs/architecture/ADR-005-EXPERIMENT-LAB-LOCAL-FIRST-20260206.md`
- [x] `docs/architecture/experiment-lab/README.md`

**Deliverables (create these):**

- [x] `docs/architecture/experiment-lab/*-20260206.md` (design suite)

---

## Testing Considerations

**What needs testing:**

- Cursor semantics (byte offsets, partial trailing line, filtering).
- Safe path validation and symlink escape prevention.
- Video Range streaming headers and partial reads.
- Compare submit idempotency (request id dedupe).

**Risks:**

- Accidental arbitrary file read via traversal/symlink.
- Duplicate feedback via retries/double-submit.

**Dependencies:**

- None (Node built-ins; existing feedback store).

---

## Testing Plan

### Unit Tests

- [x] Cursor parsing + advancement
- [x] Safe path resolution and allowed roots checks
- [x] Range parsing helpers

### Integration Tests

- [x] Boot server, import fixture artifacts dir, fetch run detail
- [x] Range request to `/video`
- [x] Submit compare with `X-CM-LAB-REQUEST-ID` twice -> only one append
- [x] Poll feedback since cursor -> no duplicates

---

## Implementation Notes

**Key files:**

- `src/cli/commands/lab.ts`
- `src/lab/**`
- `assets/lab/**`
- `src/feedback/schema.ts` (extend for lab fields)

---

## Verification Checklist

- [x] All acceptance criteria met
- [x] `npm test` passes
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes

---

## Related

- Docs: `docs/architecture/experiment-lab/README.md`
