# Motion Card Lesson

Status: `showcase candidate`

Tracked demo:

<p align="center">
  <a href="../../demo/demo-14-motion-card-lesson.mp4">
    <img src="../../demo/demo-14-motion-card-lesson.gif" alt="Motion card lesson showcase candidate" width="260" />
  </a>
</p>

Use this lane for educational shorts that should feel like designed card
systems rather than stock-footage explainers.

Core shape:

- hook card first
- short sequence of prompt / clue / answer / recap beats
- motion only where it improves progression
- deterministic timing locked to real narration
- readable cards that carry the lesson even on mute
- captions that reinforce the card state instead of replacing it

Current proving result:

- Final local MP4:
  `experiments/proving-wave-3/motion-card-lesson/outputs/final/video.mp4`
- Tracked preview MP4:
  [`docs/demo/demo-14-motion-card-lesson.mp4`](../../demo/demo-14-motion-card-lesson.mp4)
- Publish-prep passed with portrait format, `30.8s` duration, cadence,
  and audio-signal checks.
- OCR caption-sync was not run for this FFmpeg fallback render because
  there is no `captions.remotion.json` sidecar yet.

Primary skill:

- [motion-card-lesson-short](../../../skills/motion-card-lesson-short/SKILL.md)

Related skills:

- [motion-design-coder](../../../skills/motion-design-coder/SKILL.md)
- [animation-explainer-short](../../../skills/animation-explainer-short/SKILL.md)
- [short-form-captions](../../../skills/short-form-captions/SKILL.md)
- [video-render](../../../skills/video-render/SKILL.md)

Use `motion-design-coder` for the card animation plan: frame-driven
entrances, readable hold states, deterministic card resets, caption-safe
motion, and phone-size review frames.
