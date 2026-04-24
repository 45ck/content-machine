---
name: longform-to-shorts
description: Turn a podcast, interview, talk, screen recording, or long YouTube video into strong vertical shorts by selecting moments, snapping cut boundaries, reframing to 9:16, and rendering with native captions.
---

# Longform To Shorts

## Use When

- The user already has a long video or URL and wants multiple shorts,
  not a net-new faceless script.
- The main problem is moment selection, clipping, reframing, and
  captioning.
- The source is a talk, podcast, interview, screen recording, or
  commentary video where transcript quality matters more than stock
  sourcing.

## Core Approach

1. Start with transcript and structure, not with random timestamps.
2. Score candidate clips on hook, coherence, value density, emotional
   intensity, and payoff.
3. Snap cut points to speech boundaries, sentence endings, and silences.
4. Reframe for portrait based on source type: speaker, cursor, or
   general center-safe crop.
5. Use aggressive captions only after clip quality is proven.

## Inputs

- long-form local video file or URL
- optional transcript or transcript cache
- target platform
- optional source type hint: `talking-head`, `podcast`,
  `screen-recording`, `mixed`

## Outputs

- candidate clip list or approved clip plan
- per-clip timestamps
- portrait-ready render inputs
- final short MP4s plus review bundles if executed end to end

## Optional Runtime Surface

- Use [`longform-highlight-select`](../longform-highlight-select/SKILL.md)
  to produce ranked candidate moments from word-level timestamps before
  clipping or reframing.
- Use [`reverse-engineer-winner`](../reverse-engineer-winner/SKILL.md)
  for reference analysis only, not raw clipping.
- Use [`video-render`](../video-render/SKILL.md) and
  [`publish-prep-review`](../publish-prep-review/SKILL.md) for final
  output and review.
- If the clipping path becomes a repo runner later, this skill should
  remain the decision layer.

## Technical Notes

- Pull from `yt-dlp`, transcript, scene detection, and blueprint files
  when available.
- The first executable selector is transcript/timestamp based. Frame,
  speaker, face, and cursor signals should be added after candidate
  moment selection is stable.
- Use [`reframe-vertical`](../reframe-vertical/SKILL.md) for crop
  strategy.
- Use [`short-form-captions`](../short-form-captions/SKILL.md) after
  moment selection and reframing are stable.

## Aggregated From

- `AgriciDaniel/claude-shorts`
- `imgly/videoclipper`
- `iDoust/youtube-clip`
- `mutonby/openshorts`

## Validation Checklist

- Chosen clips make sense without full-video context.
- Start and end points do not cut across words or thoughts.
- Portrait framing keeps the active subject or screen action readable.
- Captions fit the clip instead of compensating for a weak selection.
- Final clips feel like distinct shorts, not arbitrary excerpts.
