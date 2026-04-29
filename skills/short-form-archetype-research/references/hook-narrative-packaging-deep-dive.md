# Hook, Narrative, And Packaging Deep Dive

Date: 2026-04-29

## Purpose

Shorts are not only scripts plus captions. The opener, title, cover text,
muted-autoplay hook, platform description, and CTA form the packaging system
that decides whether the edit gets watched. The deeper repo pass shows that
winning systems produce packaging as structured variants, not as one final
string.

## Source Signals

| Source                            | Signal                                                                                                                                   | Content-machine takeaway                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `1Dengaroo__rshorts` story prompt | Title must sound like a real Reddit post title, not generic clickbait; story must include dialogue, mundane details, escalation, fallout | Archetype prompts need title/hook rules, not only script rules       |
| `mutonby__openshorts` main prompt | Returns clip descriptions for TikTok/Instagram, YouTube Shorts title, and short viral hook overlay                                       | Longform clips need per-platform packaging at candidate level        |
| `mutonby__openshorts` README      | Hook overlays, AI titles, descriptions, thumbnails, gallery metadata, direct publishing                                                  | Packaging is part of the pipeline after selection and before publish |
| Current `src/package`             | Generates title, cover text, and on-screen hook variants with scoring                                                                    | Good base; extend to archetype and platform-specific scoring         |
| Current `src/publish`             | Produces title, description, hashtags, checklist                                                                                         | Good publish metadata base; connect it to selected packaging variant |

## Artifact Stack

### `hook-tests.v1.json`

Purpose: compare multiple hook candidates before script or clip approval.

Fields:

- `hook_id`
- `hook_text`
- `source`: script, transcript, generated, manual
- `archetype`
- `platform`
- `first_frame_pairing`
- `mute_readability_score`
- `curiosity_score`
- `specificity_score`
- `risk_notes`
- `selected`

### `narrative-package.v1.json`

Purpose: bind the actual video structure to public-facing packaging.

Fields:

- `archetype`
- `hook`
- `title`
- `cover_text`
- `on_screen_hook`
- `cta`
- `promise`
- `proof_or_payoff`
- `platform_variants`
- `selected_variant_id`

### `platform-packaging.v2.json`

Purpose: extend the existing package artifact with platform-specific shape.

Fields:

- `variants[]`
- `platform`
- `title`
- `description`
- `hashtags`
- `cover_text`
- `hook_overlay`
- `thumbnail_prompt`
- `posting_notes`
- `score_breakdown`

## Implementation Delta

Current packaging scoring checks title, cover text, and hook word ranges. The
next layer should score:

- platform fit
- archetype fit
- first-frame compatibility
- whether the hook overpromises the actual payoff
- whether cover text is distinct from captions
- whether CTA is present only when the format expects one

For longform clips, packaging should be candidate-level because each candidate
may need a different angle even when cut from the same source video.

## Quality Gates

- A hook must be understandable without prior context.
- A title must match the archetype's native language.
- Cover text must not duplicate a dense caption lane.
- Packaging must not promise a payoff absent from the video.
- Publish metadata should point back to the selected package variant.

## Bead Targets

This report supports:

- `content-machine-ar11`: typed prompt/schema contracts.
- `content-machine-ar14`: semantic clip selection and candidate collections.
- `content-machine-ar19`: hook and narrative packaging artifacts.
