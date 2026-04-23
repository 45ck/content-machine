# Skills

This directory holds agent-facing skills that Claude Code, Codex CLI,
and similar coding agents can load without reading the whole repository
first.

Role split:

- `skills/` = intent guide
- `flows/` = orchestration guide
- `scripts/harness/` = repo-side JSON-stdio surface

## Purpose

- Keep agent-facing intent close to the runtime implementation.
- Define a predictable shape for discovery, invocation, and outputs.
- Preserve the repo boundary from [`DIRECTION.md`](../DIRECTION.md):
  skills own agentic playbooks and call scripts/runtime surfaces rather
  than re-implementing product logic.

## Expected layout

Each skill should live in its own directory:

```text
skills/
  <skill-id>/
    SKILL.md
    prompts/          # optional
    examples/         # optional
    fixtures/         # optional
```

`<skill-id>` should be kebab-case and match the skill identifier used in
direction docs and flow manifests.

## For Claude Code and Codex CLI

Start with the local `SKILL.md`. A good skill document should let a
coding agent answer four questions fast:

1. When should this skill trigger?
2. What inputs does it need?
3. What deterministic script/runtime surface does it call?
4. What files should the agent expect back?

If those answers are missing, the skill is not ready to ship.

Use a skill directly when you want one capability. Use a flow when you
want multiple skills composed under one run directory.

## Authoring rules

- Keep descriptions concrete enough that an agent can select the skill
  without guessing.
- Treat `SKILL.md` as the canonical human-readable guide for the skill.
- Prefer clear JSON boundaries and explicit file paths.
- Document side effects. If a skill writes to disk, say where.
- Do not duplicate runtime logic in prose. Point to the script or public
  runtime surface the skill invokes.
- Keep evaluation criteria near the skill so agents can verify
  outcomes consistently.

## Suggested `SKILL.md` sections

Use [`_template/SKILL.md`](_template/SKILL.md) as the starting point for
new skills.

- Summary
- Trigger phrases / selection hints
- Inputs
- Outputs
- Runtime or script entrypoints called
- Output behavior
- Constraints and non-goals
- Validation checklist

## Shipped Starter Skills

- [`doctor-report/`](doctor-report/SKILL.md) — structured environment
  and dependency diagnostics
- [`skill-catalog/`](skill-catalog/SKILL.md) — enumerate shipped skills,
  entrypoints, and example requests
- [`generate-short/`](generate-short/SKILL.md) — topic to full video
  run under one output directory
- [`brief-to-script/`](brief-to-script/SKILL.md) — topic or blueprint to
  `script.json`
- [`reverse-engineer-winner/`](reverse-engineer-winner/SKILL.md) —
  reference short to VideoSpec/VideoTheme/blueprint files
- [`script-to-audio/`](script-to-audio/SKILL.md) — `script.json` to
  `audio.wav` + `timestamps.json`
- [`timestamps-to-visuals/`](timestamps-to-visuals/SKILL.md) —
  `timestamps.json` to `visuals.json`
- [`video-render/`](video-render/SKILL.md) — visuals + timestamps +
  audio files to `video.mp4`
- [`publish-prep-review/`](publish-prep-review/SKILL.md) — script +
  render review before upload

## Related docs

- [DIRECTION.md](../DIRECTION.md)
- [docs/direction/04-skill-catalog.md](../docs/direction/04-skill-catalog.md)
- [docs/direction/phases/phase-4-skills.md](../docs/direction/phases/phase-4-skills.md)
