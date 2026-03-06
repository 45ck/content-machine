# Quickstart

## 1) Verify Install (No API Keys Required)

Render a deterministic demo video:

```bash
cm demo -o output/demo.mp4
```

## 2) Generate A Real Video Format (Stock Visuals)

Prereqs:

- `OPENAI_API_KEY` (script generation)
- `PEXELS_API_KEY` (default stock visuals provider)

Fastest path (no Whisper required):

```bash
export OPENAI_API_KEY="..."
export PEXELS_API_KEY="..."

cm generate "Redis vs PostgreSQL for caching" \
  --archetype versus \
  --pipeline standard \
  --output output/video.mp4 \
  --keep-artifacts
```

Best caption sync (Whisper required):

```bash
cm setup whisper --model base

cm generate "Redis vs PostgreSQL for caching" \
  --archetype versus \
  --output output/video.mp4 \
  --keep-artifacts
```

## 3) Switch Formats Without Changing The Engine

The same pipeline can make different short-form content types by swapping the building blocks:

Extra prereqs for these examples:

- `brainrot-gameplay`: gameplay footage available through the normal gameplay library flow
- `gemini-meme-explainer`: `GEMINI_API_KEY` or `GOOGLE_API_KEY`

```bash
# Gameplay-heavy meme format
cm generate "Why 2026 feels like 2016 again" \
  --workflow brainrot-gameplay \
  --archetype meme-pov \
  --output output/brainrot.mp4

# Gemini image-led format
cm generate "Browser cache explained like the internet's most annoying roommate" \
  --workflow gemini-meme-explainer \
  --archetype hot-take \
  --output output/meme.mp4
```

## 4) When Things Fail

```bash
cm doctor
cm generate "test" --preflight
```
