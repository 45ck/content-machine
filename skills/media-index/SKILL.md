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

```bash
cat skills/media-index/examples/request.json | \
  node --import tsx scripts/harness/media-index.ts
```
