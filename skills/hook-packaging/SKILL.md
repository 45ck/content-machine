---
name: hook-packaging
description: Generate and evaluate multiple short-form hook, title, cover, opening-frame, and platform-packaging variants before scripting or rendering, then choose a default and preserve the rationale.
---

# Hook Packaging

## Use When

- A short needs hooks, titles, cover text, thumbnail direction, opening
  frame, platform description, or publish metadata before script or
  render work starts.
- The agent needs several packaging options instead of a single guessed
  title.
- A production run should preserve why one hook/title/cover direction was
  selected and which alternatives remain available.

## Core Rule

Do packaging before committing the script or render plan. Generate
multiple variants, score them against the target archetype and platform,
pick one default, and save enough rationale that later script, hook
overlay, cover, and publish-prep steps can stay aligned.

## Inputs

- topic, premise, product, source clip, or rough script idea
- target platform: `tiktok`, `reels`, `youtube_shorts`, or `generic`
- selected short-form archetype or candidate archetypes
- audience, tone, brand constraints, and prohibited claims
- optional source facts, proof points, references, or transcript moments
- optional render constraints: aspect ratio, safe zones, cover format,
  existing hook overlay style, or platform metadata needs

## Outputs

- `packaging-variants.v1.json` with `3-8` variants
- selected default variant id
- rationale for the default and rejected alternatives
- hook overlay or opening-frame direction for the first `1s` to `3s`
- cover/title text, optional subtitle, and thumbnail composition notes
- platform metadata draft: caption/description, hashtags, and CTA when
  useful
- downstream handoff notes for script, `hook-overlay`, `video-render`,
  and `publish-prep-review`

## Workflow

1. Confirm or choose the primary short-form archetype. Use
   [`short-form-archetype-research`](../short-form-archetype-research/SKILL.md)
   when the format is not already clear.
2. Extract the packaging promise: viewer payoff, tension, curiosity gap,
   proof point, or utility outcome.
3. Generate `3-8` distinct variants. Vary the angle, not just synonyms:
   curiosity, contrarian, proof-led, consequence, list/promise,
   question, direct benefit, or story setup.
4. For each variant, specify:
   `id`, `hookText`, `title`, `coverText`, `openingFrame`,
   `metadata`, `intendedArchetype`, `riskNotes`, `score`, and
   `rationale`.
5. Score variants on clarity, thumb-stop strength, honesty, archetype
   fit, platform fit, visual feasibility, first-frame readability, and
   script/render alignment.
6. Pick one default and explain the tradeoff in one short paragraph.
7. Pass the default into script planning, cover/opening-frame design, and
   [`hook-overlay`](../hook-overlay/SKILL.md) when the first beat needs a
   designed overlay.
8. Keep rejected variants in the artifact for future A/B tests or
   revision loops; do not overwrite them with the winner only.

## Scoring Guidance

- Prefer concrete stakes over vague hype.
- Prefer truthful specificity over clickbait.
- Penalize claims the script cannot prove in the first half of the
  short.
- Penalize hooks that require tiny text, unsafe-zone placement, or a
  visually impossible cover.
- Reward variants that give the script an obvious first beat and give
  the render a clear opening frame.
- Keep platform metadata native: short descriptions for TikTok/Reels,
  searchable but not spammy titles for YouTube Shorts, and hashtags that
  describe the actual topic.

## Output Shape

Use this shape when writing or returning the artifact:

```json
{
  "schema": "packaging-variants.v1",
  "platform": "youtube_shorts",
  "archetype": "topic-faceless-explainer",
  "defaultVariantId": "v3",
  "selectionRationale": "Why this variant is the safest strongest default.",
  "variants": [
    {
      "id": "v1",
      "hookText": "Opening spoken or on-screen hook.",
      "title": "Platform title",
      "coverText": "Short cover copy",
      "openingFrame": {
        "visual": "First-frame visual direction",
        "overlay": "Hook overlay or card direction"
      },
      "metadata": {
        "description": "Draft caption or description",
        "hashtags": ["#example"],
        "cta": "Optional CTA"
      },
      "score": {
        "clarity": 4,
        "curiosity": 5,
        "honesty": 5,
        "archetypeFit": 4,
        "visualFeasibility": 4
      },
      "rationale": "Why this variant works or loses.",
      "riskNotes": ["Specific claim or readability risk"]
    }
  ]
}
```

## Pair With

- Use before [`brief-to-script`](../brief-to-script/SKILL.md) or
  [`generate-short`](../generate-short/SKILL.md) so scripts inherit the
  selected promise.
- Use with [`hook-overlay`](../hook-overlay/SKILL.md) when the opening
  frame needs a designed hook card or overlay.
- Use with [`publish-prep-review`](../publish-prep-review/SKILL.md) so
  final platform metadata and first-frame quality can be checked against
  the chosen package.

## Validation Checklist

- At least three meaningfully different variants exist.
- One default is selected and justified.
- Rationale names both upside and risk.
- The winner fits the chosen archetype and target platform.
- Cover and opening-frame notes are renderable in a vertical safe zone.
- Metadata does not promise anything the script or source material cannot
  support.
