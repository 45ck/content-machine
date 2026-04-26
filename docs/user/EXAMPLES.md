# Examples

## Featured Example

- **[Reddit Story Split-Screen](examples/reddit-story-split-screen.md)** —
  Reddit opener card, top-lane story footage, bottom-lane gameplay

## Additional Workflows

### Listicle from a trending topic

```bash
cat <<'JSON' | node --import tsx scripts/harness/brief-to-script.ts
{
  "topic": "5 things every dev should know about Docker",
  "archetype": "listicle",
  "outputPath": "output/examples/docker-tips/script.json"
}
JSON
```

### Side-by-side comparison

```bash
cat <<'JSON' | node --import tsx scripts/harness/run-flow.ts
{
  "flow": "generate-short",
  "runId": "redis-vs-pg",
  "input": {
    "topic": "Redis vs PostgreSQL for caching",
    "audio": { "voice": "af_heart" },
    "visuals": { "provider": "pexels", "orientation": "portrait" },
    "render": { "fps": 30, "downloadAssets": true }
  }
}
JSON
```

### Research-driven news video

```bash
cat skills/reverse-engineer-winner/examples/request.json | \
  node --import tsx scripts/harness/ingest.ts
```

### AI-generated visuals (no stock footage)

Requires `GOOGLE_API_KEY` and NanoBanana config:

```bash
cat <<'JSON' | node --import tsx scripts/harness/run-flow.ts
{
  "flow": "generate-short",
  "runId": "nanobanana",
  "input": {
    "topic": "5 tips for writing better TypeScript",
    "visuals": { "provider": "nanobanana", "orientation": "portrait" }
  }
}
JSON
```

See [NanoBanana + Ken Burns example](examples/nanobanana-kenburns.md) for full config.

## Additional Walkthroughs

These examples show stage-by-stage pipelines with all options:

- **[Gemini Image-Led Shorts](examples/gemini-image-shorts.md)** — AI-generated images with Gemini, real rendered examples
- **[Latest News Listicle](examples/latest-news-listicle.md)** — research → script → audio → visuals → video
- **[Split-Screen Gameplay](examples/split-screen-gameplay.md)** — gameplay on one half, stock B-roll on the other
- **[Complex Plane Rotation](examples/complex-plane-rotation.md)** — custom Remotion template with drawn diagrams
- **[NanoBanana + Ken Burns](examples/nanobanana-kenburns.md)** — AI-generated images with motion effects
- **[NanoBanana + Veo](examples/nanobanana-veo.md)** — AI images turned into video clips
- **[Import Render Templates](examples/import-render-templates.md)** — using and creating custom templates

## Runnable Examples

The `fixtures/examples/` directory contains the repo's self-contained
example packages you can run from source:

```bash
ls fixtures/examples/
```

## Demo Gallery

See generated output samples in [`docs/demo/`](../demo/).
