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
motion_strategy = "kenburns"
```

## Run

```bash
cat <<'JSON' | npx tsx scripts/harness/run-flow.ts
{
  "flow": "generate-short",
  "runId": "nanobanana-kenburns",
  "input": {
    "topic": "5 tips for writing better TypeScript",
    "visuals": { "provider": "nanobanana", "orientation": "portrait" },
    "render": { "downloadAssets": true }
  }
}
JSON
```

## Notes

- NanoBanana images are cached under `~/.cm/assets/generated/nanobanana/` by default.
- If you set `motionStrategy = "none"`, images will render as static frames.
