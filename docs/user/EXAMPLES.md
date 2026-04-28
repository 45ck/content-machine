# Examples

Use [Archetypes](ARCHETYPES.md) first if you are choosing what kind of
short to make. Use [Quality And Review](QUALITY-AND-REVIEW.md) before
promoting a render as ready.

## Showcase

- **[Reddit Post Over Gameplay](examples/reddit-post-over-gameplay.md)** —
  default Reddit story mode: full-screen gameplay, Reddit opener card,
  captions, and no random clips
- **[Reddit Story Split-Screen](examples/reddit-story-split-screen.md)** —
  current tracked showcase with split-screen grammar. Generic Reddit
  story requests should still use `reddit-post-over-gameplay` unless a
  split-screen/top-lane support mode is requested.

## Status Summary

| Lane                        | Status               | Demo                                                       |
| --------------------------- | -------------------- | ---------------------------------------------------------- |
| `reddit-post-over-gameplay` | `golden showcase`    | [`demo-9`](../demo/demo-9-reddit-post-over-gameplay.mp4)   |
| `reddit-story-split-screen` | `showcase candidate` | [`demo-8`](../demo/demo-8-reddit-story-split-screen.mp4)   |
| `stock-b-roll-explainer`    | `showcase candidate` | [`demo-10`](../demo/demo-10-stock-broll-explainer.mp4)     |
| `text-thread-reveal`        | `showcase candidate` | [`demo-11`](../demo/demo-11-text-thread-reveal.mp4)        |
| `saas-problem-solution`     | `showcase candidate` | [`demo-12`](../demo/demo-12-saas-problem-solution.mp4)     |
| `fast-facts-countdown`      | `showcase candidate` | [`demo-13`](../demo/demo-13-fast-facts-countdown.mp4)      |
| `motion-card-lesson`        | `showcase candidate` | [`demo-14`](../demo/demo-14-motion-card-lesson.mp4)        |
| `faceless-mixed-short`      | `showcase candidate` | [`demo-15`](../demo/demo-15-faceless-mixed-short.mp4)      |
| `gameplay-confession-split` | `showcase candidate` | [`demo-16`](../demo/demo-16-gameplay-confession-split.mp4) |
| `micro-doc-breakdown`       | `proving candidate`  | [`demo-17`](../demo/demo-17-micro-doc-breakdown.mp4)       |

## Secondary Real Renders

- **[Stock Footage Edutainment](examples/stock-footage-edutainment.md)** —
  faceless-information showcase candidate with stock-style motion,
  narration, captions, and fast transition pulses
- **[Text Message Drama](examples/text-message-drama.md)** — message
  story showcase candidate with staged chat cards over gameplay support
- **[SaaS Problem Solution](examples/saas-problem-solution.md)** —
  product-card showcase candidate with pain, proof, and CTA beats
- **[Facts Listicle](examples/facts-listicle.md)** — countdown facts
  showcase candidate with real voiceover, timed captions, card resets,
  and publish-prep validation
- **[Motion Card Lesson](examples/motion-card-lesson.md)** —
  card-native educational showcase candidate with prompt, step, payoff,
  captions, and publish-prep validation
- **[Faceless Mixed Short](examples/faceless-mixed-short.md)** —
  mixed-source explainer candidate with voiceover, music bed, captions,
  diagrams, UI cards, and practical tip beats
- **[Subway Confession Story](examples/subway-confession-story.md)** —
  gameplay-backed storytime showcase candidate with top support footage,
  bottom Subway Surfers-style gameplay, and midpoint captions
- **[Micro-Doc Breakdown](examples/micro-doc-breakdown.md)** —
  documentary-style proving candidate with archival cards, evidence
  inserts, narration, captions, and a base publish-prep pass
- **[Gemini Image-Led Shorts](examples/gemini-image-shorts.md)** —
  real rendered MP4 gallery from the image-led path; useful as a
  supporting showcase, not the flagship lane

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
