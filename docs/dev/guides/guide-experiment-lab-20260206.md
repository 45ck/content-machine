# Guide: Experiment Lab (Human Feedback Loop)

Date: 2026-02-06
Status: Current (review-only; runner pending)

The Experiment Lab is a local web UI + API used to collect structured human feedback on generated
videos, especially one-shot A/B comparisons.

## When to use

Use the Lab whenever you make a change that affects perceived quality (prompts, caption settings,
sync strategy, visuals matching) and you need a fast, bias-aware human evaluation loop.

## Quick start: One-shot A/B compare (recommended)

1. Produce two runs (baseline A and variant B) that each have an artifacts directory containing at
   least `video.mp4` (and ideally `script.json`, `timestamps.json`, `visuals.json`, and reports).
2. Launch one-shot compare:

```bash
cm lab compare /abs/path/to/A/video.mp4 /abs/path/to/B/video.mp4 \
  --hypothesis "Lower caption max CPS improves readability without hurting sync."
```

3. The browser opens directly into Compare (linked playback). Auto-metrics are hidden by default to
   reduce evaluator bias.
4. Fill ratings (A + B), optionally select a winner and add notes/tags, then click Submit once.
5. In one-shot mode the Lab server auto-exits after submission (use `--stay-open` to keep it alive).

## Alternative: Long-running session (manual import)

Start the Lab and import runs in the UI:

```bash
cm lab
```

If your artifacts live outside the repo root or `./output`, add allowlisted roots:

```bash
cm lab --allow-root /abs/path/to/other-output
```

## Where feedback is stored

Feedback entries are appended to:

- default: `~/.cm/feedback/feedback.jsonl`
- override: `CM_FEEDBACK_STORE_PATH=/abs/path/feedback.jsonl`

Entries written via the Lab include `sessionId`, and usually `runId` plus optional `experimentId`.

## Agent consumption (polling + export)

While the Lab server is running, agents can poll:

- `GET /api/feedback?since=0&sessionId=<lab_session_id>`
- The cursor is a byte offset into the JSONL file; always reuse the returned `nextCursor`.

For a combined dataset (runs + experiments + feedback), use the API export endpoint:

- `POST /api/export` (requires `X-CM-LAB-TOKEN`, available from `GET /api/config`)

If you want to export after a one-shot compare, start the Lab with `--stay-open` so the server
remains available for the export request.

## Writing good hypotheses

Keep the loop high-signal:

1. Change one knob.
2. Predict one observable improvement.
3. Define what “better” means in the rubric (overall, hook, pacing, visuals, motion, captions, sync).
4. Add one sentence of “what to look for” in the compare notes prompt.

## Related docs

- Architecture suite: `docs/dev/architecture/experiment-lab/README.md`
- ADR: `docs/dev/architecture/ADR-005-EXPERIMENT-LAB-LOCAL-FIRST-20260206.md`
