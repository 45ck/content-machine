# Reddit Post Over Gameplay Proving Run

Lane: `reddit-post-over-gameplay`

Status: `golden showcase`

This run proves the default Reddit story mode:

- full-screen gameplay only
- Reddit post opener card over gameplay
- no stock clips, no top lane, no generated B-roll
- active-word captions over gameplay
- audible narration

## Artifacts

- Final MP4:
  `outputs/final/video.mp4`
- Embedded repo preview:
  [`docs/demo/demo-9-reddit-post-over-gameplay.mp4`](../../../docs/demo/demo-9-reddit-post-over-gameplay.mp4)
- Contact sheet:
  `outputs/final/contact-sheet.jpg`
- Review bundle:
  `outputs/final/publish-prep/`

## Review

`publish-prep` results for the final MP4:

- passed: `resolution`, `duration`, `format`, `cadence`,
  `audio-signal`
- failed: `caption-sync`

Caption-sync failure details from the current OCR gate:

- matched `26/31` expected caption segments
- median drift: `386ms`
- P95 drift: `1291ms`

Manual visual review of the contact sheet confirms the archetype routing
is correct: no random clips, no top lane, no black gutters, and no
static fallback background. The remaining gap is active-word caption
evaluation/render polish.

## Build Shape

The build uses one gameplay source, jump-cut into short segments for
cadence, with the Reddit card overlaid for the first `5.15s`.

Audio is normalized with `volume=0.93`, producing:

- mean volume: `-23.6 dB`
- max volume: `-1.4 dB`

The lane-local build script is kept with the local proving folder. It
depends on ignored local media assets, so the durable repo artifact is
the embedded demo MP4 under `docs/demo/`.

Run from repo root when the local proving assets are present:

```bash
bash experiments/proving-wave-3/reddit-post-over-gameplay/tools/build.sh
```
