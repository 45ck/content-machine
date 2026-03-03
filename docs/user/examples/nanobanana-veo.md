# NanoBanana Keyframes + Veo (Image-to-Video)

This example uses NanoBanana (Gemini image generation) to create per-scene keyframes, then uses Veo to synthesize short video clips for those scenes.

This is the highest-quality motion strategy, but it is also the most expensive.

## Prereqs

- `GOOGLE_API_KEY` (preferred) or `GEMINI_API_KEY`
- Veo model access in your Google project/account

Optional:

- `CM_MEDIA_VEO_MODEL` to override the default model (example: `veo-3.1-generate-preview`)

## Config

In `.content-machine.toml`:

```toml
[llm]
provider = "gemini"
model = "gemini-2.0-flash"

[visuals]
provider = "nanobanana"
motion_strategy = "veo"
```

## Run (One Command)

```bash
cm generate "Docker vs Kubernetes" \
  --archetype versus \
  --media \
  --media-veo-adapter google-veo \
  --keep-artifacts \
  --output output/nanobanana-veo/video.mp4
```

## Notes

- Veo supports a small set of discrete clip durations. The media stage rounds each scene to a supported duration and relies on rendering to trim as needed.
- If Veo fails (quota/access), you can switch to `motionStrategy = "kenburns"` to render without synthesis.
