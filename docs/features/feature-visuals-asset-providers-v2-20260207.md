# Feature: Visuals Providers V2 (AssetProvider + Images With Motion)

**Date:** 2026-02-07  
**Status:** Draft  
**Owners:** content-machine core

---

## Overview

The visuals schema already supports both video and image sources plus motion strategies, and the
repo includes an `AssetProvider` interface. However, `cm visuals` currently uses the legacy
video-only provider path.

This feature migrates `cm visuals` to the unified `AssetProvider` interface and makes static
images (stock or generated) a first-class input with deterministic motion.

## User Value

- More visual styles and fewer stock-footage limitations.
- Better match quality (images can be more semantically aligned than generic B-roll).
- New use cases (infographics, product screenshots, UI shots) without sourcing video footage.

## Goals

- `cm visuals --provider <assetProvider>` supports both video and image providers.
- Render compositions can display image scenes with motion strategies (at least Ken Burns).
- Motion behavior is deterministic and testable.

## Non-goals

- Shipping paid third-party APIs as default dependencies.
- Building a full motion-graphics engine inside `cm visuals` (keep motion small and composable).

## UX / CLI

### Commands

- Extend `cm visuals`:
  - `--provider pexels|nanobanana|mock`
  - `--motion none|kenburns` (applies when provider returns images)

## Data Contracts

- `visuals.json` uses `VisualAsset`:
  - `assetType: video|image`
  - `motionStrategy: none|kenburns|depthflow|veo`

## Architecture

### Step 1: Provider unification

- Replace `createVideoProvider` usage in visuals matcher with `createAssetProvider`.
- Refactor matcher to produce `VisualAssetInput` with:
  - `assetType` derived from provider results
  - `source` set consistently (`stock-pexels`, `generated-*`, `user-footage`)

### Step 2: Render support for images

- Extend `SceneBackground` (Remotion layer) to render images when `assetType === "image"`.
- Implement `kenburns` in Remotion (scale + pan) with deterministic seed per `sceneId`.

### Step 3: Provider implementations

- Keep `pexels` for video.
- Keep `mock` for deterministic tests.
- Implement at least one real image provider (or ship as stub behind `--experimental`).

### Failure modes / recovery

- If an image provider is selected but missing API key, fail fast with a Fix line.
- If motion strategy is unsupported, fail with a clear fix line.

## Testing

### Unit

- AssetProvider selection and availability gating.
- VisualAsset schema generation for image scenes.
- Ken Burns motion math (determinism and bounds).

### Integration

- `cm visuals --provider mock` can emit image assets and `cm render` produces an MP4.

### V&V

- Render a golden clip demonstrating image motion and verify it is stable across runs.

## Rollout

- Start with Ken Burns in Remotion (no external tools).
- Gate advanced motion strategies behind explicit flags.

## Related

- Visuals schema: `src/visuals/schema.ts`
- Providers interface: `src/visuals/providers/types.ts`
- Existing visuals matcher: `src/visuals/matcher.ts`
- ADR: `docs/architecture/ADR-002-VISUAL-PROVIDER-SYSTEM-20260107.md`
