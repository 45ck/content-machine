# Recipe: Longform Clip Factory

## Inputs

- Source video path or URL.
- Target clip count.
- Target duration range.

## Build Steps

1. Run media preflight: duration, resolution, audio stream, frame rate.
2. Transcribe with word timestamps.
3. Detect scenes and speaker/content type.
4. Score candidate segments.
5. Ask for approval or apply threshold.
6. Snap boundaries to word/sentence/silence points.
7. Extract approved ranges.
8. Compute crop plan: face, screen, podcast, or contained blur.
9. Render captions and hook overlays.
10. Review contact sheet and export.

## Required Reviews

- Candidate is standalone.
- Crop does not lose speaker/screen/proof object.
- No mid-word boundaries.
- Captions fit over real frames.

## Useful Evidence

- `assets/20260429/claude-shorts/SKILL.md`
- `assets/20260429/imgly-videoclipper/transcript.ts`
- `assets/20260429/samurai-ai-shorts/FaceCrop.py`
