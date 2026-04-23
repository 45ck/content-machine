# Skills

This directory holds agent-facing skills that Claude Code, Codex CLI,
and similar coding agents can load without reading the whole repository
first.

Role split:

- `skills/` = self-contained craft guides and playbooks
- `flows/` = prompt-language orchestration
- `scripts/harness/` = optional repo-side execution surfaces

## Purpose

- Keep agent-facing judgment close to the runtime implementation.
- Package visual, editorial, and technical know-how where agents will
  actually look first.
- Preserve the repo boundary from [`DIRECTION.md`](../DIRECTION.md):
  skills teach how to do the work well; runtime code exists to support
  execution, not replace the skill.

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
3. How should the work be done well?
4. What files or outcomes should the agent expect back?

If those answers are missing, the skill is not ready to ship.

Use a skill directly when you want one capability. Use a flow when you
want multiple skills composed under one run directory.

## Authoring rules

- Keep descriptions concrete enough that an agent can select the skill
  without guessing.
- Treat `SKILL.md` as the canonical guide for how the work should be
  done, not just how to call a script.
- Put style language, decision rules, failure cases, and technical
  mapping in the skill itself.
- Use bundled references when the skill needs more depth than one file
  should carry.
- Document side effects. If a skill writes to disk, say where.
- If scripts exist, describe them as implementation support, not the
  identity of the skill.
- Keep evaluation criteria near the skill so agents can verify
  outcomes consistently.
- Treat already-published shorts and demo reels as reference inputs,
  not raw render footage.
- If a skill uses local footage or gameplay clips, make the
  caption-clean requirement explicit. Burned-in source text should be
  rejected before render, not explained away after the fact.

## Suggested `SKILL.md` sections

Use [`_template/SKILL.md`](_template/SKILL.md) as the starting point for
new skills.

- Summary
- Trigger phrases / selection hints
- Inputs
- Outputs
- Style and technical approach
- Optional runtime or script surfaces
- Output behavior
- Constraints and non-goals
- Validation checklist

## Shipped Starter Skills

- [`short-form-production-playbook/`](short-form-production-playbook/SKILL.md)
  — hook-first editorial, visual assembly, and reject-regenerate craft
  guidance for making strong shorts
- [`faceless-mixed-short/`](faceless-mixed-short/SKILL.md) — mixed
  stock/local/gameplay/AI-generated faceless short construction
- [`animation-explainer-short/`](animation-explainer-short/SKILL.md) —
  diagrams, motion cards, generated scenes, and motion-led explainer
  shorts
- [`longform-to-shorts/`](longform-to-shorts/SKILL.md) — transcript-led
  clipping, selection, reframing, and short extraction from long video
- [`reframe-vertical/`](reframe-vertical/SKILL.md) — speaker, face,
  cursor, and fallback portrait crop strategy
- [`reddit-story-short/`](reddit-story-short/SKILL.md) — Reddit/text
  story adaptation into narration-led shorts
- [`ugc-avatar-short/`](ugc-avatar-short/SKILL.md) — avatar or AI-actor
  spokesperson short construction
- [`doctor-report/`](doctor-report/SKILL.md) — structured environment
  and dependency diagnostics
- [`skill-catalog/`](skill-catalog/SKILL.md) — enumerate shipped skills,
  entrypoints, and example requests
- [`short-form-captions/`](short-form-captions/SKILL.md) — caption
  design, pacing, highlighting, and implementation patterns
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
