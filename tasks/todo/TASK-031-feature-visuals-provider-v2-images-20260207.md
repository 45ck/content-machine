# TASK-031-feature: Visuals Provider V2 (AssetProvider + Images)

**Type:** Feature  
**Priority:** P2  
**Estimate:** L  
**Created:** 2026-02-07  
**Owner:** Unassigned  
**Status:** Todo

---

## Feature Description

**Goal:** Upgrade visuals matching to support image providers and deterministic motion strategies.

## Acceptance Criteria

- [ ] Given `cm visuals --provider <assetProvider>`, when provider yields images, then `visuals.json` includes `assetType: image`.
- [ ] Given an image scene with `motionStrategy: kenburns`, when rendering, then the output video has visible motion.
- [ ] Given `--mock`, when running the end-to-end pipeline, then image-based visuals can render without external keys.

## Required Documentation

- [x] `docs/features/feature-visuals-asset-providers-v2-20260207.md`

## Testing Plan (TDD)

- [ ] Unit: provider selection and VisualAsset mapping
- [ ] Unit: Ken Burns determinism tests
- [ ] Integration: `cm visuals --mock` + `cm render` produces MP4

## Related

- `docs/features/feature-platform-expansion-roadmap-20260207.md`

---

**Last Updated:** 2026-02-07
