# Short-Form Archetype Research

Date: 2026-04-29
Purpose: organize the local short-form repo research into reusable archetypes,
evidence assets, and implementation decisions for `content-machine`.

## Start Here

1. `00-shortform-archetype-repo-synthesis-20260429.md` - executive synthesis.
2. `07-source-repo-catalog-20260429.md` - which repos were studied and what each contributes.
3. `08-asset-inventory-and-provenance-20260429.md` - copied evidence files and usage cautions.
4. `09-platform-snapshot-20260429.md` - current TikTok/Reels/Shorts constraints verified from official sources.
5. `10-extraction-backlog-20260429.md` - what should become skills, flows, assets, or validators.
6. `11-production-blueprint-matrix-20260429.md` - normalized production checklist across archetypes.
7. `12-archetype-asset-pack-spec-20260429.md` - durable run asset folder spec.
8. `13-archetype-routing-guide-20260429.md` - choose the right lane from a user request.
9. `14-quality-gates-and-eval-rubric-20260429.md` - review gates and scoring.
10. `15-youtube-reference-corpus-20260429.md` - metadata-only YouTube/video reference corpus.
11. `16-deep-repo-extraction-20260429.md` - deeper repo extraction pass and implementation gaps.
12. `17-video-asset-acquisition-policy-20260429.md` - what can be copied, linked, downloaded, or used.
13. `18-implementation-signal-matrix-20260429.md` - cross-repo implementation patterns.
14. `19-current-open-source-tool-watchlist-20260429.md` - current tools to monitor or import after review.
15. `20-content-machine-extraction-targets-20260429.md` - concrete content-machine artifact targets.
16. `21-caption-timing-rendering-deep-dive-20260429.md` - caption timing, grouping, render, and export artifacts.
17. `22-prompt-schema-extraction-20260429.md` - prompt/template and typed schema extraction.
18. `23-render-runtime-decision-matrix-20260429.md` - when to use Remotion, FFmpeg/Editly, Motion Canvas, or handoff runtimes.
19. `24-workflow-architecture-deep-dive-20260429.md` - project state, ledgers, approvals, versions, and rollback.
20. `25-clip-selection-and-reframing-deep-dive-20260429.md` - semantic candidate selection, collections, and crop tracks.
21. `26-source-media-asset-visual-verification-deep-dive-20260429.md` - source review, asset provenance, and visual match.
22. `27-review-eval-and-governance-deep-dive-20260429.md` - review bundle, eval fixtures, provider selection, and cost logs.
23. `28-content-machine-integration-sequence-20260429.md` - ordered implementation sequence across harnesses and skills.
24. `29-hook-narrative-packaging-deep-dive-20260429.md` - hook testing, narrative package, and platform packaging variants.
25. `30-audio-voice-music-mix-deep-dive-20260429.md` - voice casting, audio segments, mix plans, and audio review.
26. `31-visual-continuity-storyboard-generation-deep-dive-20260429.md` - style bibles, character sheets, storyboard grids, and continuity review.
27. `32-platform-packaging-and-publish-deep-dive-20260429.md` - publish packages, thumbnails, checklists, and distribution handoff.
28. `33-batch-queue-gallery-production-deep-dive-20260429.md` - batch runs, queues, sample approvals, galleries, and output manifests.
29. `34-localization-dubbing-language-deep-dive-20260429.md` - locale plans, translation maps, dub scripts, localized captions, and localized publish packages.
30. `35-style-template-profile-system-deep-dive-20260429.md` - style profiles, template contracts, preset resolution, hook libraries, and template safety.
31. `36-feedback-analytics-learning-loop-deep-dive-20260429.md` - performance snapshots, creator feedback, variant outcomes, labels, and learning notes.
32. `37-risk-compliance-upload-boundaries-deep-dive-20260429.md` - rights gates, upload boundaries, credential requirements, and repost risk review.
33. `38-deep-implementation-backlog-sequence-20260429.md` - dependency order across artifact schemas, harnesses, review gates, operations, and upload boundaries.
34. `39-reference-ingest-videospec-blueprint-deep-dive-20260429.md` - reference ingest, VideoSpec, theme classification, blueprint extraction, and reference-to-production briefs.
35. `40-flow-skill-harness-contract-deep-dive-20260429.md` - skill routing, flow execution plans, harness envelopes, stage maps, and agent handoffs.
36. `41-research-evidence-briefing-deep-dive-20260429.md` - research query plans, evidence packs, claim maps, angle selection, and cited briefs.
37. `42-media-synthesis-provider-orchestration-deep-dive-20260429.md` - media synthesis requests, provider selection, job records, generated media ledgers, and media review.
38. `43-observability-cost-retry-cache-deep-dive-20260429.md` - run telemetry, provider call logs, retry policy, cache decisions, and budget summaries.
39. `44-eval-ci-golden-dataset-deep-dive-20260429.md` - golden archetype datasets, eval run plans, parity reports, failure cases, and CI summaries.

## Archetype Reports

| Report                                       | Lane                                           |
| -------------------------------------------- | ---------------------------------------------- |
| `01-reddit-story-gameplay-20260429.md`       | Reddit/story narration over gameplay or motion |
| `02-longform-clip-factory-20260429.md`       | Longform to vertical clips                     |
| `03-topic-to-faceless-explainer-20260429.md` | Topic or brief to faceless explainer           |
| `04-ugc-avatar-product-short-20260429.md`    | UGC/avatar product or service short            |
| `05-motion-graphics-lesson-20260429.md`      | Motion graphics, Manim, cards, and lessons     |
| `06-caption-export-primitives-20260429.md`   | Captions, crop, safe zones, export profiles    |

## Evidence Bundle

Raw copied vendor assets were used as local research evidence. The committed
surface is the summarized reports, repo cards, recipes, manifests, and skill
references; do not ship copied code, screenshots, or templates in production
output without checking upstream licenses and attribution requirements.

Machine-readable research helpers:

- `blueprints/*.json` - normalized archetype blueprints.
- `manifests/source-repo-map.json` - source repos, signals, copied evidence.
- `manifests/asset-pack-index.json` - copied asset groups.
- `manifests/platform-export-profiles.json` - current platform export defaults with source links.
- `manifests/caption-style-recipes.json` - reusable caption style recipes.
- `manifests/youtube-reference-corpus.json` - searched YouTube/video references and asset policy.
- `manifests/deep-repo-signal-matrix.json` - repo signals mapped to proposed runtime artifacts.
- `manifests/runtime-artifact-roadmap.json` - implementation roadmap for caption, schema, render, and workflow artifacts.
- `manifests/production-quality-artifact-roadmap.json` - continuation roadmap for clip, crop, visual verification, review, and eval artifacts.
- `manifests/creative-production-artifact-roadmap.json` - continuation roadmap for hook, audio, visual continuity, and publish handoff artifacts.
- `manifests/operations-localization-feedback-roadmap.json` - continuation roadmap for batch, localization, style, feedback, and upload boundary artifacts.
- `manifests/agent-runtime-eval-roadmap.json` - continuation roadmap for reference ingest, flow contracts, research briefs, media synthesis, telemetry, and eval artifacts.
- `repo-cards/*.md` - focused per-repo implementation cards.
- `recipes/*.md` - concrete per-archetype production recipes.
- `manifests/evidence-assets.csv` - copied evidence asset inventory.
