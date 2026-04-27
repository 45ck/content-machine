# SaaS Problem Solution

This lane proves whether the current `content-machine` runtime can
produce a reviewable SaaS-style promo MP4 from a bounded request, with
all authored files and requested outputs rooted inside this folder.

## Scope

- Lane owner: `experiments/proving-wave-1/saas-problem-solution`
- Allowed writes: this folder only
- Preferred path: repo-local skills and harness scripts
- Product stance: use a fictional SaaS when no real product assets are
  provided

## Files

- `prompt.md` - human-readable experiment brief
- `doctor-request.json` - runtime diagnostics request
- `generate-short.request.json` - primary end-to-end request
- `inputs/manual-script.json` - manual fallback script for a local
  runtime-only attempt
- `local-media.manifest.json` - deterministic scene-to-local-media map
- `script-to-audio.request.json` - fallback audio-stage request
- `timestamps-to-visuals.request.json` - fallback visuals-stage request
- `video-render.request.json` - fallback render-stage request
- `report.md` - honest run log, outputs, and blockers

## Rerun

```bash
cat experiments/proving-wave-1/saas-problem-solution/doctor-request.json | \
  node --import tsx scripts/harness/doctor-report.ts

cat experiments/proving-wave-1/saas-problem-solution/generate-short.request.json | \
  node --import tsx scripts/harness/generate-short.ts

cat experiments/proving-wave-1/saas-problem-solution/script-to-audio.request.json | \
  node --import tsx scripts/harness/script-to-audio.ts

cat experiments/proving-wave-1/saas-problem-solution/timestamps-to-visuals.request.json | \
  node --import tsx scripts/harness/timestamps-to-visuals.ts

cat experiments/proving-wave-1/saas-problem-solution/video-render.request.json | \
  node --import tsx scripts/harness/video-render.ts
```
