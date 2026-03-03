# Ship Checklist: Local Experiment Lab

Date: 2026-02-06
Status: Living checklist

This checklist is the exhaustive set of items to consider and verify while building the Lab.

## 1) Product correctness

- [ ] Runs can be imported from artifactsDir or from a video path.
- [ ] Import is idempotent (re-importing the same artifactsDir does not create duplicate run ids unless desired).
- [ ] Missing artifacts do not block feedback submission.
- [ ] A/B compare can be completed in under 60 seconds.
- [ ] Feedback submission is idempotent or protected against accidental double-submit.
- [ ] UI sends `X-CM-LAB-REQUEST-ID` for feedback submits; server dedupes and returns the original `feedbackId` on retry.
- [ ] Compare submit persists both sides + winner in one request (`POST /api/experiments/:id/submit`) and is idempotent.
- [ ] One-shot mode works: `cm lab compare ... --open --exit-after-submit 1` exits after successful submit.
- [ ] Export produces a single self-contained JSON file.
- [ ] Session scoping works (agent can export only feedback for a session).

## 2) Provenance and reproducibility

- [ ] Capture `cm` version for each run (runner mode) and in export.
- [ ] Capture git commit hash when available (runner mode).
- [ ] Capture exact argv for baseline and variants (runner mode).
- [ ] Store only env key names, never env values/secrets.
- [ ] Record "what changed" between baseline and variant (diff summary).

## 3) File access safety

- [ ] Server binds to 127.0.0.1 by default.
- [ ] Import rejects paths outside allowed roots (configurable).
- [ ] runId -> root mapping is the only way to fetch files.
- [ ] Artifact endpoint is strict allowlist (no arbitrary reads).
- [ ] Every file access path is resolved and validated as a child of run root.
- [ ] Symlink escape is prevented (validate `realpath` is under run root / allowed root).

## 4) Video streaming (performance)

- [ ] Supports HTTP Range requests.
- [ ] Streams using `createReadStream` with start/end (no full read into memory).
- [ ] Handles missing/invalid Range gracefully (falls back to full stream).
- [ ] Correct headers: `Accept-Ranges`, `Content-Range`, `Content-Length`.

## 5) Runner safety (optional feature, gated)

- [ ] Runner is disabled by default.
- [ ] Runner uses `spawn` with argv array, never a shell.
- [ ] Runner blocks workflow exec hooks unless explicitly allowed.
- [ ] Runner blocks network unless explicitly allowed.
- [ ] Runner exposes clear UI indicators for enabled capabilities.
- [ ] Runner handles partial failures and records them without corrupting stores.
- [ ] Runner enforces sequential queue by default (resource safety).
- [ ] Runner enforces unique output directories per run (no overwrites).
- [ ] Runner always passes `--keep-artifacts` for experiment runs.

## 6) API contract stability

- [ ] Stable error shape and codes.
- [ ] API includes `sessionId` in config and writes.
- [ ] POST endpoints require a session token header (CSRF mitigation).
- [ ] API list endpoints support cursors and do not duplicate items.
- [ ] Feedback polling endpoint supports `since` cursor and session filtering.
- [ ] Cursor semantics match `docs/dev/architecture/experiment-lab/EXPERIMENT-LAB-CURSOR-IDEMPOTENCY-20260206.md`.

## 7) UI/UX quality

- [ ] Keyboard-friendly: rating flow requires minimal mouse use.
- [ ] Clear next steps after submit (what to evaluate next).
- [ ] Visual deltas highlighted in compare view (not only color).
- [ ] Compare view hides auto-metrics by default; "Reveal metrics" is explicit and warns about bias.
- [ ] Tabs keep state and do not reset on small navigation.
- [ ] UI remains usable with missing reports or missing video.

## 8) Build and packaging

- [ ] UI bundle is shipped in npm package (`assets/lab/**`).
- [ ] `cm lab` locates UI assets correctly in dev (tsx) and dist (bundled CJS).
- [ ] No build step required at runtime.
- [ ] Export endpoints restrict output paths to a safe directory (no arbitrary file writes).

## 9) Testing

- [ ] Unit tests for: safe path resolution, allowlists, store read/append, metrics extraction.
- [ ] Integration test boots server and verifies key endpoints.
- [ ] Integration test validates Range streaming behavior.
- [ ] Runner tests use mocks and never require real API keys.

## 10) Observability (local)

- [ ] Human mode logs show useful info without polluting stdout.
- [ ] JSON mode stdout stays machine-readable and stable.
- [ ] Runner captures stderr/stdout for failed runs (for debugging).
