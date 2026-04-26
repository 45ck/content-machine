# Codex Archetype Blackbox v1

Fresh-folder Codex CLI evaluations for the new bread-and-butter
archetypes using only local assets and the packaged skill pack.

Lanes in this experiment:

- `gameplay-confession/` - confession or storytime with support footage
  on top and Subway Surfers gameplay below
- `text-message-drama/` - message-thread reveal lane with generated chat
  cards on top and gameplay below

Each lane contains:

- `project/` - isolated empty-project workspace Codex is allowed to edit
- `prompt.md` - exact non-interactive Codex prompt
- `logs/` - Codex CLI logs and final message capture

The purpose is not to hand-assemble a good video manually. The purpose
is to see what Codex can produce in a fresh folder by following the
shipped skills and local contract files.

Current result snapshot:

- `gameplay-confession/` reached the packaged render path and produced a
  real MP4 plus a full review bundle
- `text-message-drama/` produced a real MP4 and real message-card
  assets, but the first Codex run fell back to local assembly after the
  packaged render path hit the browser-download trap
- the scaffold now includes a checked-in browser-resolution helper so
  future blackbox runs can inject a cached browser path when one exists
  without hardcoding this repo's warmed-up state

Checked in here:

- prompts
- project package manifests
- reference contracts and example requests
- result summaries

Left local-only on purpose:

- copied MP4 assets
- installed skill-pack contents
- generated outputs
- Codex logs
