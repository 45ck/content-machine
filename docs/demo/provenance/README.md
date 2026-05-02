# Demo Provenance

This file is the human-readable companion to
[`../provenance.v1.json`](../provenance.v1.json). It is an audit index,
not a legal opinion.

Use it to answer three questions before promoting a demo:

1. Does the video have a source doc and review report?
2. Are external or generated assets described clearly enough to audit?
3. Is the maturity label honest about what still blocks promotion?

Promoted/golden demos also need machine-readable runtime evidence:
`assetLedgerPath` points to the render asset ledger and
`publishPrepProvenancePath` points to the publish-prep provenance gate
result. Candidates can remain listed with honest promotion blockers, but
they are not golden until those artifacts exist and pass.

## demo-5-gemini-2026-feels-like-2016

- Maturity: `archive preview`
- Source doc: [`gemini-image-shorts`](../../user/examples/gemini-image-shorts.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-5-gemini-2026-feels-like-2016/report.json)
- Source notes: historical Gemini image/video demo; source prompts,
  provider terms, and audio notes still need reconstruction before
  promotion.

## demo-6-gemini-browser-cache-same-energy

- Maturity: `archive preview`
- Source doc: [`gemini-image-shorts`](../../user/examples/gemini-image-shorts.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-6-gemini-browser-cache-same-energy/report.json)
- Source notes: historical Gemini image/video demo; source prompts,
  provider terms, and audio notes still need reconstruction before
  promotion.

## demo-7-gemini-black-holes-absurdist

- Maturity: `archive preview`
- Source doc: [`gemini-image-shorts`](../../user/examples/gemini-image-shorts.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-7-gemini-black-holes-absurdist/report.json)
- Source notes: historical Gemini image/video demo; source prompts,
  provider terms, and audio notes still need reconstruction before
  promotion.

## demo-9-reddit-post-over-gameplay

- Maturity: `golden showcase`
- Source doc:
  [`reddit-post-over-gameplay`](../../user/examples/reddit-post-over-gameplay.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-9-reddit-post-over-gameplay/report.json)
- Machine evidence:
  [`asset-ledger.json`](demo-9-reddit-post-over-gameplay/asset-ledger.json),
  [`publish-prep/provenance.json`](demo-9-reddit-post-over-gameplay/publish-prep/provenance.json)
- Source notes: synthetic gameplay-style background, Reddit-style opener
  card, captions, and narration are generated for the demo rather than
  copied from a public Reddit post or commercial game.
- Promotion note: default story example with passing publish-prep gates,
  including OCR caption-sync on the boxed phrase-caption render.

## demo-10-stock-broll-explainer

- Maturity: `showcase candidate`
- Source doc:
  [`stock-footage-edutainment`](../../user/examples/stock-footage-edutainment.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-10-stock-broll-explainer/report.json)
- Source notes: stock-style support footage and music bed require
  per-asset source URLs/license evidence before this candidate can
  become golden.

## demo-11-text-thread-reveal

- Maturity: `showcase candidate`
- Source doc:
  [`text-message-drama`](../../user/examples/text-message-drama.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-11-text-thread-reveal/report.json)
- Source notes: message bubbles, story text, captions, and support
  layout are staged/generated demo assets rather than copied private
  DMs.

## demo-12-saas-problem-solution

- Maturity: `showcase candidate`
- Source doc:
  [`saas-problem-solution`](../../user/examples/saas-problem-solution.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-12-saas-problem-solution/report.json)
- Source notes: problem, proof, demo, and CTA cards are generated for
  the example; no real customer data or third-party product UI is
  required.

## demo-13-fast-facts-countdown

- Maturity: `showcase candidate`
- Source doc: [`facts-listicle`](../../user/examples/facts-listicle.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-13-fast-facts-countdown/report.json)
- Source notes: countdown cards, captions, and simple motion graphics
  are repo-generated visual assets; fact/source citations should be
  attached for fact-heavy public use.

## demo-14-motion-card-lesson

- Maturity: `showcase candidate`
- Source doc:
  [`motion-card-lesson`](../../user/examples/motion-card-lesson.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-14-motion-card-lesson/report.json)
- Source notes: deterministic Remotion/SVG motion cards with layout
  sidecar and video-evaluator layout-safety review.

## demo-15-faceless-mixed-short

- Maturity: `showcase candidate`
- Source doc:
  [`faceless-mixed-short`](../../user/examples/faceless-mixed-short.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-15-faceless-mixed-short/report.json)
- Source notes: mixed stock-like support, diagrams, UI cards, generated
  assets, captions, and music need asset-level source evidence before
  flagship promotion.

## demo-16-gameplay-confession-split

- Maturity: `showcase candidate`
- Source doc:
  [`subway-confession-story`](../../user/examples/subway-confession-story.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-16-gameplay-confession-split/report.json)
- Source notes: confession story, split layout, and gameplay rail are
  demo assets; external gameplay or support footage must carry
  per-asset provenance before promotion.

## demo-17-micro-doc-breakdown

- Maturity: `proving candidate`
- Source doc:
  [`micro-doc-breakdown`](../../user/examples/micro-doc-breakdown.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-17-micro-doc-breakdown/report.json)
- Source notes: archival-style cards and evidence inserts are
  demonstration assets; fact/source citations need to be attached before
  stronger promotion.

## demo-18-content-machine-reddit-gameplay-remix

- Maturity: `supporting showcase candidate`
- Source doc:
  [`content-machine-self-demo`](../../user/examples/content-machine-self-demo.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-18-content-machine-reddit-gameplay-remix/report.json)
- Source notes: deterministic no-key repo explainer preview using
  generated Reddit/gameplay packaging, local captions, and quiet
  synthesized audio.

## demo-19-content-machine-motion-cards

- Maturity: `supporting showcase candidate`
- Source doc:
  [`content-machine-self-demo`](../../user/examples/content-machine-self-demo.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-19-content-machine-motion-cards/report.json)
- Source notes: deterministic no-key repo explainer preview using
  generated motion cards, local captions, and quiet synthesized audio.

## demo-20-content-machine-3d-runner

- Maturity: `supporting showcase candidate`
- Source doc:
  [`procedural-gameplay-backgrounds`](../../user/examples/procedural-gameplay-backgrounds.md)
- Review: [`report.json`](../../../experiments/video-quality-review-demo/demo-20-content-machine-3d-runner/report.json)
- Machine evidence:
  [`asset-ledger.json`](demo-20-content-machine-3d-runner/asset-ledger.json),
  [`render-3d-runner.mjs`](demo-20-content-machine-3d-runner/render-3d-runner.mjs),
  [`publish-prep/provenance.json`](demo-20-content-machine-3d-runner/publish-prep/provenance.json)
- Source notes: code-native low-poly 3D/procedural runner preview; no
  external model, texture, gameplay clip, downloaded music, or
  API-generated asset is required for the tracked preview. The current
  tracked version is `1080x1920`, passes automated demo-video audit,
  and passes publish-prep with provenance evidence.
