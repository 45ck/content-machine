# guide-recommended-pipeline-20260109

Recommended defaults for the highest quality, best-synced short-form videos.

## When to use this

- You want the tightest audio/caption sync and cleanest captions.
- You are okay with a slower but higher-quality pipeline.

## Prerequisites

- Whisper.cpp installed (used for word-level timestamps).
- `OPENAI_API_KEY` set if you use `cm generate`.

## Steps

1. Install Whisper once.
2. Run the default pipeline (audio-first + reconcile).
3. Review the output video.

## Examples

```bash
# Install whisper.cpp + model (one-time)
cm setup whisper --model base

# Recommended pipeline (defaults are audio-first + reconcile)
cm generate "Redis vs PostgreSQL for caching" --archetype versus --output output/video.mp4 --keep-artifacts

# If running stages manually (audio-first + reconcile)
cm script --topic "Redis vs PostgreSQL" --output output/script.json
cm audio --input output/script.json --output output/audio.wav --timestamps output/timestamps.json --sync-strategy audio-first --reconcile
cm visuals --input output/timestamps.json --output output/visuals.json
cm render --input output/visuals.json --audio output/audio.wav --timestamps output/timestamps.json --output output/video.mp4
```

## Troubleshooting

- **Symptom:** Captions drift ahead/behind audio.
  - **Fix:** Ensure `--sync-strategy audio-first` is used and Whisper is installed.
- **Symptom:** Audio stage fails due to Whisper not installed.
  - **Fix:** Run `cm setup whisper --model base`, then retry.

## Related

- [`guide-phoenix-loop-20260107.md`](guide-phoenix-loop-20260107.md)
