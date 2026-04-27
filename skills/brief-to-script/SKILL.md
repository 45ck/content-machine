---
name: brief-to-script
description: Turn a topic, packaging hint, or blueprint into a script file that the rest of the pack can use.
---

# Brief To Script

## Use When

- The user wants a fresh script from a topic or short brief.
- The agent already has packaging, research, or blueprint files and
  needs the next script file.
- Claude Code or Codex should produce a reusable `script.json` rather
  than freeform prose.

## What This Skill Owns

- Hook quality and first-line momentum.
- Scene rhythm that can survive chunked captions.
- Matching script structure to the chosen archetype or blueprint.
- Writing for spoken delivery instead of blog-style reading.

## Core Approach

1. Start from the packaging promise, not the topic label.
2. Build around spoken payoff beats, not paragraph logic.
3. Keep scenes short enough that captions and visuals can both breathe.
4. Write lines that survive voice delivery without sounding read off a
   page.
5. If a blueprint exists, treat it as structure and pacing guidance, not
   handcuffs for exact wording.

## Inputs

- a topic, angle, or packaging promise
- optional script archetype such as `story`, `listicle`, `versus`,
  `howto`, or `product-demo`
- optional `laneId` only as context for tone and pacing; do not use the
  lane ID as the script archetype
- optional research, packaging, or blueprint files

## Outputs

- one reusable `script.json`
- scenes that downstream audio, caption, and visual steps can actually
  use

## Output Contract

- Writes one `script.json` file to the requested `outputPath`.
- If `packagingPath`, `researchPath`, or `blueprintPath` are supplied,
  they must already exist.
- The main success condition is that the script is speakable, scannable,
  and editable downstream.

## Optional Runtime Surface

- Repo-side runner:
  `node --import tsx scripts/harness/brief-to-script.ts`
- Supporting code:
  `src/harness/brief-to-script.ts`,
  `src/script/*`

## Validation Checklist

- `outputPath` exists.
- Script title and scene count are non-empty.
- The hook lands quickly and the body supports short-form pacing.
- Lines read like speech, not article prose.
- If a blueprint was provided, downstream checks should confirm the
  generated script still matches that blueprint.
