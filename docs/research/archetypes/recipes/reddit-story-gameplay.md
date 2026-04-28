# Recipe: Reddit/story Over Gameplay

## Inputs

- Story text or Reddit post.
- Licensed/generated gameplay or motion background.
- Voice preset.
- Caption style: `reddit-one-word` or `bold-education`.

## Build Steps

1. Normalize story into `hook`, `setup`, `escalation`, `payoff`.
2. Generate voiceover.
3. Produce word timestamps from voiceover.
4. Build Reddit/card opener props if source is Reddit-native.
5. Select background media from a provenance-checked media index.
6. Render captions over background and opener.
7. Generate contact sheet.
8. Export platform variants.

## Required Reviews

- Background media rights.
- Caption readability at phone size.
- No platform UI overlap.
- Story payoff exists before CTA.

## Useful Evidence

- `assets/20260429/raga70-reddit-bot/config.template.toml`
- `assets/20260429/raga70-reddit-bot/final_video.py`
- `assets/20260429/shortgpt/reddit_short_engine.py`
