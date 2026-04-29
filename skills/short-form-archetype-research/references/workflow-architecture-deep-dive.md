# Workflow Architecture Deep Dive

Date: 2026-04-29

## Purpose

The stronger repos behave less like one-shot generators and more like small
production systems. They keep projects, tasks, queues, progress events,
decision logs, cost logs, approval states, and version history. This report
translates that architecture into content-machine changes.

## Source Signals

| Source                             | Signal                                                                                 | Content-machine takeaway                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `zhouxiaoka__autoclip`             | Projects, task queue, progress, topic timelines, scored collections                    | Longform clipping needs task state and curated candidate sets   |
| `calesthio__OpenMontage`           | Agent stages, provider scoring, cost estimates, decision logs, review artifacts        | Agent workflows need auditable stage boundaries                 |
| `ArcReel__ArcReel`                 | Version history, rollback, provider abstraction, queues, asset preview, CapCut handoff | Generated assets and scene plans need versions                  |
| `xhongc__ai_story`                 | Storyboards, asset versions, camera motion, rollback, prompt/model management          | Continuity-heavy stories need project state, not isolated files |
| `chenwr727__AI-Short-Video-Engine` | Provider interfaces for material search, TTS, LLM, subtitle, and video                 | Runtime dependencies should be provider-swappable               |
| `imgly__videoclipper`              | Transcript refinement and strict edit constraints                                      | Review state should preserve source text integrity              |

## Proposed Project Model

Each run should be represented as a project folder with predictable artifacts:

- `request.json`
- `run-ledger.v1.jsonl`
- `decision-log.v1.json`
- `asset-ledger.v1.json`
- `director-score.v1.json` or `clip-candidates.v2.json`
- `caption-recipe.v1.json`
- `crop-plan.v1.json`
- `render-runtime-decision.v1.json`
- `render-report.v1.json`
- `publish-review.v1.json`

The project folder should be resumable. A failed render should not force
rerunning transcript analysis or script generation.

## State Machine

Recommended states:

- `requested`
- `analyzing`
- `planned`
- `assets_pending`
- `assets_ready`
- `approval_pending`
- `rendering`
- `rendered`
- `review_pending`
- `approved`
- `rejected`
- `published`
- `archived`

Approval gates should be available after planning, after asset generation, and
after render review. A fast path can auto-approve low-risk stages, but the
state should still be recorded.

## Run Ledger Events

`run-ledger.v1.jsonl` should capture:

- stage started
- stage completed
- provider selected
- model selected
- cost estimated
- cost incurred
- artifact written
- validation warning
- user approval
- retry requested
- fallback used
- render output created

This aligns with the repo direction toward observability and makes agent
handoffs easier.

## Versioning And Rollback

Version these artifacts when regenerated:

- scripts
- scene plans
- visual prompts
- generated images or clips
- caption recipes
- crop plans
- render decisions

Rollback should choose a known prior artifact version and rerun only affected
downstream stages.

## Provider Boundary

Provider decisions should be explicit for:

- LLM
- TTS
- ASR
- stock search
- image generation
- video generation
- renderer
- hosting or upload target

Each provider choice should include reason, expected cost, limits, and fallback
behavior in the decision log.

## Bead Targets

This report supports:

- `content-machine-ar1`: skill-driven routing.
- `content-machine-ar8`: DirectorScore scene-plan artifact.
- `content-machine-ar9`: first-class runtime artifacts.
- `content-machine-ar13`: project workflow ledger, approval, and rollback.
