# Subway Confession Story

Status: `showcase candidate`

Tracked demo:

<p align="center">
  <a href="../../demo/demo-16-gameplay-confession-split.mp4">
    <img src="../../demo/demo-16-gameplay-confession-split.gif" alt="Gameplay confession split showcase candidate" width="260" />
  </a>
</p>

Pattern name: `gameplay-confession-split`.

Default variant: `subject-safe-split`.

Use `crop-fill-split` when the subject survives the crop. Use
`contained-blur-split` when the source gets too soft or loses the
subject after crop-fill.

This is the bread-and-butter non-Reddit story lane.

Use it when the story is confession-led or drama-led, but does not need
to present itself as a Reddit post.

Core shape:

- visible stakes in the first line
- top lane carries moving support footage or receipts with crop/fill
  chosen per asset
- bottom lane carries Subway Surfers or similar gameplay with no black
  gutters
- captions sit between the lanes with active-word emphasis
- no black gutters in either lane unless the creative format explicitly
  requires them

Current proving result:

- Full local MP4:
  `experiments/proving-wave-2/gameplay-confession-split/output/final/video.mp4`
- Tracked preview MP4:
  [`docs/demo/demo-16-gameplay-confession-split.mp4`](../../demo/demo-16-gameplay-confession-split.mp4)
- The tracked preview passed non-OCR publish-prep with portrait format,
  `41.3s` duration, cadence, and audio-signal checks.
- Full OCR caption-sync on the original wave-2 render still fails on
  median drift and OCR confidence, so this is a showcase candidate, not
  a golden caption-sync example.

Primary skill:

- [gameplay-confession-short](../../../skills/gameplay-confession-short/SKILL.md)

Related skills:

- [short-form-captions](../../../skills/short-form-captions/SKILL.md)
- [hook-overlay](../../../skills/hook-overlay/SKILL.md)
- [motion-design-coder](../../../skills/motion-design-coder/SKILL.md)
- [video-render](../../../skills/video-render/SKILL.md)

Use `motion-design-coder` for top-lane receipt/card motion, seam-safe
caption timing, support-footage transitions, and any SVG/HTML overlays.
Gameplay should remain the stable motion bed rather than competing with
overanimated cards.

Best current proving surface:

- [experiments/proving-wave-2/gameplay-confession-split/README.md](../../../experiments/proving-wave-2/gameplay-confession-split/README.md)
