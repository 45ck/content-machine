# Visual Continuity And Storyboard Generation Deep Dive

Date: 2026-04-29

## Purpose

Generated visuals fail when each scene is prompted in isolation. The deeper
repo pass shows stronger systems using character sheets, scene sheets, prop
sheets, style descriptions, storyboard grids, first/last-frame chaining, and
asset regeneration controls.

## Source Signals

| Source                                   | Signal                                                                                                                                | Content-machine takeaway                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `ArcReel__ArcReel` grid prompt builder   | Builds grid prompts with fixed layout, first-frame/transition/last-frame chain, reference image mapping, and negative constraints     | Storyboard continuity can be prompted as a structured multi-panel artifact |
| `ArcReel__ArcReel` media generator       | Separates storyboards, videos, characters, and scenes into asset classes                                                              | Generated media should distinguish reference assets from render assets     |
| `xhongc__ai_story` prompt/assets UI      | Prompt templates, asset extraction, model provider choice, previews, reusable image variables                                         | Prompt and asset work needs previewable state                              |
| `leke-adewa__short-video-maker` planner  | Generates image prompt and music prompt from structured plan; supports asset regeneration                                             | Scene plans should own prompts and regeneration scope                      |
| Current `src/visuals/schema.ts`          | Visual assets include source, path, duration, asset type, motion strategy, generation prompt/model/cost, reasoning, provider attempts | Good base; add continuity and storyboard references                        |
| Current `src/visuals/provider-router.ts` | Routes providers by configured, balanced, cost-first, or quality-first policies                                                       | Provider routing should consider continuity requirements                   |

## Artifact Stack

### `style-bible.v1.json`

Purpose: keep visual language stable across the short.

Fields:

- `style_id`
- `palette`
- `lighting`
- `lens_or_layout`
- `texture`
- `typography`
- `motion_language`
- `negative_constraints`

### `character-sheet.v1.json`

Purpose: preserve recurring person/avatar appearance.

Fields:

- `character_id`
- `description`
- `reference_asset_id`
- `allowed_variations`
- `forbidden_changes`
- `provider_notes`

### `scene-sheet.v1.json`

Purpose: preserve recurring locations or environments.

Fields:

- `scene_location_id`
- `description`
- `reference_asset_id`
- `lighting`
- `props`
- `continuity_notes`

### `storyboard-grid.v1.json`

Purpose: plan or generate multi-panel continuity references.

Fields:

- `grid_id`
- `rows`
- `cols`
- `aspect_ratio`
- `panels[]`
- `panel_scene_id`
- `panel_role`: opening, transition, ending, placeholder
- `reference_image_mapping`
- `negative_constraints`

### `visual-continuity-report.v1.json`

Purpose: review whether adjacent scene visuals match continuity requirements.

Fields:

- `scene_pair`
- `character_consistency`
- `environment_consistency`
- `style_consistency`
- `motion_continuity`
- `mismatch_reasons`
- `accepted`

## Implementation Delta

Current visuals artifacts store useful generation metadata but do not yet
express continuity obligations. Add continuity requirements to the scene plan,
then carry them into provider routing and visual review.

Provider routing should prefer generated-reference or image-edit workflows when
character consistency matters, while stock/B-roll explainers can stay looser.

## Quality Gates

- If a recurring character exists, later scenes must cite a character sheet or
  approved reference.
- If generated visuals are adjacent, a continuity review should compare them.
- Storyboard/grid prompts must include negative constraints against text,
  watermarks, layout errors, and inconsistent panels.
- Regenerating one visual should invalidate downstream continuity review for
  dependent scenes.

## Bead Targets

This report supports:

- `content-machine-ar8`: DirectorScore-style scene plan artifact.
- `content-machine-ar16`: visual verification artifacts.
- `content-machine-ar21`: visual continuity and storyboard artifacts.
