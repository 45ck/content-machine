# Graphics Archetype Remake Plan

Use this as the working queue for non-Reddit archetypes that should be
rebuilt with the `motion-design-coder` standard: frame-driven graphics,
caption-safe holds, phone-readable text, and real audit artifacts.

| Priority | Lane                    | Current demo | Why remake                                                                 | Target standard                                                                 |
| -------- | ----------------------- | ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1        | `motion-card-lesson`    | `demo-14`    | Old version felt like static cards with hard resets.                       | Completed v2: deterministic SVG motion, motion brief, audit pass, promoted GIF. |
| 2        | `fast-facts-countdown`  | `demo-13`    | Graphics are useful, but current captions include token splits and errors. | Repair captions, add number pops, fact-specific diagrams, and countdown pulses. |
| 3        | `micro-doc-breakdown`   | `demo-17`    | Evidence cards are functional but too dark and deck-like.                  | Editorial evidence boards, timeline draw-ons, receipt zooms, clearer proof.     |
| 4        | `saas-problem-solution` | `demo-12`    | Product cards read as a brochure deck instead of native creator proof.     | Cursor motion, before/after UI states, proof zooms, stronger CTA motion.        |
| 5        | `text-thread-reveal`    | `demo-11`    | Bubble lane works but can use stronger reveal grammar.                     | Message typing rhythm, receipt zooms, pinned clue cards, safer caption rhythm.  |

## Remake Requirements

- Keep demos 1080x1920, 30 fps, H.264 `yuv420p`, with audio present.
- Build from a motion brief: each beat lists hold frames, moving
  elements, safe zones, and reject conditions.
- For graphics-heavy lanes, emit a `*.layout.json` sidecar and run
  `45ck/video-evaluator` `layout-safety-review` before promotion.
- Use frame-derived motion only; do not depend on CSS animation clocks or
  random runtime state.
- Hold primary text long enough to read on a phone before captions
  compete for attention.
- Run `npm run review:demo-videos` after promotion and inspect the
  contact sheet, not only the JSON pass/fail.

## Current Completed Remake

`motion-card-lesson` now has:

- `experiments/proving-wave-3/motion-card-lesson/tools/build-motion-card-v2.mjs`
- `experiments/proving-wave-3/motion-card-lesson/outputs/motion-card-v2/video.mp4`
- `experiments/proving-wave-3/motion-card-lesson/outputs/motion-card-v2/motion-brief.v1.json`
- `docs/demo/demo-14-motion-card-lesson.layout.json`
- `docs/demo/demo-14-motion-card-lesson.mp4`
- `docs/demo/demo-14-motion-card-lesson.gif`
