# Archetypes

Content Machine is a skill pack for making short-form videos. An
archetype is the repeatable content shape an agent should choose before
writing, sourcing media, rendering captions, or reviewing quality.

Use this page when deciding what kind of short to make.

For non-Reddit lanes that depend on designed graphics, cards, SVG,
HTML/CSS, or Remotion-style motion, track polish work in the
[Graphics Archetype Remake Plan](examples/graphics-archetype-remake-plan.md).

3D, procedural gameplay, generated loops, and similar motion systems are
additive visual treatments. They should make a chosen lane more
watchable; they should not replace the script archetype, captions,
source-media workflow, cards, stock clips, local footage, or review
gates.

## Status Labels

Demo-backed status labels should match
[`docs/demo/manifest.json`](../demo/manifest.json). Run
`npm run showcase-status:check` after changing maturity labels.

- `golden showcase`: promoted example with passing review gates.
- `showcase candidate`: real MP4 exists and the lane is usable, but it
  still has review or polish gaps.
- `supporting showcase candidate`: useful for explaining the repo or a
  secondary workflow, but not the main example to copy first.
- `proving candidate`: real MP4 exists, but the lane is not ready to
  promote as a default.
- `experimental preview`: useful direction or visual treatment, but
  below the public promotion bar until review caveats are resolved.
- `skill-backed`: skill/docs exist, but the lane still needs a stronger
  public example.
- `backlog`: useful archetype, not yet built as a first-class lane.

## Default Choice

If the request is a Reddit story, confession, AITA-style post, or
storytime over gameplay, choose `reddit-post-over-gameplay` unless the
user explicitly asks for split-screen footage.

That default means:

- full-screen gameplay from frame one
- Reddit-style opener card for the first few seconds
- captions over gameplay after the opener
- no random stock clips or generated story shots

## Proven And Proving Lanes

| Lane                        | Status                   | Use When                                                                                                         | Skill                                                                                      | Example                                                            | Demo                                                       |
| --------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `reddit-post-over-gameplay` | `golden showcase`        | Reddit/story post over full-screen gameplay; default story choice with passing publish-prep and OCR caption-sync | [`reddit-post-over-gameplay-short`](../../skills/reddit-post-over-gameplay-short/SKILL.md) | [Reddit Post Over Gameplay](examples/reddit-post-over-gameplay.md) | [`demo-9`](../demo/demo-9-reddit-post-over-gameplay.mp4)   |
| `reddit-story-split-screen` | `workflow; rebuild demo` | User explicitly wants top story footage plus bottom gameplay                                                     | [`reddit-story-short`](../../skills/reddit-story-short/SKILL.md)                           | [Reddit Story Split-Screen](examples/reddit-story-split-screen.md) | archived until gutter-free rebuild                         |
| `stock-b-roll-explainer`    | `showcase candidate`     | Topic or headline needs faceless stock-style narration                                                           | [`stock-footage-edutainment-short`](../../skills/stock-footage-edutainment-short/SKILL.md) | [Stock Footage Edutainment](examples/stock-footage-edutainment.md) | [`demo-10`](../demo/demo-10-stock-broll-explainer.mp4)     |
| `text-thread-reveal`        | `showcase candidate`     | Chat logs, DMs, receipts, or message drama                                                                       | [`text-message-drama-short`](../../skills/text-message-drama-short/SKILL.md)               | [Text Message Drama](examples/text-message-drama.md)               | [`demo-11`](../demo/demo-11-text-thread-reveal.mp4)        |
| `saas-problem-solution`     | `showcase candidate`     | Product, SaaS, offer, proof, demo, and CTA                                                                       | [`saas-problem-solution-short`](../../skills/saas-problem-solution-short/SKILL.md)         | [SaaS Problem Solution](examples/saas-problem-solution.md)         | [`demo-12`](../demo/demo-12-saas-problem-solution.mp4)     |
| `fast-facts-countdown`      | `showcase candidate`     | Numbered facts, rankings, myths, or quick lessons                                                                | [`facts-listicle-short`](../../skills/facts-listicle-short/SKILL.md)                       | [Facts Listicle](examples/facts-listicle.md)                       | [`demo-13`](../demo/demo-13-fast-facts-countdown.mp4)      |
| `motion-card-lesson`        | `showcase candidate`     | Concept explained through designed cards or diagrams                                                             | [`motion-card-lesson-short`](../../skills/motion-card-lesson-short/SKILL.md)               | [Motion Card Lesson](examples/motion-card-lesson.md)               | [`demo-14`](../demo/demo-14-motion-card-lesson.mp4)        |
| `faceless-mixed-short`      | `showcase candidate`     | Mixed stock, local clips, diagrams, UI, generated images, and captions                                           | [`faceless-mixed-short`](../../skills/faceless-mixed-short/SKILL.md)                       | [Faceless Mixed Short](examples/faceless-mixed-short.md)           | [`demo-15`](../demo/demo-15-faceless-mixed-short.mp4)      |
| `gameplay-confession-split` | `showcase candidate`     | Non-Reddit confession or storytime with support footage plus gameplay                                            | [`gameplay-confession-short`](../../skills/gameplay-confession-short/SKILL.md)             | [Subway Confession Story](examples/subway-confession-story.md)     | [`demo-16`](../demo/demo-16-gameplay-confession-split.mp4) |
| `micro-doc-breakdown`       | `proving candidate`      | Mini documentary, myth correction, timeline, evidence inserts                                                    | [`micro-doc-breakdown-short`](../../skills/micro-doc-breakdown-short/SKILL.md)             | [Micro-Doc Breakdown](examples/micro-doc-breakdown.md)             | [`demo-17`](../demo/demo-17-micro-doc-breakdown.mp4)       |

## Source-Media Lanes

Use these when the content already exists in a source file or URL and
the agent needs to find the best short-form moment.

| Need                                    | Use These Skills                                                                                                                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan a longform clip run                | [`longform-to-shorts`](../../skills/longform-to-shorts/SKILL.md) and [`longform-to-shorts.flow`](../../flows/longform-to-shorts.flow)                                                                            |
| Analyze source file quality and signals | [`source-media-review`](../../skills/source-media-review/SKILL.md), [`source-media-analyze`](../../skills/source-media-analyze/SKILL.md)                                                                         |
| Select promising moments                | [`longform-highlight-select`](../../skills/longform-highlight-select/SKILL.md), [`highlight-approval`](../../skills/highlight-approval/SKILL.md)                                                                 |
| Snap edit boundaries                    | [`boundary-snap`](../../skills/boundary-snap/SKILL.md), [`text-selection-to-timestamps`](../../skills/text-selection-to-timestamps/SKILL.md)                                                                     |
| Extract approved clips                  | [`longform-clip-extract`](../../skills/longform-clip-extract/SKILL.md)                                                                                                                                           |
| Reframe to vertical                     | [`reframe-vertical`](../../skills/reframe-vertical/SKILL.md), [`face-or-screen-reframe`](../../skills/face-or-screen-reframe/SKILL.md), [`scene-aware-smart-crop`](../../skills/scene-aware-smart-crop/SKILL.md) |
| Render and review                       | [`video-render`](../../skills/video-render/SKILL.md), [`publish-prep-review`](../../skills/publish-prep-review/SKILL.md)                                                                                         |

## Additive Visual Treatments

Use these after the lane has been chosen. They change the support
visuals, not the content grammar.

| Treatment                         | Status                          | Use When                                                                                                             | Skill                                                                                      | Example                                                                        | Demo                                                       |
| --------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `procedural-gameplay-backgrounds` | `supporting showcase candidate` | The short needs gameplay-like motion without supplied gameplay; current demo is `1080x1920` with provenance attached | [`procedural-gameplay-backgrounds`](../../skills/procedural-gameplay-backgrounds/SKILL.md) | [Procedural Gameplay Backgrounds](examples/procedural-gameplay-backgrounds.md) | [`demo-20`](../demo/demo-20-content-machine-3d-runner.mp4) |
| `motion-design-code`              | `skill-backed`                  | The visual system is SVG, HTML/CSS, React, or Remotion motion                                                        | [`motion-design-coder`](../../skills/motion-design-coder/SKILL.md)                         | [Motion Card Lesson](examples/motion-card-lesson.md)                           | [`demo-14`](../demo/demo-14-motion-card-lesson.mp4)        |

## Research-Backed Families

The vendor/repo research currently groups future work into six families:

| Family                      | Local Research                                                                                        | Skill Surface                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Reddit/story gameplay       | [`01-reddit-story-gameplay`](../research/archetypes/01-reddit-story-gameplay-20260429.md)             | Reddit and gameplay story skills                |
| Longform clip factory       | [`02-longform-clip-factory`](../research/archetypes/02-longform-clip-factory-20260429.md)             | longform, highlight, crop, caption skills       |
| Topic-to-faceless explainer | [`03-topic-to-faceless-explainer`](../research/archetypes/03-topic-to-faceless-explainer-20260429.md) | brief, script, stock, mixed, render skills      |
| UGC/avatar/product short    | [`04-ugc-avatar-product-short`](../research/archetypes/04-ugc-avatar-product-short-20260429.md)       | UGC/avatar and SaaS/product skills              |
| Motion graphics lesson      | [`05-motion-graphics-lesson`](../research/archetypes/05-motion-graphics-lesson-20260429.md)           | motion-card, animation, micro-doc skills        |
| Captions/export primitives  | [`06-caption-export-primitives`](../research/archetypes/06-caption-export-primitives-20260429.md)     | caption, timing, safe-zone, publish-prep skills |

For deeper routing rules, use
[`short-form-archetype-research`](../../skills/short-form-archetype-research/SKILL.md).

## Backlog Lanes

These should be built one at a time. Do not promote them to README
showcase status until each has a skill, example request, user doc, demo
MP4/GIF, and honest review result.

| Lane                            | Why It Matters                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `comment-reply-short`           | Native TikTok/Reels pattern: answer a viewer comment first.                      |
| `search-intent-short`           | Evergreen Shorts/search packaging with exact query as hook.                      |
| `teardown-lab-short`            | Proof-first diagnosis of a failed screenshot, page, clip, or artifact.           |
| `saveable-framework-short`      | Builds toward a screenshotable checklist, prompt, or template.                   |
| `review-mined-ugc-short`        | Turns reviews and complaints into stronger product proof.                        |
| `document-to-brainrot-short`    | PDF/article/text transformed into narration over gameplay or satisfying footage. |
| `ai-slideshow-microstory-short` | Generated images plus TTS/music for fictional or cinematic microstories.         |
| `reaction-remix-short`          | React/stitch/remix pattern with source-rights guardrails.                        |
| `custom-game-challenge-short`   | Gaming challenge or mod recap instead of generic gameplay filler.                |
| `platform-variant-packaging`    | Same thesis exported with TikTok, Reels, and Shorts-specific packaging.          |

The backlog source of truth is
[`docs/direction/09-vendor-archetype-backlog-20260429.md`](../direction/09-vendor-archetype-backlog-20260429.md).

## Promotion Rule

A lane is not a showcase just because it renders. Before promotion, it
needs:

- a named skill or skill family
- an example request
- a user-facing example page
- a tracked MP4 or GIF preview
- passing base publish-prep gates
- explicit notes for any remaining OCR/caption-sync, source-media,
  design, or platform-safe-zone gaps
