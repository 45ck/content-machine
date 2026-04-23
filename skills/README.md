# Skills

This directory holds harness-facing skills that Claude Code, Codex CLI,
and similar coding agents can load without reading the whole repository
first.

## Purpose

- Keep agent-facing intent close to the future skill implementation.
- Define a predictable shape for discovery, invocation, and artifacts.
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
direction docs and future harness manifests.

## For Claude Code and Codex CLI

Start with the local `SKILL.md`. A good skill document should let a
coding harness answer four questions fast:

1. When should this skill trigger?
2. What inputs does it need?
3. What deterministic script/runtime surface does it call?
4. What artifact paths should the harness expect back?

If those answers are missing, the skill is not ready to ship.

## Authoring rules

- Keep descriptions concrete enough that a harness can select the skill
  without guessing.
- Treat `SKILL.md` as the canonical human-readable contract for the
  skill.
- Prefer JSON-in/JSON-out boundaries and explicit artifact paths.
- Document side effects. If a skill writes to disk, say where.
- Do not duplicate runtime logic in prose. Point to the script or public
  runtime surface the skill invokes.
- Keep evaluation criteria near the skill so harnesses can verify
  outcomes consistently.

## Suggested `SKILL.md` sections

Use [`_template/SKILL.md`](_template/SKILL.md) as the starting point for
new skills.

- Summary
- Trigger phrases / selection hints
- Inputs
- Outputs
- Runtime or script entrypoints called
- Artifact contract
- Constraints and non-goals
- Validation checklist

## Shipped Starter Skills

- [`brief-to-script/`](brief-to-script/SKILL.md) — topic or blueprint to
  `script.json`
- [`reverse-engineer-winner/`](reverse-engineer-winner/SKILL.md) —
  reference short to VideoSpec/VideoTheme/blueprint artifacts
- [`video-render/`](video-render/SKILL.md) — visuals + timestamps +
  audio artifacts to `video.mp4`
- [`publish-prep-review/`](publish-prep-review/SKILL.md) — script +
  render review before upload

## Related docs

- [DIRECTION.md](../DIRECTION.md)
- [docs/direction/04-skill-catalog.md](../docs/direction/04-skill-catalog.md)
- [docs/direction/phases/phase-4-skills.md](../docs/direction/phases/phase-4-skills.md)
