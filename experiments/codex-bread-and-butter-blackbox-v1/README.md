# Codex Bread-and-Butter Blackbox v1

Isolated Codex CLI experiment for a bread-and-butter short-form lane.

Goal:

- run Codex in a fresh project folder
- install the local Content Machine skill pack
- have Codex produce one real short
- reject silent audio and dead/static backgrounds
- keep all prompts, logs, outputs, and reports under this directory

Current target lane:

- Reddit-style story short with real motion-backed visuals

Key directories:

- `project/` - isolated Codex working project
- `project/.content-machine/` - materialized skill pack
- `project/assets/motion/` - curated local moving clips
- `project/outputs/` - Codex-produced artifacts
- `logs/` - Codex CLI logs and transcripts
- `prompt.md` - exact instructions given to Codex

