# PRD: Local Experiment Lab (Agent-in-the-Loop)

Date: 2026-02-06
Status: MVP implemented (review-only; runner pending)

## 1) Problem statement

We can generate short-form videos quickly, but improving output quality requires iteration.
Automated heuristics (sync rating, caption OCR quality, proxy scoring) are necessary but not sufficient:
humans must judge watchability, hook strength, pacing feel, visual relevance, and overall polish.

We need a local tool that lets a coding agent run structured experiments (baseline vs variants),
then collect human feedback in a high-UX UI, and export the combined dataset for iteration.

## 2) Primary users

1. Agent (Codex / coding agent)
   - Starts the Lab, proposes hypotheses, runs or requests runs, waits for feedback, exports and iterates.

2. Human evaluator (repo owner / operator)
   - Reviews videos and artifacts, submits ratings/notes with minimal friction.

3. Maintainer (you, later)
   - Extends metrics, adds new experiment templates, maintains contracts and stability.

## 3) Core loop

1. Agent creates an experiment with a hypothesis and a set of variants.
2. Human reviews baseline vs variant(s) in the Lab UI.
3. Human submits structured feedback.
4. Agent consumes the feedback (plus auto-metrics) to refine configuration/code and repeats.

## 4) In-scope features (MVP)

Review-only Lab:

- Start local UI: `cm lab`
- Import an artifacts directory (or video path that implies artifacts directory)
- Load and display:
  - video
  - `script.json`, `timestamps.json`, `visuals.json` (when present)
  - known reports (sync, caption quality, score) when present
- Compute and display a normalized auto-metrics summary (0-100 where possible)
- Feedback form that writes an entry to the local feedback store
- A/B compare UI for two runs (baseline and variant)
- Export a single JSON file (runs + experiments + feedback) for agent analysis

Agent integration:

- Session-scoped Lab instance:
  - Lab emits `sessionId` + URL in JSON mode for machine-readable handoff
  - Feedback entries created during the session include `sessionId`
- "Wait for feedback" support:
  - API to fetch feedback since a cursor (polling)
  - Optional SSE later (not required for MVP, but planned)

## 5) Explicit non-goals (MVP)

- No cloud backend or accounts
- No training pipelines
- No automatic config changes without an explicit hypothesis and rerun
- No mandatory generation execution from the UI (runner is optional and gated)

## 6) Quality requirements

Performance:

- `cm lab` cold start < 2 seconds on typical dev hardware.
- Run detail should render usable UI within 1 second after selecting a run (assuming local disk).
- Video seeking must be responsive (Range requests supported).

Maintainability:

- Small dependency surface.
- Versioned schemas and export formats.
- Unit and integration tests for critical paths (path safety, Range streaming, store integrity).

Safety:

- Localhost-only by default (bind 127.0.0.1).
- Runner disabled by default.
- Strict filesystem access: only registered run roots are readable.
- No arbitrary command execution; workflows exec hooks disabled unless explicitly allowed.

Evaluator UX:

- One command should be enough to get an evaluator into the intended task (often A/B compare).
- Avoid bias: do not show auto-metrics by default in A/B (allow reveal toggle).
- Fast completion: support a "one-shot" flow where submit ends the task (server may exit automatically).

## 7) Data captured per feedback (minimum)

- Links:
  - runId
  - optional experimentId + variantId
  - sessionId (lab instance)
- Human ratings (0-100):
  - overall
  - hook
  - pacing
  - visuals
  - captions
  - sync
- Notes (freeform)
- Tags (freeform list)
- Snapshot of key auto-metrics at the time of rating (so exports are self-contained)

## 8) Example hypotheses (templates)

- Captions: "Lower max CPS from 18 to 16 improves readability without reducing sync rating."
- Script: "Shorter per-scene word counts reduce caption density and improve watchability."
- Visuals: "More concrete visualDirection improves footage relevance."
- Sync: "Audio-first + reconcile improves perceived caption timing quality."

## 9) Open questions (default decisions unless overridden)

1. Runner enablement:
   - Default: disabled
   - Enable via `cm lab --enable-runner`

2. Rating dimensions:
   - Default: overall/hook/pacing/visuals/captions/sync
   - Allow experiment-specific extra questions (agent-authored prompts)

## 10) Success metrics (for the Lab itself)

- Evaluator completes an A/B rating in under 60 seconds.
- Agent can export a dataset that clearly ties "what changed" to "what improved".
- Iteration cadence improves (fewer ambiguous feedback notes, more targeted fixes).
