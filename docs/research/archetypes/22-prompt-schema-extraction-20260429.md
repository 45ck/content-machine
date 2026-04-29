# Prompt And Schema Extraction

Date: 2026-04-29

## Purpose

The deeper repo pass shows that high-quality short-form generators separate
creative prompts from runtime contracts. Prompts describe voice, intent,
pacing, and output style. Schemas define the machine-readable artifacts that
downstream stages can validate, render, retry, and review.

## Source Signals

| Source                             | Signal                                                                                                             | Content-machine takeaway                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `1Dengaroo__rshorts`               | Zod schemas for story request, generated story, caption request, and Remotion render props                         | Keep API/runtime contracts typed and narrow                         |
| `1Dengaroo__rshorts` story prompt  | Strong style prompt with JSON output, target word count, tone, segment count, dialogue, and title rules            | Prompt should own creative voice, schema should own shape           |
| `calesthio__OpenMontage`           | JSON Schemas for scene plans, asset manifests, decision logs, render reports, reviews, cost logs, and publish logs | Treat every agent stage as an auditable artifact producer           |
| `chenwr727__AI-Short-Video-Engine` | TOML prompt templates for podcast and dialogue formats                                                             | Store prompt families as versioned templates, not buried strings    |
| `imgly__videoclipper`              | Transcript trimming prompt forbids invented words and returns strict JSON                                          | Longform edits need transcript-token integrity rules                |
| `ArcReel__ArcReel`                 | Prompt builders and structured planning docs                                                                       | Centralize prompt construction so UI and skill flows share behavior |

## Contract Pattern

Each stage should have four files or equivalents:

1. Prompt template
   - Human-readable instructions, examples, voice rules, and quality rules.
   - Versioned by archetype and task.

2. Input schema
   - Required user input, source assets, platform target, and allowed options.
   - Should reject ambiguous or unsafe inputs early.

3. Output schema
   - Durable JSON contract that downstream stages consume.
   - Should include version, provenance, confidence, and review warnings.

4. Validator or repair path
   - Zod, JSON Schema, or Pydantic validation.
   - Optional LLM repair should never silently change source facts or source
     transcript wording.

## Short-Form Schema Families

### Script And Story

Runtime artifacts:

- `script-plan.v1.json`
- `script-draft.v1.json`
- `script-review.v1.json`

Required fields:

- archetype
- target duration
- target word count
- hook text
- scene or segment list
- voice/tone
- facts or source transcript references
- constraints followed
- constraints violated

### Director Score And Scene Plan

Runtime artifacts:

- `director-score.v1.json`
- `scene-plan.v1.json`

Required fields:

- scene id
- narrative role
- information role
- visual intent
- required assets
- camera or layout language
- caption behavior
- music or sound role
- quality gates

### Longform Clip Editing

Runtime artifacts:

- `clip-candidates.v2.json`
- `transcript-edit.v1.json`

Required fields:

- source transcript span
- start and end timestamps
- kept words
- removed words or ranges
- hook
- estimated duration
- selection reason
- source-word integrity status

### Assets And Rendering

Runtime artifacts:

- `asset-ledger.v1.json`
- `visual-match-report.v1.json`
- `render-request.v1.json`
- `render-report.v1.json`

Required fields:

- asset source and license
- prompt/model/seed for generated assets
- scene link
- selected renderer
- render warnings
- final output paths
- platform target

## Implementation Notes

The repo evidence argues against a single all-purpose "make video" prompt.
Content-machine should route by archetype, choose the prompt family, and
validate the artifact before moving to the next stage.

The videoclipper prompt is important for longform work because it enforces a
hard rule: edited transcript text can delete source words but cannot invent
new ones. That rule should live in both prompt text and validator behavior.

OpenMontage's artifact schemas are the broadest target model. Their useful
idea is not the exact field names; it is that planning, asset generation,
decisions, render outputs, and reviews all become explicit files.

## Bead Targets

This report supports:

- `content-machine-ar8`: DirectorScore scene-plan artifact.
- `content-machine-ar9`: first-class runtime artifacts.
- `content-machine-ar11`: typed prompt/schema contracts.
