# Latest News Listicle (Research -> Video)

This reproduces the "latest news listicle" pipeline:

`research.json -> script.json -> audio.wav + timestamps.json -> visuals.json -> video.mp4`

Prereqs:

- `OPENAI_API_KEY` (script generation)
- `PEXELS_API_KEY` (stock visuals)
- Optional: `TAVILY_API_KEY` (if you add `-s tavily` to research)
- Whisper installed for audio-first timestamps: `cm setup whisper --model base`

```bash
# (One-time) install whisper for word-level timestamps
cm setup whisper --model base

# 1) Research latest headlines
cm --yes research --no-angles \
  -q "global news this week" \
  -t week -l 12 \
  -o output/research.stories.json

# 2) Script (listicle)
cm --yes script \
  --topic "global news this week" \
  --research output/research.stories.json \
  --duration 60 \
  -o output/script.stories.v2.json

# 3) Audio + timestamps (audio-first + reconcile for cleaner captions)
cm --yes audio \
  -i output/script.stories.v2.json \
  -o output/audio.stories.v2.wav \
  --timestamps output/timestamps.stories.v2.json \
  --sync-strategy audio-first --reconcile --require-whisper --whisper-model base \
  --tts-speed 1.2 \
  --no-music --no-sfx --no-ambience

# 4) Visuals (Pexels)
cm --yes visuals \
  -i output/timestamps.stories.v2.json \
  -o output/visuals.stories.v2.json \
  --provider pexels --orientation portrait

# 5) Render (TikTok preset + chunk mode)
cm --yes render \
  -i output/visuals.stories.v2.json \
  --audio output/audio.stories.v2.wav \
  --timestamps output/timestamps.stories.v2.json \
  --caption-preset tiktok --caption-mode chunk \
  --caption-offset-ms -80 \
  --hook none \
  -o output/global-news.stories.v2.tiktok.badges.mp4
```

See also:

- [`docs/reference/cm-research-reference-20260106.md`](../../reference/cm-research-reference-20260106.md)
- [`docs/reference/cm-script-reference-20260106.md`](../../reference/cm-script-reference-20260106.md)
- [`docs/reference/cm-audio-reference-20260106.md`](../../reference/cm-audio-reference-20260106.md)
- [`docs/reference/cm-visuals-reference-20260106.md`](../../reference/cm-visuals-reference-20260106.md)
- [`docs/reference/cm-render-reference-20260106.md`](../../reference/cm-render-reference-20260106.md)
