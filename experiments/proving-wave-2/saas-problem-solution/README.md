# SaaS Problem Solution v2

This lane builds a stronger fictional SaaS promo than the proving-wave-1
attempt by using:

- a denser 9-scene script with faster cuts
- lane-local product-style SVG proof cards
- real local motion clips behind each proof beat
- repo-owned audio, caption export, render, and publish-prep review

## Scope

- Lane owner: `experiments/proving-wave-2/saas-problem-solution`
- Allowed writes: this folder only
- Shared runtime edits: avoid unless absolutely required
- Canonical output: `output/run-001/final/video.mp4`

## Files

- `inputs/manual-script.json` - final script used for this lane
- `script-to-audio.request.json` - repo-owned audio request
- `video-render.request.json` - repo-owned render request
- `publish-prep.request.json` - repo-owned review request
- `scripts/build-scene-assets.sh` - lane-local scene video builder
- `assets/cards/*.svg` - SaaS proof-card overlays
- `assets/scene-manifest.json` - background motion assignment
- `report.md` - honest run log and blockers

## Canonical Output Layout

- `output/run-001/audio/`
- `output/run-001/scenes/`
- `output/run-001/visuals/`
- `output/run-001/final/`

