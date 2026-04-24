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

```bash
cat skills/style-profile-library/examples/request.json | \
  node --import tsx scripts/harness/style-profile-library.ts
```
