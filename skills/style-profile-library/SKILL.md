---
name: style-profile-library
description: Save reusable local short-form style profiles for captions, pacing, visual rules, and render defaults.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"libraryPath":"output/content-machine/library/style-profiles.v1.json","profile":{"id":"default-shorts","name":"Default Shorts","captionStyle":"karaoke-ass","pacing":"fast","updatedAt":"2026-04-24T00:00:00.000Z"}}'
entrypoint: node --import tsx scripts/harness/style-profile-library.ts
inputs:
  - name: libraryPath
    description: Path that will receive style-profiles.v1.json.
    required: false
  - name: existingLibraryPath
    description: Optional existing library to read before upserting the profile.
    required: false
  - name: profile
    description: Style profile to add or replace by id.
    required: true
outputs:
  - name: style-profiles.v1.json
    description: Local reusable style profile library.
---

# Style Profile Library

Use this when a visual/caption/editing style should become a reusable
local preset instead of being repeated in prompts.

## Trigger Phrases

- "Save this caption/render style as a reusable profile."
- "Use our default Shorts style again."
- "Create a local style preset for this niche."
- "Update the caption, pacing, and render defaults for future runs."

## Inputs

- `profile.id`: stable kebab-case id used by future requests.
- `profile.name`: human-readable label.
- `profile.captionStyle`: caption treatment, such as `karaoke-ass` or
  `bold-chunk`.
- `profile.pacing`: pacing label, such as `fast`, `balanced`, or
  `deliberate`.
- `profile.visualRules`: optional local visual constraints.
- `profile.renderDefaults`: optional render defaults that downstream
  tools can reuse.
- `profile.updatedAt`: ISO timestamp for maintenance.
- `libraryPath`: output path for the merged library.
- `existingLibraryPath`: optional path to merge from before writing.

## Invocation

```bash
cat skills/style-profile-library/examples/request.json | \
  node --import tsx scripts/harness/style-profile-library.ts
```

Installed pack:

```bash
cat .content-machine/skills/style-profile-library/examples/request.json | \
  npx --no-install cm-agent style-profile-library
```

## Output Behavior

- Reads `existingLibraryPath` when provided.
- Adds or replaces the profile with the same `id`.
- Sorts profiles by `id` for stable diffs.
- Writes a `style-profiles.v1.json` artifact to `libraryPath`.
- Returns the output path and profile count.

## Constraints

- Do not use this as a project memory file for arbitrary notes.
- Do not store secrets, API keys, private customer data, or unlicensed
  source-media paths in profiles.
- Keep provider-specific model names optional; profiles should survive
  provider changes.

## Validation Checklist

- `style-profiles.v1.json` exists at the returned path.
- The target profile id appears once.
- Caption style, pacing, visual rules, and render defaults match the
  user's requested reusable style.
- No secrets or rights-sensitive media paths were stored.
