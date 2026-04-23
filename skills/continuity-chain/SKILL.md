---
name: continuity-chain
description: Generate multi-scene AI video sequences with better visual continuity by chaining each scene from the last frame of the previous clip and resuming cleanly when some scenes already exist.
---

# Continuity Chain

## Use When

- A short uses multiple generated video scenes that should feel like one
  evolving world.
- You are making AI-generated visual sequences rather than isolated
  clips.
- A prior chain run was interrupted and should resume without losing the
  successful scenes.

## Core Rule

- If scene-to-scene continuity matters, generate scenes as a chain, not
  as independent prompts.

## Inputs

- first seed image or first clip
- ordered scene list
- default chain prompt or per-scene prompts
- output directory for generated clips

## Outputs

- ordered generated clips
- resume-safe scene inventory
- continuity notes:
  which scene seeded which next scene

## Workflow

1. Seed scene 1 from the chosen image or initial clip.
2. For each later scene, extract the last frame of the previous clip.
3. Use that extracted frame as the input image for the next generation.
4. Skip scenes that already rendered successfully unless regeneration is
   required.
5. Keep the chain order explicit so a failed scene does not corrupt the
   rest of the run.

## Good Uses

- motion-led mythology or fantasy sequences
- faceless explainers with connected generated visual worlds
- AI-image-to-video chains where abrupt style resets would look cheap

## Bad Uses

- scenes that intentionally need strong visual discontinuity
- generated clips with no sequential narrative relationship
- silently continuing a chain after a failed scene without noting the
  break

## Pair With

- Use after [`shot-prompt-builder`](../shot-prompt-builder/SKILL.md)
  when several prompts belong to one continuous generated sequence.
- Pair with [`partial-regeneration`](../partial-regeneration/SKILL.md)
  to resume interrupted scene chains.

## Aggregated From

- `digitalsamba/claude-code-video-toolkit` `chain_video.py`
- image-to-video continuity practices from generated short pipelines

## Validation Checklist

- Each scene's seed source is recorded.
- Existing successful scenes are skipped safely on resume.
- Failed scenes do not get silently treated as valid chain inputs.
- Visual continuity is materially better than independent scene
  generation.
