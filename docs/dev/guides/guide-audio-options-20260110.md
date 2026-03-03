# guide-audio-options-20260110

Add background music, SFX, and ambience to content-machine renders using the audio mix plan.

## When to use this

- You want engaging audio layers without editing in a DAW.
- You need repeatable audio settings across multiple videos.

## Prerequisites

- `cm audio` or `cm generate` available.
- Local audio assets (music/SFX/ambience) or preset names.
- `audio.wav` and `timestamps.json` for rendering.

## Steps

1. Generate audio with a mix plan.
2. Render using the mix plan (or run `cm generate` with audio options).
3. Verify the mix layers in the final MP4.

## Examples

```bash
# 1) Generate voice + mix plan
cm audio -i script.json -o audio.wav --timestamps timestamps.json \
  --music lofi-01 --sfx-pack pops --sfx-at hook --audio-mix audio.mix.json

# 2) Render using the mix plan
cm render -i visuals.json --audio audio.wav --timestamps timestamps.json \
  --audio-mix audio.mix.json -o video.mp4

# 3) End-to-end generate with mix options
cm generate "5 caching tips" --archetype listicle -o video.mp4 \
  --music lofi-01 --sfx-pack pops --sfx-at list-item --mix-preset viral
```

## Troubleshooting

- **Symptom:** Music/SFX missing in render.
  - **Fix:** Ensure the file path exists and pass `--audio-mix` to `cm render`.
- **Symptom:** Mix plan is created but audio layers are skipped.
  - **Fix:** Check for missing asset warnings and use absolute paths if needed.

## Related

- `docs/reference/cm-audio-reference-20260106.md`
- `docs/reference/cm-render-reference-20260106.md`
- `docs/reference/cm-generate-reference-20260106.md`
- `docs/dev/features/feature-audio-options-mix-integration-20260110.md`
