# Caption Sync Rerun Reddit Story v1

Fresh isolated rerun of the Reddit-story lane after adding an automatic
rendered-caption-sync gate to `publish-prep`.

Inputs:

- condensed Reddit-story script
- `58.07s` audio/timestamps pass
- `15` fast-cut image scenes
- native `video-render` caption stack using `karaoke` preset and
  `buildup` display mode

Goal:

- render a real MP4 in a clean experiment folder
- verify caption sync automatically against
  `render/captions.remotion.json`
- only keep the result if the final review gate passes

Final kept artifact:

- `final/video.mp4`
- `final/validate.json`
- `final/caption-sync.json`
- `final/score.json`

What changed across reruns:

- `render/` used a stylized karaoke-style treatment and failed both
  cadence and caption-sync review.
- `render-v2/` fixed cadence with denser cuts and switched to stable
  caption pages, but the first caption-sync matcher still overfit noisy
  OCR fragments.
- `render-v3/` kept the faster cut pattern, used a cleaner minimal
  caption preset, and passed after the caption-sync matcher was updated
  to use time-windowed token evidence instead of naive one-frame string
  matching.
