# Procedural Gameplay Source Policy

Use this when deciding whether a gameplay-like background should be
code-native, imported, generated, or user-supplied.

## Preferred Order

1. `code-native`: original Three.js, Remotion, SVG, Canvas, shader, or
   procedural loop. Best default for OSS demos.
2. `cc0-assets`: Poly Haven, ambientCG, Kenney-style CC0 assets with
   stored source notes.
3. `licensed-asset`: model, texture, animation, font, audio, or clip
   with explicit compatible license and attribution record.
4. `user-supplied`: user footage or asset with a declared permission
   note and source-media review.
5. `generated-asset`: AI-generated loop with provider/model/job
   provenance and watermark review.
6. `reference-only`: unclear sources that may inform style but cannot
   enter the render.

## Loop Patterns

- low-poly road or tunnel
- lane runner with gates, coins, ramps, or obstacles
- shader grid with camera drift
- parallax city/terrain corridor
- abstract satisfying-loop rails
- simple avatar/character run cycle with caption-safe framing

## Technical Rules

- Build at `1080x1920`, `30fps`, and `6-12s` unless the video plan
  requires otherwise.
- Make motion loop with modulo time or hide the seam behind an edit.
- Keep central caption/card zones quiet and low detail.
- Do not include game HUD text, score counters, watermarks, logos, or
  unrelated source captions.
- For Remotion 3D, prefer `@remotion/three` `<ThreeCanvas>` with
  `useCurrentFrame()` over live `useFrame()` loops.
- For imported GLB/GLTF, record model, texture, animation, author, and
  license separately.

## Review Artifacts

- `gameplay-background-plan.v1.json`
- `source-notes.json`
- `asset-ledger.v1.json` when external assets are used
- `gameplay-preview-contact-sheet.jpg`
- final `gameplay.mp4`
