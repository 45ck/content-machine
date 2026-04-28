---
name: short-form-archetype-research
description: Route and quality-gate TikTok, Instagram Reels, and YouTube Shorts production using the local 2026-04-29 archetype research pack, blueprints, repo evidence summaries, recipes, and provenance rules.
---

# Short-Form Archetype Research

## Use When

- The user asks how winning Reels, TikToks, or YouTube Shorts are made.
- You need to choose a production archetype before using
  `generate-short`, `video-render`, or a lane-specific skill.
- You need repo-backed evidence, asset requirements, recipes,
  or quality gates for a short-form format.
- You are comparing content-machine output against reference repos and
  want parity checks rather than generic style advice.

## Core Rule

Pick one archetype, load its blueprint, confirm required assets, and
apply the quality gates before generating or approving the short.

Do not mix archetypes casually. If the output should be hybrid, name the
primary archetype and the one secondary behavior it borrows.

## Workflow

1. Read [routing-guide.md](references/routing-guide.md) to choose the
   archetype.
2. Load the matching JSON blueprint from `assets/blueprints/`.
3. Load the matching recipe from `references/` when execution details
   matter.
4. Use lane-specific `examples/request.json` files when a production
   skill ships one.
5. Check [asset-pack-spec.md](references/asset-pack-spec.md) and
   [asset-inventory-and-provenance.md](references/asset-inventory-and-provenance.md)
   before copying or generating assets.
6. Apply
   [quality-gates-and-eval-rubric.md](references/quality-gates-and-eval-rubric.md)
   before handoff.

## Archetype Map

| Archetype                   | Use for                                                                 | Primary references                                                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reddit-story-gameplay`     | Reddit/confession narration over gameplay or satisfying loop footage    | [reddit-story-gameplay.md](references/reddit-story-gameplay.md), [raga70-reddit-bot.md](references/raga70-reddit-bot.md), [dr34ming-shorts-project.md](references/dr34ming-shorts-project.md)   |
| `longform-clip-factory`     | Podcast, talking-head, stream, webinar, or lecture highlight extraction | [longform-clip-factory.md](references/longform-clip-factory.md), [imgly-videoclipper.md](references/imgly-videoclipper.md), [shortgpt.md](references/shortgpt.md)                               |
| `topic-faceless-explainer`  | Topic-to-short videos from script plus stock or AI visuals              | [topic-faceless-explainer.md](references/topic-faceless-explainer.md), [gyoridavid-short-video-maker.md](references/gyoridavid-short-video-maker.md), [openshorts.md](references/openshorts.md) |
| `ugc-avatar-product-short`  | Product, SaaS, or app promo with avatar, demo, or testimonial structure | [ugc-avatar-product-short.md](references/ugc-avatar-product-short.md), [claude-shorts.md](references/claude-shorts.md)                                                                          |
| `motion-graphics-lesson`    | Dense educational explainers with diagrams, cards, or animated text     | [motion-graphics-lesson.md](references/motion-graphics-lesson.md), [samurai-ai-shorts.md](references/samurai-ai-shorts.md)                                                                      |
| `caption-export-primitives` | Caption design, subtitles, platform export profiles, and safe zones     | [caption-export-primitives.md](references/caption-export-primitives.md), [platform-snapshot.md](references/platform-snapshot.md)                                                                |

## Asset Rules

- Preserve provenance for copied source repo files, stock assets,
  gameplay loops, screenshots, generated media, and user-supplied media.
- Prefer the asset pack manifest in `assets/manifests/asset-pack-index.json`
  before searching manually.
- Use platform profiles in
  `assets/manifests/platform-export-profiles.json` for duration, aspect,
  safe-zone, and caption checks.
- If a source repo pattern depends on a missing external asset, record
  the required asset class rather than pretending the template is
  complete.

## Output Behavior

When advising, return:

- chosen archetype and why it fits
- required source assets
- matching skill/example request or blueprint path
- repo evidence consulted
- quality gates that must pass

When executing, hand off to the relevant skill or runtime script only
after the route and asset requirements are explicit.

## Quality Bar

The short should match the reference repo pattern at the level of
structure, timing, caption behavior, asset provenance, and platform
constraints. Codec success alone is not enough.

Use [production-blueprint-matrix.md](references/production-blueprint-matrix.md)
for expected stage artifacts and
[extraction-backlog.md](references/extraction-backlog.md) for known
implementation gaps.

## Non-Goals

- Do not copy reference repo code into runtime without a separate
  implementation task and license/provenance review.
- Do not use assets with unknown source or unclear reuse rights.
- Do not approve boxed, guttered, or caption-colliding vertical output
  unless that is explicitly part of the chosen format.
