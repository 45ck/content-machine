# Stock B-Roll Explainer

This lane proves whether the current `content-machine` runtime can
produce a reviewable explainer MP4 with all artifacts rooted inside this
folder and without relying on external providers.

## Scope

- Lane owner: `experiments/proving-wave-1/stock-b-roll-explainer`
- Allowed writes: this folder only
- Preferred path: repo-local harness scripts and skills

## Canonical Path

The canonical path for this lane is now local-only:

1. Generate procedural scene clips with `make-procedural-assets.sh`
2. Use the hand-authored `local-script.json`
3. Generate local narration with `make-local-audio-and-timestamps.mjs`
4. Run `timestamps-to-visuals`
5. Prefer `render-local.sh` for the final playable MP4 when shared
   Remotion capacity is busy
4. Record the exact result in `report.md`

`generate-short.request.json` remains as the original end-to-end
provider-backed attempt, but it is not the preferred path for this
experiment.

## Files

- `prompt.md` - human-readable experiment brief
- `doctor-request.json` - runtime diagnostics request
- `generate-short.request.json` - end-to-end generation request
- `make-procedural-assets.sh` - creates local scene clips under `assets/`
- `make-local-audio-and-timestamps.mjs` - local speech plus timestamps
- `local-script.json` - hand-authored script input for the local-only run
- `local-manifest.json` - deterministic scene-to-asset mapping
- `script-to-audio.request.json` - local audio stage request
- `timestamps-to-visuals.request.json` - local visuals stage request
- `video-render.request.json` - local render stage request
- `render-local.sh` - direct `ffmpeg` render fallback inside the lane
- `report.md` - honest run log, outputs, and blockers

## Rerun

```bash
cat experiments/proving-wave-1/stock-b-roll-explainer/doctor-request.json | \
  node --import tsx scripts/harness/doctor-report.ts

bash experiments/proving-wave-1/stock-b-roll-explainer/make-procedural-assets.sh

node experiments/proving-wave-1/stock-b-roll-explainer/make-local-audio-and-timestamps.mjs

cat experiments/proving-wave-1/stock-b-roll-explainer/timestamps-to-visuals.request.json | \
  node --import tsx scripts/harness/timestamps-to-visuals.ts

bash experiments/proving-wave-1/stock-b-roll-explainer/render-local.sh
```
