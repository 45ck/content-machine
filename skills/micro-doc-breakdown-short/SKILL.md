---
name: micro-doc-breakdown-short
description: Make a 30-60 second faceless micro-documentary short with archival-style cards, timeline beats, evidence inserts, narration, captions, and publish-prep review.
---

# Micro-Doc Breakdown Short

## Use When

- The topic is a compact history, business, technology, culture, or
  science explanation.
- The output should feel like a compressed documentary, not a listicle
  or generic stock montage.
- The story benefits from dates, artifacts, receipts, maps, quote cards,
  diagrams, or before/after framing.

## Core Approach

1. Start with the mistaken simple story.
2. Replace it with a clearer mechanism: money, incentives, timing,
   infrastructure, policy, technology, or behavior.
3. Use 6 to 9 documentary-native visual beats:
   opener, model, artifact, timeline, map/chart, consequence, lesson.
4. Cut every 1.5s to 3s with real visual changes. Use evidence cards or
   archival inserts when a long scene would become static.
5. Keep captions in a protected dark safe band so OCR and viewers do not
   confuse background document text with the spoken caption.
6. End with a saveable lesson, not a vague CTA.

## Inputs

- topic or thesis
- optional dates, source notes, screenshots, charts, or documents
- optional tone, such as `business history`, `tech history`, or
  `mini-investigation`

## Outputs

- `script.json`
- `audio.wav` and `timestamps.json`
- archival/card/diagram visual assets
- final portrait MP4
- `publish-prep` review bundle

## Current Candidate Example

- Local proving bundle:
  `experiments/proving-wave-3/micro-doc-breakdown/outputs/final/video.mp4`
- Tracked preview:
  `docs/demo/demo-17-micro-doc-breakdown.mp4`
- Pattern used: Blockbuster myth-correction opener, business-model card,
  receipt artifact, Netflix pain-point timeline, debt/store-load card,
  bankruptcy card, lesson card, evidence-card inserts, voiceover,
  captions, and audio normalization.
- Base publish-prep passed portrait resolution, duration, format,
  cadence, script score, and audio-signal gates. OCR caption-sync still
  fails on median/P95 drift, and the current evidence-card inserts still
  need stronger design polish. Treat this as a candidate, not a golden
  example.

## Optional Runtime Surface

- Compose this with [`brief-to-script`](../brief-to-script/SKILL.md),
  [`script-to-audio`](../script-to-audio/SKILL.md),
  [`timestamps-to-visuals`](../timestamps-to-visuals/SKILL.md),
  [`video-render`](../video-render/SKILL.md), and
  [`publish-prep-review`](../publish-prep-review/SKILL.md).
- Use [`animation-explainer-short`](../animation-explainer-short/SKILL.md)
  for abstract diagram scenes.
- Use [`motion-card-lesson-short`](../motion-card-lesson-short/SKILL.md)
  for compact card-state grammar.
- Use [`short-form-captions`](../short-form-captions/SKILL.md) before
  final render so captions are grouped for readability, not just word
  dumps.

## Technical Notes

- Micro-docs need documentary texture: paper, maps, timelines, ledgers,
  receipts, archive cards, UI snapshots, or diagrams.
- Do not rely on keyword B-roll alone. Every visual should explain a
  claim, show an artifact, or reset attention.
- Do not place small background text behind captions. Use a safe band or
  move the text out of the OCR/caption region.
- If using FFmpeg fallback assembly, add `-nostdin` to scripted FFmpeg
  calls so FFmpeg does not consume later shell lines as commands.
- Generate caption sidecars and run `publish-prep` against the actual
  final MP4. If OCR fails, document the failure instead of promoting the
  lane as golden.

## Aggregated From

- this repo's animation explainer, motion-card, caption export, and
  publish-prep review stack
- imported short-form research on saveable, search-friendly,
  proof-first documentary packaging

## Validation Checklist

- First 2 seconds state the misconception or stakes.
- The mechanism is visually explained, not only narrated.
- Each scene changes before it becomes a static slide.
- Captions stay readable inside the vertical safe area.
- Audio is present, normalized, and not music-only.
- Publish-prep passes resolution, duration, format, cadence, and
  audio-signal gates.
- OCR caption-sync is either passing or explicitly documented as the
  remaining blocker.
