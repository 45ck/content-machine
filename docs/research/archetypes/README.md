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
- `repo-cards/*.md` - focused per-repo implementation cards.
- `recipes/*.md` - concrete per-archetype production recipes.
- `manifests/evidence-assets.csv` - copied evidence asset inventory.
