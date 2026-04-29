# Stock B-Roll Explainer v2

This lane owns a stronger local-only stock-footage edutainment pass for
wave 2.

## Goal

Produce one real vertical explainer MP4 with:

- real local motion footage
- faster visual cadence than wave 1
- exported caption sidecars
- a real `publish-prep` review bundle on the final shipped MP4

## Canonical Path

1. `script-to-audio` with the lane script
2. `build-visuals.mjs` to map exact scene timings to local motion clips
3. `video-render` if it finishes cleanly
4. otherwise `caption-export` + `render-local.mjs`
5. `publish-prep`

## Key Files

- `inputs/script.json`
- `inputs/clip-plan.json`
- `requests/script-to-audio.json`
- `requests/video-render.request.json`
- `requests/caption-export.request.json`
- `requests/publish-prep.request.json`
- `tools/build-visuals.mjs`
- `tools/make-local-audio-and-timestamps.mjs`
- `tools/resolve-video-render-request.mjs`
- `tools/render-local.mjs`
- `report.md`
