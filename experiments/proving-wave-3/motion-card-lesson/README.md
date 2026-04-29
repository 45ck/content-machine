# Motion Card Lesson

This experiment is the graphics-first non-Reddit archetype proof. It
uses a deterministic SVG frame renderer, narration audio, and ASS
captions to make an educational short feel like a designed lesson system
instead of a static card stack.

Current render:

- `outputs/motion-card-v2/video.mp4`
- `outputs/motion-card-v2/motion-brief.v1.json`
- `outputs/motion-card-v2/layout-annotations.v1.json`
- `outputs/motion-card-v2-layout-review/layout-safety.report.json`
- `outputs/motion-card-v2-review/summary.json`

Regenerate:

```bash
node experiments/proving-wave-3/motion-card-lesson/tools/build-motion-card-v2.mjs
```

Promoted demo:

- `docs/demo/demo-14-motion-card-lesson.mp4`
- `docs/demo/demo-14-motion-card-lesson.gif`
- `docs/demo/demo-14-motion-card-lesson.layout.json`

Quality bar:

- 1080x1920 portrait, 30 fps, H.264 `yuv420p`
- narration audio present
- no blank first frame
- phone-readable primary card text
- captions stay inside the lower safe band
- `video-evaluator/layout-safety-review` reports no declared graphic
  overlaps and no caption safe-zone collisions
- visual state changes every beat, not just hard scene resets
