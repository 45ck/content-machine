# Technical Map

## Core Files

- `src/render/captions/config.ts`
  Full caption contract: layout, highlight mode, emphasis rules, safe
  zones, animation, cleanup, badges.
- `src/render/captions/presets.ts`
  Tested starting points for TikTok, Shorts, Reels, CapCut, Hormozi,
  karaoke, and minimal styles.
- `src/render/captions/paging.ts`
  Word cleanup plus page grouping. This is where filler dropping,
  list-marker dropping, and readable chunking start.
- `src/render/captions/Caption.tsx`
  Remotion component that turns timed words plus config into on-screen
  motion.
- `src/render/service.ts`
  Final caption config resolution. Preset first, then overrides, then
  render.

## Current Repo Defaults Worth Respecting

- `capcut` is the default family because it fits most short-form content
  best.
- Timing offset is already slightly negative in stronger presets to
  counter perceived late emphasis.
- Cleanup is available for filler words and list markers. Use it on
  spoken content that was written for voice, not for subtitles.
- Safe zones are already part of the config system. Use them instead of
  manually nudging captions per render.

## Technical Change Order

1. Change preset data in `presets.ts` if the fix is about feel.
2. Change `config.ts` if the contract is missing a real concept.
3. Change `paging.ts` if the reading rhythm or cleanup logic is wrong.
4. Change `Caption.tsx` if the visual behavior or animation is wrong.
5. Change `render/service.ts` only when the merge or default-selection
   path is wrong.

## What To Avoid

- Do not bolt caption logic into experiment scripts.
- Do not patch around dirty timestamps with louder styling.
- Do not treat SRT-style transcript dumping as a final short-form
  system.
- Do not add a new preset when an existing preset plus overrides already
  covers the need.

## Repo-Versus-External Reference

- This repo already goes further than simple subtitle overlays by
  combining pacing, emphasis, safe zones, and animation in one caption
  system.
- The imported caption repos are useful references, but the main work
  here should happen inside `src/render/captions/*` and the skill docs
  that teach agents how to use it.
