# Text Message Drama

Status: `showcase candidate`

This is the current message-led story showcase candidate. It uses
staged chat cards as the main visual grammar, with gameplay underneath
as motion support.

Tracked preview clip:

- [demo-11-text-thread-reveal.mp4](../../demo/demo-11-text-thread-reveal.mp4)

<p align="center">
  <video src="../../demo/demo-11-text-thread-reveal.mp4" controls muted playsinline loop width="280"></video>
</p>

Use this lane when the strongest visual grammar is the chat itself.

Core shape:

- cold-open on the most suspicious or explosive message
- reveal the exchange in staged beats rather than one giant screenshot
- use narration as glue and interpretation
- optionally run gameplay or support footage below the message lane
- keep captions out of the message UI's way
- use visible state changes or transition pulses every `2s` to `3s`
  so the edit does not feel like a static screenshot slideshow

Primary skill:

- [text-message-drama-short](../../../skills/text-message-drama-short/SKILL.md)

Related skills:

- [hook-overlay](../../../skills/hook-overlay/SKILL.md)
- [short-form-captions](../../../skills/short-form-captions/SKILL.md)
- [video-render](../../../skills/video-render/SKILL.md)

Current proving surface:

- local full-quality MP4:
  `experiments/proving-wave-3/text-thread-reveal/outputs/final/video.mp4`
- embedded demo MP4:
  `docs/demo/demo-11-text-thread-reveal.mp4`

Review status:

- direct cadence detection passes at `2.33s` median cut interval
- script score passes
- full publish-prep is unstable on this local run after the validation
  process starts, so treat this as a visual showcase candidate rather
  than a fully green canonical render
