---
name: niche-profile-draft
description: Generate one short-form draft artifact that uses a niche profile to shape hook style, tone, pacing, b-roll prompts, packaging copy, and thumbnail direction instead of treating those as separate disconnected steps.
---

# Niche Profile Draft

## Use When

- A short needs more than a generic script prompt.
- The channel or topic belongs to a recognizable niche with its own
  hook patterns, tone, pacing, and visual language.
- Packaging should stay aligned with the script instead of being
  invented later in isolation.

## Core Rule

- Let the niche profile shape the whole draft, not just the script.
- One upstream draft artifact should inform script, visuals, captions,
  and packaging.

## Inputs

- topic or news item
- optional channel context
- niche profile:
  hook patterns, tone rules, pacing rules, forbidden phrases, CTA
  options, visual guidance, thumbnail guidance
- platform target:
  `shorts`, `reels`, or `tiktok`

## Outputs

- one draft artifact containing:
  script,
  b-roll or shot prompts,
  title and description ideas,
  social captions,
  thumbnail direction
- carried-through research notes or grounding sources

## Workflow

1. Load the niche profile before drafting anything.
2. Research or ground the topic first so the draft does not fabricate
   facts.
3. Build one prompt that includes hook, tone, pacing, visual, and
   packaging constraints together.
4. Generate one draft artifact, not scattered partial outputs.
5. Sanitize the result so downstream stages receive stable strings and
   prompt arrays.

## Good Pattern

- the same niche logic shapes hook, script, b-roll, and packaging
- platform limits still constrain the draft
- research grounding is explicit
- forbidden phrases and CTA styles are enforced upstream

## Bad Pattern

- script in one style, thumbnail in another, captions in a third
- generic script first and “niche flavor” added later as frosting
- packaging copy that ignores the actual visual language of the short
- no grounding, then retroactive fact cleanup

## Pair With

- Use before [`brief-to-script`](../brief-to-script/SKILL.md) when the
  repo needs a more shaped upstream planning artifact.
- Pair with [`shot-prompt-builder`](../shot-prompt-builder/SKILL.md) and
  [`short-form-production-playbook`](../short-form-production-playbook/SKILL.md)
  for downstream execution.

## Aggregated From

- `rushindrasinha/youtube-shorts-pipeline` `verticals/draft.py`
- niche-profile-driven short-form drafting patterns

## Validation Checklist

- Hook, tone, pacing, and packaging all reflect the same niche profile.
- Draft output contains both editorial and visual-planning fields.
- Research or grounding is preserved in the artifact.
- Platform constraints still shape the final draft.
