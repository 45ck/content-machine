---
name: asset-fingerprint-cache
description: Track generated media assets with stable file fingerprints so caches, previews, and downstream consumers can tell when storyboards, videos, thumbnails, or design assets actually changed.
---

# Asset Fingerprint Cache

## Use When

- Generated media files are reused across preview, render, or review
  flows.
- You need a lightweight way to detect whether assets changed.
- Cache busting or downstream invalidation depends on file updates.

## Core Rule

- Cache identity should come from the asset file state, not guesswork.

## Inputs

- project path
- asset directories to scan:
  storyboards, videos, thumbnails, characters, scenes, props
- optional root-level media files

## Outputs

- mapping of relative asset paths to fingerprints
- change detection signal for cache busting or selective reruns

## Workflow

1. Scan the known media directories.
2. Collect a stable lightweight fingerprint per file:
   mtime-based is acceptable when content hashing is unnecessary.
3. Exclude version-history directories from the live fingerprint map.
4. Expose the fingerprint map to preview, cache, or invalidation logic.
5. Recompute cheaply after writes rather than doing expensive deep
   hashes by default.

## Good Uses

- bust preview URLs when a storyboard changes
- detect that a generated clip or thumbnail was updated
- know whether downstream compose or publish surfaces should refresh

## Bad Uses

- treating temp files as permanent cache keys
- scanning archived version directories as if they were live assets
- using heavyweight hashing where mtime-level invalidation is enough

## Pair With

- Use with [`generated-asset-versioning`](../generated-asset-versioning/SKILL.md)
  for tracked asset history.
- Use with [`partial-regeneration`](../partial-regeneration/SKILL.md)
  to decide what truly changed in a rerun.

## Aggregated From

- `ArcReel/ArcReel` `asset_fingerprints.py`
- generated-media project cache-busting patterns

## Validation Checklist

- Fingerprints cover the live media directories.
- Version-history folders are excluded from the live cache map.
- Changed assets get new fingerprints promptly.
- Fingerprints are cheap enough to recompute frequently.
