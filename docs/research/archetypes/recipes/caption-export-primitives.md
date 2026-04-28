# Recipe: Caption And Export Primitives

## Inputs

- Word timestamps.
- Target platform.
- Caption style.
- Export profile.

## Build Steps

1. Normalize word timestamps.
2. Chunk words into pages.
3. Apply caption style recipe.
4. Check safe zones.
5. Export ASS and SRT.
6. Render burned-in captions if required.
7. Encode MP4 with platform profile.
8. Validate dimensions, codec, audio, and visual readability.

## Required Reviews

- Caption density.
- Active word timing.
- Bottom/right platform UI clearance.
- Audio loudness.

## Useful Evidence

- `assets/20260429/claude-shorts/caption-styles.md`
- `assets/20260429/claude-shorts/platform-specs.md`
- `manifests/caption-style-recipes.json`
- `manifests/platform-export-profiles.json`
