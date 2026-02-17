# NanoBanana Images + Ken Burns (No Veo)

This example generates AI images via Gemini (NanoBanana provider) and renders them with a Ken Burns-style motion effect at render-time (no media synthesis required).

## Prereqs

- `GOOGLE_API_KEY` (or `GEMINI_API_KEY`)
- `ffmpeg` recommended (other parts of the toolchain may use it)

## Config

In `.content-machine.toml`:

```toml
[llm]
provider = "gemini"
model = "gemini-2.0-flash"

[visuals]
provider = "nanobanana"
motionStrategy = "kenburns"
```

## Run

```bash
cm generate "5 tips for writing better TypeScript" \
  --archetype listicle \
  --keep-artifacts \
  --output output/nanobanana-kenburns/video.mp4
```

## Notes

- NanoBanana images are cached under `~/.cm/assets/generated/nanobanana/` by default.
- If you set `motionStrategy = "none"`, images will render as static frames.
