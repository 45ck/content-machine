# Examples

## Showcase

- **[Reddit Post Over Gameplay](examples/reddit-post-over-gameplay.md)** —
  default Reddit story mode: full-screen gameplay, Reddit opener card,
  captions, and no random clips
- **[Reddit Story Split-Screen](examples/reddit-story-split-screen.md)** —
  current tracked showcase with split-screen grammar. Generic Reddit
  story requests should still use `reddit-post-over-gameplay` unless a
  split-screen/top-lane support mode is requested.

## Secondary Real Renders

- **[Stock Footage Edutainment](examples/stock-footage-edutainment.md)** —
  faceless-information showcase candidate with stock-style motion,
  narration, captions, and fast transition pulses
- **[Text Message Drama](examples/text-message-drama.md)** — message
  story showcase candidate with staged chat cards over gameplay support
- **[Gemini Image-Led Shorts](examples/gemini-image-shorts.md)** —
  real rendered MP4 gallery from the image-led path; useful as a
  supporting showcase, not the flagship lane

## Archetype Briefs

These pages describe lane grammar and the right skills to use. They are
not all proven examples yet.

- **[Subway Confession Story](examples/subway-confession-story.md)** —
  proving lane; confession lane with support footage or receipts on top
  and gameplay below
- **[Facts Listicle](examples/facts-listicle.md)** — numbered fast-fact
  lane shape only; current proving render is too weak to showcase
- **[SaaS Problem Solution](examples/saas-problem-solution.md)** —
  strongest current commercial proving lane, but still not fully proven
- **[Motion Card Lesson](examples/motion-card-lesson.md)** — narrow
  educational lane brief; no canonical proving render yet

## Recipes And Walkthroughs

These are runnable technique docs. Some use provider keys or older
surfaces and should not be confused with flagship examples.

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

- **[Latest News Listicle](examples/latest-news-listicle.md)** — research → script → audio → visuals → video
- **[Split-Screen Gameplay](examples/split-screen-gameplay.md)** — gameplay on one half, stock B-roll on the other
- **[Complex Plane Rotation](examples/complex-plane-rotation.md)** — custom Remotion template with drawn diagrams
- **[NanoBanana + Ken Burns](examples/nanobanana-kenburns.md)** — AI-generated images with motion effects
- **[NanoBanana + Veo](examples/nanobanana-veo.md)** — AI images turned into video clips
- **[Import Render Templates](examples/import-render-templates.md)** — using and creating custom templates

## Proving Artifacts

Internal proving bundles live under `experiments/` and are useful for
honest maturity tracking, not for first-time showcase docs.

- **[Proving Wave 1](../../experiments/proving-wave-1/README.md)** —
  current best non-flagship candidates plus their review failures
- **[Proving Wave 3](../../experiments/proving-wave-3/README.md)** —
  one-at-a-time archetype proving with embedded demo MP4s

## Runnable Examples

The `fixtures/examples/` directory contains the repo's self-contained
example packages you can run from source:

```bash
ls fixtures/examples/
```

## Demo Gallery

See generated output samples in [`docs/demo/`](../demo/).
