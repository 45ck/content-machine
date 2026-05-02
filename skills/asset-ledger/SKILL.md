---
name: asset-ledger
description: Build or update a machine-readable asset ledger for generated, local, stock, audio, gameplay, and manually assembled demo assets so publish-prep can review provenance.
allowedTools:
  - shell
  - read
  - write
entrypoint: node --import tsx scripts/harness/asset-ledger.ts
inputs:
  - name: outputPath
    description: Path that will receive asset-ledger.json.
    required: false
  - name: existingLedgerPath
    description: Optional existing asset ledger to append or upsert into.
    required: false
  - name: assets
    description: Explicit asset entries for external media, gameplay, stock, music, or generated assets.
    required: false
  - name: artifacts
    description: Optional generated artifact paths such as scriptPath, audioPath, visualsPath, renderPath, caption sidecars, and qualitySummaryPath.
    required: false
outputs:
  - name: asset-ledger.json
    description: Machine-readable provenance ledger accepted by publish-prep assetLedgerPath.
---

# Asset Ledger

Use this when a run or demo needs provenance evidence but was not
created entirely through `generate-short`, or when an old candidate demo
needs a reviewed machine-readable ledger before promotion.

```bash
cat skills/asset-ledger/examples/request.json | \
  node --import tsx scripts/harness/asset-ledger.ts
```

## What This Skill Owns

- Creating or updating `asset-ledger.json`.
- Adding generated-artifact entries for known stage outputs.
- Preserving explicit entries for stock, local footage, gameplay,
  external audio, generated images, model outputs, fonts, icons, and
  other reusable media.
- Adding local file hashes when files exist.
- Producing warnings that explain what publish-prep is likely to reject.

## Use With Publish Prep

Pass the written ledger into publish-prep:

```json
{
  "videoPath": "runs/demo/render/video.mp4",
  "scriptPath": "runs/demo/script/script.json",
  "assetLedgerPath": "runs/demo/provenance/asset-ledger.json",
  "outputDir": "runs/demo/publish-prep"
}
```

Generated local artifacts can usually use `generated-local` or
`repo-generated`. Downloaded stock, YouTube-origin media, gameplay,
music, SFX, fonts, icons, and public-source clips need explicit source,
license, permission, attribution, and Content ID evidence before
promotion.
