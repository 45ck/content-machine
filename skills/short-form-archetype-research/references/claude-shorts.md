# Repo Card: AgriciDaniel/claude-shorts

## Why It Matters

Closest external match to this repo's skill-first longform-to-short flow. It
defines a full agent pipeline from preflight through transcript analysis,
candidate approval, boundary snapping, Remotion rendering, and platform export.

## How It Makes Shorts

1. Preflight video and GPU capability.
2. Transcribe with faster-whisper and word timestamps.
3. Detect content type: talking head, screen recording, or podcast.
4. Agent scores 8-12 candidate segments.
5. User approves clips and caption style.
6. Snap boundaries to word/sentence/silence points.
7. Extract clips and compute reframe.
8. Render with Remotion captions and hook overlays.
9. Export for TikTok, Reels, and Shorts.

## Copied Evidence

- `assets/20260429/claude-shorts/SKILL.md`
- `assets/20260429/claude-shorts/scoring-rubric.md`
- `assets/20260429/claude-shorts/caption-styles.md`
- `assets/20260429/claude-shorts/platform-specs.md`
- `assets/20260429/claude-shorts/remotion-patterns.md`

## Extraction

- Promote candidate scoring into a local shared schema.
- Keep boundary snapping as an explicit stage.
- Reuse the Remotion bundle-once-render-many idea in local render harnesses.
