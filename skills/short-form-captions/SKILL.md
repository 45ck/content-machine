---
name: short-form-captions
description: Design and implement burned-in captions for short-form video across TikTok, Reels, Shorts, CapCut, Hormozi, karaoke, and educational styles using this repo's visual system and timing rules.
---

# Short-Form Captions

## Use When

- The user wants captions that feel native to short-form platforms
  instead of generic subtitles.
- You need to decide how captions should look, pace, group, animate,
  and sit against the frame.
- You are changing caption styling, timing, emphasis, or readability in
  this repo.
- You need to translate a creative brief into a caption treatment and
  then implement it in the repo's render stack.

## Non-Negotiables

- Captions are part of the edit, not an afterthought.
- Start from clean speech timing. Bad timestamps cannot be fixed by
  styling.
- Never use already-captioned published shorts as raw footage.
- Keep captions inside platform-safe zones.
- Reject caption layouts that force the viewer to read full sentences at
  once while the cut keeps moving.
- Prefer fewer, stronger words on screen over perfect transcript
  fidelity.

## Style Selection

- `capcut`: default kinetic short-form treatment. Use for creator-led
  explainers, product hooks, punchy commentary, and most general shorts.
- `tiktok`: bold uppercase with pill highlight. Use when you want the
  caption treatment to feel obviously native and high-contrast.
- `youtube`: cleaner educational style. Use when the information density
  is higher and you want less visual aggression.
- `reels`: vibrant lifestyle treatment. Use when the visuals are softer
  or more aesthetic and the captions should feel less industrial.
- `hormozi`: large centered impact phrases. Use for hard-sell hooks,
  numbers, and challenge/claim statements.
- `karaoke`: word-by-word highlighting. Use when lyric feel, exact sync,
  or spoken cadence is the point.
- `minimal`: restrained business style. Use when the speaker and
  composition should dominate.
- `bold` or `neon`: use sparingly for hooks, gaming, or entertainment
  where impact matters more than density.
- Cross-archetype caption modes:
  `page-pop` for talking-head or commentary phrases,
  `karaoke-chip` for viral/high-energy active-word emphasis,
  `phrase-highlight` for explainers and story lanes that need steadier
  multi-word chunks.

Read [style-recipes.md](references/style-recipes.md) before changing the
caption treatment. That file is the fast map from content type to
layout, emphasis, and motion choices.

## Visual Rules

- Platform export baseline for TikTok, Instagram Reels, and YouTube
  Shorts is portrait `9:16`, normally `1080x1920`. Do not switch to a
  square or landscape canvas to solve caption overflow.
- Treat the practical caption-safe box on `1080x1920` as roughly
  `x=96..984` and `y=220..1540`. Anything important outside that box
  can be hidden by app chrome or edge cropping.
- Hooks want short chunks, heavier emphasis, and faster turnover.
- Educational content wants steadier paging, lower CPS, and fewer
  effects.
- Numbers, negations, and payoff words deserve emphasis. Most other
  words do not.
- Two clean lines beat one overstuffed line.
- Center captions only when the frame is simple or the style explicitly
  demands impact.
- Bottom captions are default, but they still need enough edge distance
  to survive platform chrome.
- ASS sidecar captions must wrap to at most two lines unless the video
  is an explicitly slower educational layout. Prefer `18` to `26`
  characters per line for big center captions and `24` to `30` for
  smaller bottom captions.
- Safe-zone defaults:
  hook cards in roughly the top `15%` to `20%`,
  subtitles in roughly the bottom `18%` to `25%`,
  midpoint seam captions only when the split layout truly needs them.
- In top/bottom split-screen layouts, midpoint overlay captions are
  valid. A dedicated black seam is optional, not required.
- If midpoint overlay captions sit on moving footage, increase stroke,
  shadow, and highlight contrast before resorting to a separate caption
  band.
- Use background-pill highlighting when the active word must snap
  instantly. Use color-only highlighting when the frame is already busy.
- Uppercase increases punch but also visual load. Use it where energy
  matters, not by default everywhere.

## Technical Rules In This Repo

- Caption behavior lives in `src/render/captions/`.
- `config.ts` is the full styling and pacing contract.
- `presets.ts` is the tested preset registry.
- `paging.ts` is where cleanup and grouped reading rhythm come from.
- `Caption.tsx` is the actual visual implementation in Remotion.
- `render/service.ts` resolves preset plus overrides and passes the
  effective config into render.
- If the lane uses a local-only or fallback assembly path, export
  `captions.remotion.json`, `captions.srt`, and `captions.ass` from the
  final narration timings before review. Do not treat ad-hoc subtitle
  burns as equivalent to the repo caption contract.
- When exporting ASS, pass `captionAssStyle.maxCharsPerLine` and
  `captionAssStyle.maxLines` for any absolute-position caption overlay.
  Absolute `positionX`/`positionY` is allowed for split-screen midpoint
  captions, but it must stay inside the `1080x1920` safe box.
- Runtime surface for sidecar export:
  `node --import tsx scripts/harness/caption-export.ts`

Read [technical-map.md](references/technical-map.md) before changing the
implementation. It maps the repo files to the design choices and notes
what this repo already borrowed from other short-form caption systems.

## Implementation Workflow

1. Pick the caption role: native-social, educational, impact, karaoke,
   or restrained.
2. Pick the closest existing preset. Do not start from scratch unless
   the preset family is genuinely wrong.
3. Tune layout first:
   `maxCharsPerLine`, `maxLinesPerPage`, `maxWordsPerPage`,
   `maxCharsPerSecond`, `minOnScreenMs`.
4. Tune emphasis second:
   highlight mode, emphasis rules, word animation, stroke, shadow.
5. Tune placement third:
   position, edge distance, safe zones, badge spacing.
6. Only then tune polish:
   page animation, timing offset, font choice, special notation.
7. Validate against actual rendered video, not just JSON or screenshots.

## Failure Cases To Catch

- Source footage already has burned-in text.
- Chunks flash too quickly to read.
- Captions cover faces, UI, or gameplay affordances.
- Captions spill beyond the `1080x1920` frame or sit under TikTok/Reels
  interface chrome.
- Every word is emphasized, which means nothing is emphasized.
- Stroke and shadow are fighting each other and making edges muddy.
- The style matches neither the content nor the platform.
- The captions are technically in sync but feel late because the visual
  emphasis lands after the spoken punch.
- The export style reveals only fragments of the line, which makes OCR
  validation and visual sync checks much less trustworthy.

## Validation Checklist

- The chosen preset matches the content type.
- Average chunks can be read once without replay.
- Active-word emphasis lands on the important word, not a filler word.
- The frame remains readable on a phone-sized viewport.
- Safe-zone placement survives TikTok/Reels/Shorts overlays.
- The rendered result looks intentional without relying on already-made
  demo footage.
