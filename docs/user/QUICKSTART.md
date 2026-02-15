# Quickstart

## 1) Verify Install (No API Keys Required)

Render a deterministic demo video:

```bash
cm demo -o output/demo.mp4
```

## 2) Generate A Real Video (Stock Visuals)

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

## 3) When Things Fail

```bash
cm doctor
cm generate "test" --preflight
```
