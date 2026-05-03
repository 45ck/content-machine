---
name: longform-to-shorts
description: Turn a podcast, interview, talk, screen recording, or long YouTube video into strong vertical shorts by selecting moments, snapping cut boundaries, reframing to 9:16, and rendering with native captions.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"timestampsPath":"output/content-machine/audio/timestamps.json","sourceMediaPath":"input/source.mp4","outputDir":"runs/source-clips/longform-to-shorts","maxCandidates":3}'
entrypoint: node --import tsx scripts/harness/longform-to-shorts.ts
inputs:
  - name: timestampsPath
    description: Word-level timestamps from the longform transcript or ASR pass.
    required: true
  - name: sourceMediaPath
    description: Optional local source video or audio path for analysis and clipping provenance.
    required: false
  - name: outputDir
    description: Directory for candidate, boundary, approval, and handoff artifacts.
    required: false
  - name: approvedCandidateIds
    description: Candidate ids to approve after review.
    required: false
outputs:
  - name: highlight-candidates.v1.json
    description: Ranked short-form candidate moments.
  - name: render-handoff.v1.json
    description: Explicit handoff naming what still must be clipped, reframed, rendered, and reviewed.
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

## Runtime Surface

- Use the executable
  [`longform-to-shorts.flow`](../../flows/longform-to-shorts.flow) when
  a Claude Code, Codex CLI, Cursor, or similar harness needs the
  selection path in one run-scoped call.
- Use the direct `longform-to-shorts` runtime when one harness tool call
  is enough and the flow manifest is not needed.
- Use [`longform-highlight-select`](../longform-highlight-select/SKILL.md)
  directly only when you need to inspect or replace the selection stage
  in isolation.
- Use [`reverse-engineer-winner`](../reverse-engineer-winner/SKILL.md)
  for reference analysis only, not raw clipping.
- Use [`video-render`](../video-render/SKILL.md) and
  [`publish-prep-review`](../publish-prep-review/SKILL.md) for final
  output and review.
- Use [`references/production-shape.md`](references/production-shape.md)
  for the concrete boundary-snap, reframe, and review sequence.
- The current executable path stops at `render-handoff.v1.json`. It does
  not cut the source clip, reframe, or call `video-render` until
  clip-local render inputs exist.

## Invocation

Inside a harness, prefer outcome prompts such as:

> Use Content Machine to turn this longform video into candidate shorts.
> Run the longform-to-shorts flow, show me the candidate plan, and do
> not render until I approve a candidate.

Repo-local command form:

```bash
cat skills/longform-to-shorts/examples/request.json | \
  node --import tsx scripts/harness/longform-to-shorts.ts
```

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
