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
7. When the user asks for public examples, use
   [youtube-reference-corpus.md](references/youtube-reference-corpus.md)
   and `assets/manifests/youtube-reference-corpus.json` as metadata-only
   references.
8. When repo parity matters, read
   [deep-repo-extraction.md](references/deep-repo-extraction.md) before
   proposing runtime changes.
9. For implementation work, read
   [implementation-signal-matrix.md](references/implementation-signal-matrix.md)
   and
   [content-machine-extraction-targets.md](references/content-machine-extraction-targets.md)
   to map repo patterns to concrete artifacts.
10. For deep implementation work, read
    [caption-timing-rendering-deep-dive.md](references/caption-timing-rendering-deep-dive.md),
    [prompt-schema-extraction.md](references/prompt-schema-extraction.md),
    [render-runtime-decision-matrix.md](references/render-runtime-decision-matrix.md),
    and
    [workflow-architecture-deep-dive.md](references/workflow-architecture-deep-dive.md).
11. For longform, crop, asset, and review implementation, read
    [clip-selection-and-reframing-deep-dive.md](references/clip-selection-and-reframing-deep-dive.md),
    [source-media-asset-visual-verification-deep-dive.md](references/source-media-asset-visual-verification-deep-dive.md),
    [review-eval-and-governance-deep-dive.md](references/review-eval-and-governance-deep-dive.md),
    and
    [content-machine-integration-sequence.md](references/content-machine-integration-sequence.md).
12. For hook, audio, continuity, and publish implementation, read
    [hook-narrative-packaging-deep-dive.md](references/hook-narrative-packaging-deep-dive.md),
    [audio-voice-music-mix-deep-dive.md](references/audio-voice-music-mix-deep-dive.md),
    [visual-continuity-storyboard-generation-deep-dive.md](references/visual-continuity-storyboard-generation-deep-dive.md),
    and
    [platform-packaging-and-publish-deep-dive.md](references/platform-packaging-and-publish-deep-dive.md).
13. For batch, localization, style profile, feedback, analytics, risk, and
    upload-boundary implementation, read
    [batch-queue-gallery-production-deep-dive.md](references/batch-queue-gallery-production-deep-dive.md),
    [localization-dubbing-language-deep-dive.md](references/localization-dubbing-language-deep-dive.md),
    [style-template-profile-system-deep-dive.md](references/style-template-profile-system-deep-dive.md),
    [feedback-analytics-learning-loop-deep-dive.md](references/feedback-analytics-learning-loop-deep-dive.md),
    [risk-compliance-upload-boundaries-deep-dive.md](references/risk-compliance-upload-boundaries-deep-dive.md),
    and
    [deep-implementation-backlog-sequence.md](references/deep-implementation-backlog-sequence.md).
14. For reference ingest, skill/flow/harness contracts, research evidence,
    media synthesis, telemetry, provider governance, and eval datasets, read
    [reference-ingest-videospec-blueprint-deep-dive.md](references/reference-ingest-videospec-blueprint-deep-dive.md),
    [flow-skill-harness-contract-deep-dive.md](references/flow-skill-harness-contract-deep-dive.md),
    [research-evidence-briefing-deep-dive.md](references/research-evidence-briefing-deep-dive.md),
    [media-synthesis-provider-orchestration-deep-dive.md](references/media-synthesis-provider-orchestration-deep-dive.md),
    [observability-cost-retry-cache-deep-dive.md](references/observability-cost-retry-cache-deep-dive.md),
    and
    [eval-ci-golden-dataset-deep-dive.md](references/eval-ci-golden-dataset-deep-dive.md).
15. For better agent-generated SVG, HTML, CSS, and Remotion animation,
    use [`motion-design-coder`](../motion-design-coder/SKILL.md) and read
    [agent-motion-design-skill-systems-deep-dive.md](references/agent-motion-design-skill-systems-deep-dive.md),
    [remotion-svg-html-css-animation-quality-deep-dive.md](references/remotion-svg-html-css-animation-quality-deep-dive.md),
    [animation-review-render-validation-deep-dive.md](references/animation-review-render-validation-deep-dive.md),
    and
    [animation-skill-implementation-sequence.md](references/animation-skill-implementation-sequence.md).

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
- Treat searched YouTube, TikTok, and Reels links as metadata-only research
  unless rights are separately cleared.
- Prefer the asset pack manifest in `assets/manifests/asset-pack-index.json`
  before searching manually.
- Use platform profiles in
  `assets/manifests/platform-export-profiles.json` for duration, aspect,
  safe-zone, and caption checks.
- Use [video-asset-acquisition-policy.md](references/video-asset-acquisition-policy.md)
  before downloading, copying, or rendering from public video references.
- If a source repo pattern depends on a missing external asset, record
  the required asset class rather than pretending the template is
  complete.

## Output Behavior

When advising, return:

- chosen archetype and why it fits
- required source assets
- matching skill/example request or blueprint path
- repo evidence consulted
- public video references consulted, if any
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

The deeper repo pass promotes these artifact targets:

- `director-score.v1.json`
- `clip-candidates.v2.json`
- `crop-plan.v1.json`
- `asset-ledger.v1.json`
- `caption-recipe.v1.json`
- `visual-match-report.v1.json`
- `run-ledger.v1.jsonl`

The implementation-layer pass adds:

- `audio-analysis.v1.json`
- `word-timestamps.v2.json`
- `caption-groups.v1.json`
- `caption-render-plan.v1.json`
- `caption-export-report.v1.json`
- `prompt-contract.v1.json`
- `transcript-edit.v1.json`
- `render-runtime-decision.v1.json`
- `decision-log.v1.json`
- `project-state.v1.json`

The continuation pass adds:

- `text-selection-candidates.v1.json`
- `clip-collection.v1.json`
- `speaker-face-map.v1.json`
- `smart-crop-track.v1.json`
- `source-media-review.v1.json`
- `frame-samples.v1.json`
- `visual-match-report.v2.json`
- `review-bundle.v1.json`
- `provider-selection.v1.json`
- `cost-log.v1.json`
- `archetype-parity-fixture.v1.json`

The creative-production pass adds:

- `hook-tests.v1.json`
- `narrative-package.v1.json`
- `voice-cast.v1.json`
- `audio-segments.v1.json`
- `audio-review.v1.json`
- `style-bible.v1.json`
- `character-sheet.v1.json`
- `storyboard-grid.v1.json`
- `visual-continuity-report.v1.json`
- `publish-package.v2.json`
- `thumbnail-plan.v1.json`
- `distribution-handoff.v1.json`

The operations/localization/feedback pass adds:

- `batch-run.v1.json`
- `job-queue-event.v1.jsonl`
- `sample-approval.v1.json`
- `gallery-entry.v1.json`
- `batch-output-manifest.v1.json`
- `batch-policy.v1.json`
- `locale-plan.v1.json`
- `translation-map.v1.json`
- `dub-script.v1.json`
- `voice-transfer-plan.v1.json`
- `localized-captions.v1.json`
- `localized-publish-package.v1.json`
- `style-profile.v2.json`
- `template-contract.v1.json`
- `preset-resolution-report.v1.json`
- `hook-library.v1.json`
- `template-safety-review.v1.json`
- `performance-snapshot.v1.json`
- `creator-feedback.v1.json`
- `variant-outcome.v1.json`
- `quality-label.v1.json`
- `archetype-learning-note.v1.json`
- `upload-boundary-review.v1.json`
- `rights-gate.v1.json`
- `credential-requirement.v1.json`
- `repost-risk-review.v1.json`
- `public-reference-use.v1.json`

The agent-runtime/eval pass adds:

- `reference-ingest-request.v1.json`
- `video-theme.v1.json`
- `video-blueprint.v1.json`
- `reference-frame-analysis.v1.json`
- `reference-to-production-brief.v1.json`
- `skill-route.v1.json`
- `flow-execution-plan.v1.json`
- `harness-envelope.v1.json`
- `stage-input-output-map.v1.json`
- `agent-handoff.v1.json`
- `research-query-plan.v1.json`
- `evidence-pack.v1.json`
- `claim-map.v1.json`
- `angle-selection.v1.json`
- `brief-package.v1.json`
- `media-synthesis-request.v1.json`
- `media-provider-selection.v1.json`
- `media-synthesis-job.v1.json`
- `generated-media-ledger.v1.json`
- `media-generation-review.v1.json`
- `run-telemetry.v1.jsonl`
- `provider-call-log.v1.jsonl`
- `retry-policy.v1.json`
- `cache-decision.v1.json`
- `budget-summary.v1.json`
- `golden-archetype-dataset.v1.json`
- `eval-run-plan.v1.json`
- `archetype-parity-report.v2.json`
- `golden-failure-case.v1.json`
- `ci-eval-summary.v1.json`

The agent-motion-design pass adds:

- `motion-brief.v1.json`
- `agent-motion-skill.v1.json`
- `motion-code-review.v1.json`
- `motion-token-map.v1.json`
- `remotion-motion-plan.v1.json`
- `svg-motion-plan.v1.json`
- `html-css-motion-plan.v1.json`
- `motion-frame-samples.v1.json`
- `motion-smoothness-report.v1.json`
- `animation-safe-zone-report.v1.json`
- `render-performance-risk.v1.json`
- `motion-review-bundle.v1.json`

Use `assets/manifests/runtime-artifact-roadmap.json` to map these artifacts
to source signals, priorities, and Beads.
Use `assets/manifests/production-quality-artifact-roadmap.json` for the
clip/crop/source-review/visual-review/final-review continuation.
Use `assets/manifests/creative-production-artifact-roadmap.json` for
hook/audio/continuity/publish continuation work.
Use `assets/manifests/operations-localization-feedback-roadmap.json` for
batch/localization/style/feedback/risk continuation work.
Use `assets/manifests/agent-runtime-eval-roadmap.json` for reference ingest,
agent execution contracts, research evidence, media synthesis, telemetry, and
eval continuation work.
Use `assets/manifests/agent-motion-design-roadmap.json` for motion-design
skill, Remotion/SVG/HTML/CSS planning, smoothness review, and publish-prep
integration work.

## Non-Goals

- Do not copy reference repo code into runtime without a separate
  implementation task and license/provenance review.
- Do not use assets with unknown source or unclear reuse rights.
- Do not approve boxed, guttered, or caption-colliding vertical output
  unless that is explicitly part of the chosen format.
