---
name: timestamps-to-visuals
description: Turn timestamps into a `visuals.json` plan so the video stack can pick stock footage, gameplay, local media, or generated shots.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"timestampsPath":"output/content-machine/audio/timestamps.json","outputPath":"output/content-machine/visuals/visuals.json","provider":"pexels","orientation":"portrait"}'
entrypoint: node --import tsx scripts/harness/timestamps-to-visuals.ts
inputs:
  - name: timestampsPath
    description: Timing file that defines scene and word timing.
    required: true
  - name: outputPath
    description: Path that will receive the generated visuals.json file.
    required: false
  - name: provider
    description: Primary visual provider id.
    required: false
  - name: providers
    description: Optional explicit provider chain used instead of the single primary provider.
    required: false
  - name: orientation
    description: Orientation override such as portrait, landscape, or square.
    required: false
outputs:
  - name: visuals.json
    description: Per-scene visuals plan written to the requested output path.
  - name: visual-quality.json
    description: Metadata preflight report for visual readiness.
---

# Timestamps To Visuals

## Use When

- The user already has `timestamps.json` and wants the visuals step
  only.
- The agent needs a stable step before render or media generation work.
- Claude Code or Codex should produce `visuals.json` instead of
  freeform shot suggestions.
- The agent needs to route clean local footage, stock, gameplay, or
  generated shots into the render plan without sneaking already-captioned
  shorts into `visuals.json`.

## What This Skill Owns

- Translating spoken beats into visual beats.
- Picking footage that leaves room for caption treatment.
- Balancing clarity, pace, and motion across scenes.
- Enforcing the rule that winner shorts are references, not raw assets.

## Core Approach

1. Read the spoken timing as edit rhythm, not just timestamps.
2. Choose the archetype before choosing providers. Visual routing must
   obey the archetype.
3. Choose visuals that support the line being spoken instead of merely
   illustrating keywords.
4. Leave caption space intentionally. The frame is not full just because
   it can be.
5. Prefer raw, clean footage over already-finished internet shorts.
6. Escalate to generated media only when stock, local, or gameplay
   footage is the wrong fit.

## Archetype Routing Rules

- `reddit-post-over-gameplay`: gameplay only. Do not select stock
  footage, generated scenes, local B-roll, top-lane support clips, or
  keyword wallpaper. The visual plan should route one full-screen
  gameplay source plus Reddit/card and caption overlays.
- `reddit-story-split-screen`: use a Reddit opener, then top-lane
  story support plus bottom gameplay. Top-lane clips must be relevant
  receipts, screens, faces, or story-support motion.
- `gameplay-confession-split`: non-Reddit story support on top plus
  gameplay on bottom. Do not add Reddit chrome unless the source is
  actually Reddit-native.

## Inputs

- `timestamps.json`
- optional provider preferences
- optional local footage, gameplay, or routing hints
- orientation and framing constraints

## Outputs

- one `visuals.json` plan with enough scene metadata for render

## Output Contract

- Reads an existing `timestamps.json` file without modifying it.
- Writes one `visuals.json` file to the requested `outputPath`.
- Writes `visual-quality.json` beside `visuals.json` by default unless
  visual quality export is disabled.
- Provider selection comes from explicit `provider` / `providers`
  fields plus repo configuration, not ad hoc prompt interpretation.
- Local footage and gameplay are expected to be caption-clean raw media.
  If the only source is an already-published short, treat it as a
  `reverse-engineer-winner` input instead of reusing it as visual stock.
- Returns a JSON envelope with the final visuals path and generated
  scene count plus visual quality pass/score fields when exported.
- The main output is a usable cut plan, not keyword wallpaper.

## Optional Runtime Surface

- Repo-side runner:
  `node --import tsx scripts/harness/timestamps-to-visuals.ts`
- Supporting code:
  `src/harness/timestamps-to-visuals.ts`,
  `src/visuals/*`

## Validation Checklist

- `outputPath` exists and points to a valid `visuals.json` file.
- `visual-quality.json` exists by default and reports the metadata
  preflight result.
- The visuals plan covers the scenes implied by `timestamps.json`.
- Each visual entry includes enough metadata for downstream render work.
- Any local video assets are free of persistent burned-in source text.
- The planned visuals leave enough room for the caption treatment.
- The visuals plan still matches the chosen archetype.
