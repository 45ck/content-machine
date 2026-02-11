# Pipeline Presets

> DO NOT EDIT: generated from `registry/repo-facts.yaml`.

These preset ids are intended to stay stable (even if implementation evolves).

## Sync Presets

- `fast`: Fastest, lowest quality.
  - pipeline: `standard`
  - reconcile: `false`
  - syncQualityCheck: `false`
  - minSyncRating: `0`
  - autoRetrySync: `false`
- `standard`: Balanced default.
  - pipeline: `audio-first`
  - reconcile: `true`
  - syncQualityCheck: `false`
  - minSyncRating: `60`
  - autoRetrySync: `false`
- `quality`: Higher quality, slower.
  - pipeline: `audio-first`
  - reconcile: `true`
  - syncQualityCheck: `true`
  - minSyncRating: `75`
  - autoRetrySync: `false`
- `maximum`: Slowest, highest quality.
  - pipeline: `audio-first`
  - reconcile: `true`
  - syncQualityCheck: `true`
  - minSyncRating: `85`
  - autoRetrySync: `true`
