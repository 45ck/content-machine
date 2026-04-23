---
name: generated-asset-versioning
description: Preserve version history for generated storyboards, clips, character sheets, scene art, props, and other media assets so revisions can be compared, restored, and traced instead of being overwritten blindly.
---

# Generated Asset Versioning

## Use When

- A project generates visual or video assets iteratively.
- Revisions matter and older outputs may need to be restored or
  compared.
- The workflow would otherwise overwrite storyboards or clips with no
  history.

## Core Rule

- Generated media is not disposable scratch once it enters the project.
- Keep version history for any asset that may be revised.

## Inputs

- project path
- resource type:
  storyboard, video, character, scene, prop, grid, reference video
- resource id
- prompt or generation brief
- current file path
- optional metadata:
  aspect ratio, duration, notes, model, provider

## Outputs

- new version record
- current-version pointer
- ability to compare or restore earlier asset versions

## Workflow

1. Before overwriting a current asset, make sure the current file is
   tracked.
2. Save the new output as the next version, not as untracked
   replacement.
3. Store prompt and important generation metadata with the version.
4. Update the current-version pointer only after the new asset is
   written successfully.
5. Keep restore capability for rollbacks and comparisons.

## Good Uses

- multiple storyboard passes for the same scene
- revised generated clip for one beat
- new character design or prop art after feedback
- swapping between two viable generations while keeping history

## Bad Uses

- overwriting the only copy of a generated asset
- versioning meaningless temp files
- storing no prompt metadata, making versions impossible to interpret

## Pair With

- Use with [`partial-regeneration`](../partial-regeneration/SKILL.md)
  and [`retry-with-cache`](../retry-with-cache/SKILL.md).
- Use with [`storyboard-continuity-reference`](../storyboard-continuity-reference/SKILL.md)
  when sequential storyboard revisions need history.

## Aggregated From

- `ArcReel/ArcReel` `version_manager.py`
- `ArcReel/ArcReel` `media_generator.py`

## Validation Checklist

- Existing current asset is tracked before overwrite.
- New versions include prompt or generation metadata.
- Restore path exists for older versions.
- Versioning is applied to meaningful media assets, not random temp
  files.
