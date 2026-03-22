# Examples

## Quick Workflows

### Listicle from a trending topic

```bash
cm generate "5 things every dev should know about Docker" \
  --archetype listicle -o output/docker-tips.mp4
```

### Side-by-side comparison

```bash
cm generate "Redis vs PostgreSQL for caching" \
  --archetype versus -o output/redis-vs-pg.mp4
```

### Research-driven news video

```bash
cm research -q "AI news this week" -o output/research.json
cm generate "AI news this week" \
  --research output/research.json \
  --archetype listicle -o output/ai-news.mp4
```

### AI-generated visuals (no stock footage)

Requires `GOOGLE_API_KEY` and NanoBanana config:

```bash
cm generate "5 tips for writing better TypeScript" \
  --archetype listicle --keep-artifacts -o output/nanobanana.mp4
```

See [NanoBanana + Ken Burns example](examples/nanobanana-kenburns.md) for full config.

## Full Walkthroughs

These examples show stage-by-stage pipelines with all options:

- **[Gemini Image-Led Shorts](examples/gemini-image-shorts.md)** — AI-generated images with Gemini, real rendered examples
- **[Latest News Listicle](examples/latest-news-listicle.md)** — research → script → audio → visuals → video
- **[Split-Screen Gameplay](examples/split-screen-gameplay.md)** — gameplay on one half, stock B-roll on the other
- **[Complex Plane Rotation](examples/complex-plane-rotation.md)** — custom Remotion template with drawn diagrams
- **[NanoBanana + Ken Burns](examples/nanobanana-kenburns.md)** — AI-generated images with motion effects
- **[NanoBanana + Veo](examples/nanobanana-veo.md)** — AI images turned into video clips
- **[Import Render Templates](examples/import-render-templates.md)** — using and creating custom templates

## Runnable Examples

The `examples/` directory at the repo root contains self-contained examples you can run from source:

```bash
ls examples/
```

## Demo Gallery

See generated output samples in [`docs/demo/`](../demo/).
