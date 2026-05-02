---
name: media-index
description: Maintain a local JSON index of reusable source media, transcripts, tags, and probe metadata.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"indexPath":"output/content-machine/library/media-index.v1.json","items":[{"path":"input/source.mp4","analysisPath":"output/content-machine/highlights/source-media-analysis.v1.json","tags":["podcast"]}]}'
entrypoint: node --import tsx scripts/harness/media-index.ts
inputs:
  - name: indexPath
    description: Path that will receive media-index.v1.json.
    required: false
  - name: items
    description: Media items to add or replace by path.
    required: true
outputs:
  - name: media-index.v1.json
    description: Local reusable media index.
---

# Media Index

Use this after source media analysis when local assets should be reused
or searched later. The index is JSON, local-only, and keyed by resolved
file path.

## Creative Source Provenance

Index evidence after scout/review; do not use `media-index` to decide
rights. The strict harness schema stores provenance under each item's
`metadata`, not as arbitrary top-level fields.

When indexing external or generated media, store enough evidence for
reuse and publish review:

- `sourceUrl`, `provider`, `author`, `title`
- `licenseName`, `licenseUrl`, `attributionText`
- `retrievedAt`, `fileHash`, `localPath`
- `usageMode`: `inspiration-only`, `code-native-rebuild`,
  `downloaded-asset`, `generated-asset`, or `reference-provider`
- `rightsFlags`: watermark, editorial-only, model-release risk,
  trademark risk, Content ID risk, attribution required
- `evidenceFiles`: license screenshot, API response, source metadata, or
  downloaded license file
- audio-specific fields when relevant: `platformSource`,
  `originalVideoUrl`, `extractRange`, `licenseCertificatePath`,
  `permissionEvidencePath`, `contentIdRisk`, `attributionPlacement`, and
  `mixRole`
- `reviewStatus`: `approved`, `needs-review`, `reference-only`, or
  `rejected`

`publish-prep` can review a media index directly through
`mediaIndexPath`. `generate-short` also writes
`provenance/asset-ledger.json`; use media-index provenance for reusable
library assets and the asset ledger for the specific render run.

For AI-generated media, also store provider, model, prompt,
negative prompt, reference assets, job id, status URL, settings, seed if
available, cost, and output hash.

```bash
cat skills/media-index/examples/request.json | \
  node --import tsx scripts/harness/media-index.ts
```
