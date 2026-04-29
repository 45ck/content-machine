---
name: shot-prompt-builder
description: Convert a scene plan into stronger image or video generation prompts by using explicit shot language, movement, lighting, depth, and subject texture instead of generic style prefixes.
---

# Shot Prompt Builder

## Use When

- AI-generated scenes are part of the short.
- Existing prompts are too vague, repetitive, or style-prefix heavy.
- The scene plan already knows roughly what each beat should show, but
  the prompts need to become generation-ready.

## Core Rule

- Do not prepend the same aesthetic prefix to every scene and call that
  prompt design.
- Each prompt should encode why this shot is different:
  framing, movement, subject, texture, and lighting.

## Inputs

- scene description
- optional shot language:
  `shot_size`, `camera_movement`, `lens_mm`, `depth_of_field`,
  `lighting_key`, `color_temperature`
- optional `texture_keywords`
- optional high-level style context for the whole project

## Output

- one generation prompt per visual scene
- optional hero-scene markers for the scenes that deserve extra effort

## Prompt Construction Order

1. Camera:
   lens and depth of field
2. Framing and movement:
   wide, close-up, tracking, dolly, whip pan, etc.
3. Subject:
   the concrete thing happening in the scene
4. Texture:
   tactile descriptors, environment details, material cues
5. Lighting and color:
   high-key, neon, golden hour, tungsten, cold office, etc.
6. Style:
   only as a light final nudge, not the whole prompt

## Good Prompt Behavior

- prompts from adjacent scenes should not read like minor variations of
  the same sentence
- hero moments get stronger contrast, framing, or movement language
- the wording should be specific enough that an image model has a clear
  visual target
- prompts should reflect the beat's editorial job, not just its topic

## Bad Prompt Behavior

- `cinematic beautiful high quality futuristic style`
- repeating the same style clause on every scene
- only naming the subject with no shot intent
- scenes with no texture clues or no change in camera language

## Pair With

- Run after scene planning and before
  [`timestamps-to-visuals`](../timestamps-to-visuals/SKILL.md) if the
  pipeline is going to request generated scenes.
- Pair with
  [`scene-variation-check`](../scene-variation-check/SKILL.md) first if
  the underlying scene plan is already repetitive.

## Aggregated From

- `calesthio/OpenMontage` `shot_prompt_builder.py`
- `rushindrasinha/youtube-shorts-pipeline` niche-aware draft prompts

## Validation Checklist

- Each prompt encodes framing and subject, not just vibe.
- Adjacent prompts are visually distinct.
- Hero scenes are marked and read as higher-impact shots.
- Style language supports the prompt instead of replacing it.
