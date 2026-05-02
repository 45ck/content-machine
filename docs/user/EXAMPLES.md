# Examples

Use [Archetypes](ARCHETYPES.md) first if you are choosing what kind of
short to make. Use [Quality And Review](QUALITY-AND-REVIEW.md) before
promoting a render as ready. Use the
[Graphics Archetype Remake Plan](examples/graphics-archetype-remake-plan.md)
when improving non-Reddit motion/card-heavy examples.

## Showcase

- **[Reddit Post Over Gameplay](examples/reddit-post-over-gameplay.md)** —
  default Reddit story mode: full-screen gameplay, Reddit opener card,
  captions, and no random clips
- **[Showcase Gallery](showcase/README.md)** — fast visual map of demos,
  skills, maturity, and what each preview proves
- **[Example Pages](examples/README.md)** — categorized index of the
  example docs folder

## Status Summary

| Lane                                    | Status                          | Demo                                                                   |
| --------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `reddit-post-over-gameplay`             | `golden showcase`               | [`demo-9`](../demo/demo-9-reddit-post-over-gameplay.mp4)               |
| `reddit-story-split-screen`             | `workflow; rebuild demo`        | archived, not public showcase                                          |
| `stock-b-roll-explainer`                | `showcase candidate`            | [`demo-10`](../demo/demo-10-stock-broll-explainer.mp4)                 |
| `text-thread-reveal`                    | `showcase candidate`            | [`demo-11`](../demo/demo-11-text-thread-reveal.mp4)                    |
| `saas-problem-solution`                 | `showcase candidate`            | [`demo-12`](../demo/demo-12-saas-problem-solution.mp4)                 |
| `fast-facts-countdown`                  | `showcase candidate`            | [`demo-13`](../demo/demo-13-fast-facts-countdown.mp4)                  |
| `motion-card-lesson`                    | `showcase candidate`            | [`demo-14`](../demo/demo-14-motion-card-lesson.mp4)                    |
| `faceless-mixed-short`                  | `showcase candidate`            | [`demo-15`](../demo/demo-15-faceless-mixed-short.mp4)                  |
| `gameplay-confession-split`             | `showcase candidate`            | [`demo-16`](../demo/demo-16-gameplay-confession-split.mp4)             |
| `micro-doc-breakdown`                   | `proving candidate`             | [`demo-17`](../demo/demo-17-micro-doc-breakdown.mp4)                   |
| `content-machine-reddit-gameplay-remix` | `supporting showcase candidate` | [`demo-18`](../demo/demo-18-content-machine-reddit-gameplay-remix.mp4) |
| `content-machine-motion-cards`          | `supporting showcase candidate` | [`demo-19`](../demo/demo-19-content-machine-motion-cards.mp4)          |
| `procedural-gameplay-backgrounds`       | `supporting showcase candidate` | [`demo-20`](../demo/demo-20-content-machine-3d-runner.mp4)             |

`demo-20` is now a `1080x1920` supporting showcase with audit and
provenance evidence. Keep it framed as an additive 3D/procedural
treatment, not the default content archetype.

## Prompt Examples For Agent Harnesses

Use these inside Claude Code, Codex CLI, Cursor, or another harness
after installing the pack:

- "Run Content Machine doctor and tell me what is missing before
  generation."
- "Make a faceless stock-footage explainer about `{topic}` and review
  the final MP4 before calling it ready."
- "Analyze `{referenceVideoPath}` as a winner, then generate a new short
  with the same pacing, not the same footage."
- "Turn `{longformVideo}` into candidate shorts; select moments first,
  then snap boundaries before rendering."
- "Use `reddit-post-over-gameplay` for this story. Keep gameplay
  full-screen and show the Reddit opener card for 3-5 seconds."

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
- **[Content Machine Self-Demo Short](examples/content-machine-self-demo.md)** —
  repo-explainer workflow with tracked Reddit/gameplay and motion-card
  preview variants
- **[Procedural Gameplay Backgrounds](examples/procedural-gameplay-backgrounds.md)** —
  additive 3D/procedural gameplay treatment for caption-clean retention
  motion
- **[Gemini Image-Led Shorts](examples/gemini-image-shorts.md)** —
  real rendered MP4 gallery from the image-led path; useful as a
  supporting showcase, not the flagship lane

## Workflows And Walkthroughs

These are runnable technique docs. Some use provider keys or older
surfaces and should not be confused with flagship examples.

### Content Machine self-demo

Use this when you want a short that explains the repo with its own
`generate-short` path:

```bash
cat skills/generate-short/examples/content-machine-self-demo.request.json | \
  node --import tsx scripts/harness/generate-short.ts
```

Each completed `generate-short` run now emits
`provenance/asset-ledger.json`; publish-prep reviews that ledger by
default, so example promotion should include both the asset ledger and
the publish-prep `provenance.json` result.

If provider keys or rate limits are not available, run the no-key smoke
path instead. See
[Content Machine Self-Demo Short](examples/content-machine-self-demo.md).
Tracked supporting previews are
[`demo-18`](../demo/demo-18-content-machine-reddit-gameplay-remix.mp4)
and [`demo-19`](../demo/demo-19-content-machine-motion-cards.mp4).

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
  node --import tsx scripts/harness/reverse-engineer-winner.ts
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
- **[Procedural Gameplay Backgrounds](examples/procedural-gameplay-backgrounds.md)** — 3D/procedural gameplay-like backgrounds as an additive visual treatment
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

See generated output samples and maturity labels in
[`docs/demo/`](../demo/README.md).
