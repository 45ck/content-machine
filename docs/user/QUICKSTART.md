# Legacy CLI Quickstart

This page describes the compatibility `cm` path.

If you are using Claude Code, Codex CLI, or another coding harness,
start with [Harness Quickstart](HARNESS-QUICKSTART.md) instead.

This guide takes you from install to your first video through the legacy
CLI in under 5 minutes.

## Step 1: Try the Demo (No API Keys)

The demo command renders a deterministic video using built-in content — no API keys, no internet required:

```bash
cm demo -o output/demo.mp4
```

Open `output/demo.mp4` to see what Content Machine produces: a 1080x1920 vertical video with voiceover, captions, and visuals.

## Step 2: Generate a Real Video

You'll need two API keys:

- `OPENAI_API_KEY` — for script generation ([get one](https://platform.openai.com/api-keys))
- `PEXELS_API_KEY` — for stock footage ([get one](https://www.pexels.com/api/), free)

```bash
export OPENAI_API_KEY="sk-..."
export PEXELS_API_KEY="..."

cm generate "Redis vs PostgreSQL for caching" \
  --archetype versus \
  -o output/video.mp4
```

This runs the full pipeline: script generation, TTS voiceover, stock footage matching, and video rendering.

## Step 3: Try Different Archetypes

Archetypes control the script structure and pacing:

```bash
# Numbered tips list
cm generate "5 Docker tips every dev should know" --archetype listicle -o output/docker.mp4

# Step-by-step tutorial
cm generate "Deploy a Node.js app to AWS" --archetype howto -o output/deploy.mp4

# Myth vs reality
cm generate "Common JavaScript myths" --archetype myth -o output/myths.mp4

# Provocative opinion
cm generate "REST APIs are dead" --archetype hot-take -o output/rest.mp4
```

See all available archetypes:

```bash
cm archetypes list
```

## Step 4: Better Captions (Optional)

For word-level caption accuracy, install Whisper (one-time, ~150MB download):

```bash
cm setup whisper --model base
```

Then generate again — captions will be noticeably more accurate:

```bash
cm generate "Redis vs PostgreSQL" --archetype versus -o output/video-whisper.mp4
```

## Step 5: Keep Artifacts for Inspection

Add `--keep-artifacts` to save all intermediate files:

```bash
cm generate "5 Docker tips" --archetype listicle -o output/video.mp4 --keep-artifacts
```

This saves `script.json`, `audio.wav`, `timestamps.json`, and `visuals.json` alongside the video so you can inspect or reuse them.

## Troubleshooting

If something goes wrong:

```bash
# Run diagnostics
cm doctor

# Test the pipeline without generating (checks API keys, dependencies)
cm generate "test" --preflight

# See detailed logs
cm generate "test topic" --archetype listicle -o output/test.mp4 --verbose
```

## Next Steps

- [CLI Usage](CLI.md) — all commands and flags
- [Configuration](CONFIGURATION.md) — customize defaults, LLM provider, voices
- [Examples](EXAMPLES.md) — real-world workflows (research pipelines, split-screen, AI images)
- [Installation](INSTALLATION.md) — full setup details including ffmpeg, Whisper, all API keys
