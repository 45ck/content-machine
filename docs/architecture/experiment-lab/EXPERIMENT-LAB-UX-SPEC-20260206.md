# UX Spec: Local Experiment Lab

Date: 2026-02-06
Status: MVP implemented (review + A/B compare)

## 1) UX goals

- Fast evaluation: evaluator should be able to rate A/B in under 60 seconds.
- Minimal friction: keyboard-friendly, low scrolling, clear next steps.
- High signal for iteration: ratings map to fixable knobs; targeted questions reduce vague notes.
- Bias-aware: A/B compare hides auto-metrics by default; full blind labeling (hide baseline identity) can come later.
- Agent-friendly: support a "one-shot" review/compare flow where submit ends the task.

## 2) Information hierarchy (what matters most)

Top row (always visible):

- Which run(s) you are watching
- Key auto metrics (sync rating, caption quality, proxy score if available)
- Feedback submit panel

Secondary:

- Script and scene structure
- Visuals keywords and scene matching hints
- Raw reports JSON

## 3) Pages (MVP)

### A) Home / Runs

Features:

- "Import run" input: paste a path to artifactsDir or video file
- Runs list/table with quick metrics:
  - topic
  - createdAt
  - sync rating (if known)
  - caption overall (if known)
  - last human overall rating (if any)
- Actions:
  - Review
  - Compare (select 2 runs then open A/B)

Failure states:

- invalid path -> show "Fix:" hint
- missing video -> show "script-only" badge

### B) Review (single run)

Layout:

1. Left: video player
2. Right: feedback panel + metrics summary
3. Bottom: tabs for Script/Visuals/Captions/Reports

Video controls:

- play/pause
- seek bar (must be responsive)
- playback speed (0.75x, 1x, 1.25x, 1.5x)

Feedback panel (default dimensions):

- sliders (0-100): overall, hook, pacing, visuals, motion, captions, sync
- notes text area
- tags (typeahead optional, freeform)
- submit button

Auto-metrics panel:

- sync rating summary (if present)
- caption OCR quality summary (if present)
- warnings highlights (e.g., "caption CPS too high")

### C) Compare (A/B)

Layout:

- Two columns: A and B
- Shared synchronized controls:
  - play/pause together
  - seek together
  - optional "unlink" toggle

Metrics:

- By default, do not show auto-metrics or heuristic scores in A/B compare (avoid evaluator bias).
- Provide an explicit "Reveal metrics" toggle with a warning ("may bias you") for debugging.
- After submit, the UI may show metrics and deltas (post-rating) to help the operator understand what changed.

Feedback capture:

- "Pick winner" (A/B)
- per-dimension ratings should be captured as absolute ratings per run (A and B) by default
  (the UI can make this fast by copying A -> B and letting the evaluator edit deltas).
- fallback fast-path: single overall + "winner reason" when the evaluator is time-constrained
- targeted experiment questions (agent-authored) shown here

Submission semantics:

- Compare submission should be a single user action.
- UI should call `POST /api/experiments/:experimentId/submit` (one request) so the server can:
  - persist per-run feedback entries
  - persist the experiment winner + targeted question answers (if provided)
- If only a "winner reason" is provided, the server should store it at the experiment level and leave
  per-run ratings optional.

Completion UX:

- After a successful submit:
  - show a clear "Submitted" confirmation
  - show the next step ("You can close this tab" or "Next: compare the next pair")
- In "one-shot" mode, the server may auto-exit after the submission; the UI should gracefully handle
  server disconnect and present a final confirmation screen.

## 4) Keyboard and speed features (high ROI)

MVP keyboard shortcuts:

- `Space`: play/pause
- `J/K/L`: back/pause/forward (optional)
- `1..6`: focus rating sliders
- `Enter`: submit (when valid)

Auto-fill:

- On A/B, copy previous ratings as a starting point (user edits deltas).

## 5) Agent-authored targeted questions

Purpose: reduce vague notes and connect feedback to a hypothesis.

Example:

- Hypothesis: "Lower caption max CPS improves readability."
- Questions:
  - "Did captions feel easier to read in B?"
  - "Did you notice any timing mismatch in B?"

UI:

- Show questions at top of Compare view.
- Each question supports:
  - Yes/No/Unsure
  - optional short note

These are stored in the experiment review submission (`/api/experiments/:experimentId/submit`) as
`answers` (and optionally mirrored into the per-run feedback `extra` for traceability).

## 6) Accessibility

- All controls keyboard accessible.
- High contrast for text overlays.
- Avoid relying on color only for deltas (use +/- labels).

## 7) Future UX (v1.1+)

- Time-coded annotations (click timeline, add note at timestamp).
- Caption density heatmap overlay (CPS/WPM over time).
- Blind A/B (hide which is baseline).
- Guided hypothesis wizard templates ("captions", "script", "visuals", "sync").
