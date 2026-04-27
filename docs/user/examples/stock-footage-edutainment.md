# Stock Footage Edutainment

Status: `showcase candidate`

This is the current faceless-information showcase candidate. It uses
local stock-style motion clips, direct narration, large burned captions,
and fast transition pulses to keep the edit from feeling like wallpaper.

Tracked preview clip:

- [demo-10-stock-broll-explainer.mp4](../../demo/demo-10-stock-broll-explainer.mp4)

<p align="center">
  <video src="../../demo/demo-10-stock-broll-explainer.mp4" controls muted playsinline loop width="280"></video>
</p>

Use this lane for classic faceless TikTok or Shorts explainers driven by
voiceover, support stock clips, captions, and music.

Core shape:

- hard hook first
- `hook -> context -> mechanism -> twist -> payoff`
- one visual intent per spoken beat
- stock clips are chosen per scene, not from one global keyword pile
- transition pulses or hard cuts every few seconds so cadence is
  measurable and native-feeling
- captions are large enough to read on a phone without pausing

Primary skill:

- [stock-footage-edutainment-short](../../../skills/stock-footage-edutainment-short/SKILL.md)

Related skills:

- [niche-profile-draft](../../../skills/niche-profile-draft/SKILL.md)
- [short-form-captions](../../../skills/short-form-captions/SKILL.md)
- [video-render](../../../skills/video-render/SKILL.md)

Current proving surface:

- local full-quality MP4:
  `experiments/proving-wave-3/stock-b-roll-explainer/outputs/final/video.mp4`
- embedded demo MP4:
  `docs/demo/demo-10-stock-broll-explainer.mp4`

Review status:

- non-OCR publish-prep passed:
  resolution, duration, format, cadence, and audio signal
- cadence improved from `3.20s` median cut interval in wave 2 to `0.47s`
  after transition pulses
- OCR caption-sync still needs a stable final pass for this exact
  flashed render; the wave-2 base render passed caption-sync before the
  cadence overlay
