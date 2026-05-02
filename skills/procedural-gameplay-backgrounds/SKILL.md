---
name: procedural-gameplay-backgrounds
description: Use when creating, selecting, or adapting caption-clean 3D or procedural gameplay-like background loops for shorts without replacing the chosen content lane.
allowedTools:
  - shell
  - read
  - write
inputs:
  - name: style
    description: Gameplay-like style such as low-poly-runner, minecraft-parkour, satisfying-loop, shader-grid, or abstract-runner.
    required: true
  - name: duration
    description: Target loop or background duration in seconds.
    required: false
  - name: fps
    description: Target frames per second for generated or rendered loops.
    required: false
  - name: resolution
    description: Target output resolution, usually 1080x1920 for public portrait shorts.
    required: false
  - name: layout
    description: Full-screen background, split-screen gameplay lane, or ambient support layer.
    required: false
  - name: visualsPath
    description: Optional existing visuals.json to patch additively.
    required: false
  - name: outputDir
    description: Directory for generated plans, previews, clips, and source notes.
    required: false
  - name: sourcePolicy
    description: Source rule such as code-native, licensed model, user-supplied footage, or generated asset.
    required: false
  - name: captionSafeZone
    description: Caption/card safe-zone requirements that the background must preserve.
    required: false
  - name: loopable
    description: Whether the background should loop cleanly without a visible jump.
    required: false
outputs:
  - name: gameplay-background-plan.v1.json
    description: Style, timing, loop, safe-zone, and source-policy plan.
  - name: gameplay.mp4
    description: Optional rendered gameplay-like loop suitable for visuals.gameplayClip.path.
  - name: gameplay-preview-contact-sheet.jpg
    description: Optional review sheet for motion, safety, and loop quality.
---

# Procedural Gameplay Backgrounds

## Use When

- The short needs gameplay-like retention motion, but the user did not
  provide rights-cleared gameplay footage.
- A Reddit, confession, explainer, product, or educational short would
  benefit from a generated background rail.
- The agent should create or select a caption-clean background without
  changing the script archetype or story format.
- The user asks for 3D, low-poly, endless-runner, Minecraft-like,
  Subway-Surfers-like, satisfying-loop, shader, or abstract gameplay
  energy.

## Core Approach

1. Choose the content lane first. This skill only supplies a background
   or gameplay lane.
2. Prefer code-native or procedurally generated motion when rights to
   real gameplay are unclear.
3. Keep the background visually active but not information-dense.
4. Leave safe zones for captions, Reddit cards, receipts, and platform
   chrome.
5. Export a normal MP4 whenever possible so existing `gameplayClip`
   render paths can use it without special casing.
6. If using live JavaScript or Remotion code, keep it deterministic and
   frame-driven.

## Inputs

- style or reference direction
- target duration, FPS, and resolution
- layout hint: full-screen background, split-screen gameplay lane, or
  ambient support layer
- optional `timestamps.json` or `visuals.json` to match timing
- optional seed or palette
- source policy: code-native, licensed model, user-supplied footage, or
  generated asset

## Outputs

- `gameplay-background-plan.v1.json`
- optional `gameplay.mp4`
- optional `gameplay-preview-contact-sheet.jpg`
- optional `visuals.patch.json` or edited `visuals.json` proposal that
  adds the background without replacing existing scenes
- source and license notes for any external model, texture, or clip

## Additive Boundary

3D and procedural gameplay are visual treatments. They do not replace:

- Reddit opener cards
- stock footage
- local/user-supplied clips
- screen recordings
- generated images or AI video
- captions
- longform clipping and reframing
- publish-prep review

Choose the lane first, then use this skill only when the 3D or
procedural background makes the beat clearer, more native, or more
retentive.

## Optional Runtime Surface

No dedicated harness exists yet; this is currently an asset-producing
playbook. It should create or select a normal MP4 plus review notes that
existing visual and render surfaces can consume.

Use current surfaces as building blocks:

- `timestamps-to-visuals` can attach a gameplay clip through its
  `gameplay.clip` / `gameplay.style` request fields.
- `video-render` can render existing `visuals.gameplayClip.path`
  through split-screen or gameplay-backed templates.
- trusted Remotion code templates can carry richer 3D scenes behind the
  explicit template-code opt-in.

## Technical Notes

- Follow [`motion-design-coder`](../motion-design-coder/SKILL.md) for
  deterministic, frame-driven motion.
- Pair with
  [`reddit-post-over-gameplay-short`](../reddit-post-over-gameplay-short/SKILL.md)
  only as the gameplay layer; do not add unrelated B-roll.
- Pair with
  [`gameplay-confession-short`](../gameplay-confession-short/SKILL.md)
  as the lower or full-screen pacing rail, not as the story itself.
- Keep `three`, `@react-three/fiber`, and `@remotion/three` scoped to
  trusted code templates until a first-party 3D render path is proven.
- Use [`creative-source-scout`](../creative-source-scout/SKILL.md)
  before selecting external models, textures, gameplay references, or
  motion sites.
- Use [source-policy.md](references/source-policy.md) to decide between
  code-native loops, CC0 assets, licensed imports, user footage,
  generated loops, and reference-only sources.
- If external GLB/GLTF models are used, record license and attribution
  before promotion.

## Validation Checklist

- The output is a playable portrait MP4 with no black gutters.
- Motion is active enough to avoid freeze/static failures.
- Captions and cards remain readable over the background.
- The background contains no burned-in unrelated text or watermarks.
- The loop or full clip has no obvious jump unless the edit hides it.
- The visual lane still matches the chosen archetype.
- Any external model, texture, or footage has source and license notes.
- Public demos have contact-sheet review and publish-prep evidence
  before README promotion.
