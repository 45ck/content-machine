---
name: stock-footage-edutainment-short
description: Turn a topic, fact, or news hook into a faceless stock-footage explainer short with hard scene structure, timed visual intent, captions, music, and packaging.
---

# Stock Footage Edutainment Short

Canonical lane ID: `stock-b-roll-explainer`.

Script archetype: `explainer` or `howto`.

## Use When

- The lane should feel like a classic faceless TikTok or Shorts
  explainer rather than a motion-graphic-heavy animation piece.
- The concept can be sold with stock clips, simple support visuals, and
  aggressive narration-led pacing.
- You want the `MoneyPrinter` family shape, but with stronger scene
  contracts than `topic -> 5 keywords -> render`.

## Core Approach

1. Write a hard hook in the first beat.
2. Structure the short as `hook -> context -> mechanism -> twist ->
payoff`.
3. Plan visuals per spoken beat, not from one global keyword bucket.
4. Keep scene durations tight:
   `4s` to `8s` for most beats.
5. Use captions, music, and support motion to prevent the stock layer
   from feeling like wallpaper.

## Inputs

- topic, thesis, or packaging promise
- optional niche or brand profile
- optional platform target:
  `tiktok`, `shorts`, `reels`
- optional stock provider preferences

## Outputs

- voiceover-first `script.json`
- beat-aware `visuals.json` with clip intent per scene
- final vertical MP4 plus review bundle
- packaging text:
  hook, title, CTA, and caption candidates

## Optional Runtime Surface

- Compose with [`niche-profile-draft`](../niche-profile-draft/SKILL.md)
  when the lane should inherit a niche voice.
- Use [`faceless-mixed-short`](../faceless-mixed-short/SKILL.md) as the
  broader runtime wrapper.
- Use [`short-form-captions`](../short-form-captions/SKILL.md) for the
  caption mode and phrase grouping.
- Use [`shot-prompt-builder`](../shot-prompt-builder/SKILL.md) when
  generated scenes or stronger prompt language are needed.

## Technical Notes

- Do not stop at one flat list of search terms. Each scene should carry
  its own visual subject or action.
- If stock cannot sell a beat cleanly, switch that beat to a card,
  diagram, generated image, or support UI instead of stretching a weak
  clip.
- Prefer one or two crisp search intents per beat over vague “concept”
  terms.
- Music and transitions should separate beats; they should not be used
  to disguise weak visual matching.
- If a local fallback assembler is used, it still has to emit caption
  sidecars and go through the same review gate as the canonical render
  path.
- If the visual lane falls back to static cards or stills, add real
  motion treatment or swap the beat. Otherwise temporal/freeze review
  will correctly treat it as a slideshow.

## Aggregated From

- `harry0703/MoneyPrinterTurbo`
- `SaarD00/AI-Youtube-Shorts-Generator`
- `RayVentura/ShortGPT`
- `rushindrasinha/youtube-shorts-pipeline`

## Validation Checklist

- The hook lands without waiting for setup.
- Each scene has its own visual job, not just reused generic footage.
- Stock clips feel chosen for the line being spoken.
- The short reads as mobile-native edutainment, not slideshow stock
  filler.
- Packaging outputs match the script instead of being invented after
  render.
- Review should be run against the real shipped MP4, not only the scene
  plan and script.
- Burned captions are visible in the shipped file; OCR review should not
  come back with “missing captions.”
