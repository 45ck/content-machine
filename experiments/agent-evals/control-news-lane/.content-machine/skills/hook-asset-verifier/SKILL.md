---
name: hook-asset-verifier
description: Verify the generated hook card or hook overlay asset directly before timeline assembly so broken sizing, unreadable typography, or failed asset generation is caught upstream instead of inside the finished video.
---

# Hook Asset Verifier

## Use When

- The short opens with a dedicated hook image or hook overlay asset.
- Hook generation is separate from the main render.
- The pipeline should fail early if the hook asset is missing or
  obviously broken.

## Core Rule

- Verify the hook asset itself, not just the final video.
- A broken first-beat asset should stop the run before assembly.

## Inputs

- generated hook asset path
- expected dimensions or target width
- optional readability expectations

## Outputs

- pass or fail result for the hook asset
- basic diagnostics:
  file exists, non-empty, dimensions readable, generation step succeeded

## Workflow

1. Check that the hook asset file exists.
2. Check that it is non-empty and loadable.
3. Check that the generated dimensions make sense for the target video.
4. Fail fast if generation threw an error or produced junk.
5. Only pass the asset into assembly once the direct check succeeds.

## Good Pattern

- hook card is tested right after generation
- failure happens before edit or render work continues
- verifier is small and direct
- readable dimensions are checked alongside mere file existence

## Bad Pattern

- discovering a broken hook card only in the final MP4
- passing empty or zero-byte assets downstream
- treating “file exists” as enough proof that the hook is usable
- overcomplicating a simple asset smoke test

## Pair With

- Use after [`hook-overlay`](../hook-overlay/SKILL.md).
- Pair with [`publish-prep-review`](../publish-prep-review/SKILL.md)
  for later whole-video quality gates.

## Aggregated From

- `mutonby/openshorts` `verify_hooks.py`
- hook-card generation workflows from `mutonby/openshorts`

## Validation Checklist

- Hook asset exists and is non-empty.
- Asset dimensions are plausible for the target viewport.
- Failures surface before timeline assembly.
- The run does not silently continue with a broken first-beat asset.
