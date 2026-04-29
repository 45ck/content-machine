# Agent Motion Design Skill Systems Deep Dive

Date: 2026-04-29

## Purpose

Claude Code and Codex can produce attractive SVG, HTML, CSS, and Remotion
animations, but the output quality depends heavily on the agent surface. Generic
"make it look better" prompts tend to create decorative motion, layout shifts,
slow effects, and unsynchronized transitions. This report defines skill and
prompt structures that make coding agents produce smoother, more intentional
motion for content-machine videos.

## Source Signals

| Source                                                                  | Signal                                                                                                                     | Content-machine takeaway                                                  |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| OpenAI skills guidance                                                  | Skills package specialized workflows, references, scripts, and assets; keep `SKILL.md` lean and use progressive disclosure | Motion guidance should be a reusable skill with focused references        |
| Codex `AGENTS.md` guidance                                              | Project-level instructions shape coding-agent behavior                                                                     | The repo should describe motion constraints where agents already look     |
| Claude Code slash command docs                                          | Slash commands are reusable Markdown prompts; skills and commands serve different repeat-workflow roles                    | Claude usage can pair a motion skill with project slash commands          |
| Claude Code hooks docs                                                  | Hooks can run project commands around tool events, with security caveats                                                   | Animation verification can be hook-driven only for local, explicit checks |
| Local `skills/video-render`                                             | Render skill already owns safe-zone, caption readability, and MP4 inspection                                               | Motion skill should feed render, not bypass render review                 |
| Local `skills/animation-explainer-short` and `motion-card-lesson-short` | Existing lanes ask for diagrams, cards, transitions, and deterministic card states                                         | Motion skill should improve these lanes first                             |

## Skill Design Model

The best agent-facing shape is a small skill plus targeted references:

- `SKILL.md`: route, workflow, hard rules, and validation checklist.
- `references/remotion-patterns.md`: frame-driven Remotion recipes.
- `references/svg-html-css-patterns.md`: SVG, HTML, and CSS animation patterns.
- `references/motion-quality-gates.md`: review checks and failure modes.
- `assets/motion-token-template.json`: reusable timing/easing/schema seed.

This keeps the trigger cheap while still giving agents enough detail when they
need to write actual animation code.

## Agent Workflow

1. Identify the surface: Remotion, SVG, HTML/CSS, or hybrid.
2. Write a motion brief before code:
   - composition purpose
   - scene duration
   - important beat frames
   - hierarchy of moving elements
   - safe zones and caption lanes
   - allowed effects
   - blocked effects
3. Use repo motion tokens before inventing new easing values.
4. Implement frame-driven animation:
   - Remotion: `useCurrentFrame`, `useVideoConfig`, `interpolate`, `spring`,
     `Sequence`, `Series`, and transition primitives.
   - SVG: path length, masks, viewBox-safe transforms, and CSS variables.
   - HTML/CSS: transforms and opacity first; layout properties last.
5. Render or screenshot representative frames.
6. Review for readability, flow, jitter, motion density, and performance.
7. Record motion decisions in a reusable artifact.

## Prompt Patterns

### Strong Request Shape

Use:

```text
Create a 30fps Remotion card animation for a 6-second vertical short.
Plan beat frames first. Use spring/interpolate, Sequence, and transform/opacity.
Keep captions in the lower safe zone untouched. Avoid blur-heavy effects.
Return code plus a frame checklist for 0, 15, 45, 90, 135, 180.
```

Avoid:

```text
Make this animation more premium and smooth.
```

### Motion Brief Fields

- `surface`
- `duration_frames`
- `fps`
- `visual_goal`
- `beat_frames`
- `entry_motion`
- `hold_motion`
- `exit_motion`
- `caption_safe_zone`
- `performance_budget`
- `review_frames`

## Agent-Specific Usage

### Codex CLI

Codex should use a skill for the motion workflow because the rules are
repeatable and domain-specific. The skill should call out local files:

- `src/render/presets/animation.ts`
- `src/render/tokens/easing.ts`
- `src/render/tokens/timing.ts`
- `src/render/remotion/visuals.tsx`
- `skills/video-render/SKILL.md`

### Claude Code

Claude Code should use the same repo docs, plus optional slash commands for
repeat operations:

- `/motion-brief`: create the motion brief.
- `/motion-pass`: implement the animation.
- `/motion-review`: run screenshots/render checks and summarize failures.

Hooks may run local checks, but they should not auto-render expensive videos
without an explicit user command.

## External Source Notes

- OpenAI skill guidance supports concise skill bodies, references, scripts, and
  assets for repeatable domain work:
  `https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md`
- Claude Code slash command docs support custom Markdown commands:
  `https://docs.anthropic.com/en/docs/claude-code/slash-commands`
- Claude Code hooks docs support project hook automation with explicit security
  warnings:
  `https://docs.anthropic.com/en/docs/claude-code/hooks`

## Artifact Stack

### `motion-brief.v1.json`

Purpose: make motion intent explicit before code generation.

Fields:

- `surface`
- `duration_frames`
- `fps`
- `visual_goal`
- `beat_frames`
- `moving_elements`
- `caption_safe_zone`
- `blocked_effects`
- `review_frames`

### `agent-motion-skill.v1.json`

Purpose: record which skill or command guided the generation.

Fields:

- `agent`
- `skill_name`
- `slash_command`
- `references_loaded`
- `source_docs`
- `repo_files_consulted`
- `constraints_applied`

### `motion-code-review.v1.json`

Purpose: review generated code before render.

Fields:

- `surface`
- `uses_frame_time`
- `uses_motion_tokens`
- `uses_transform_opacity_first`
- `avoids_layout_shift`
- `avoids_unbounded_css_animation`
- `performance_risks`
- `status`

## Quality Gates

- Animation code must be driven by frame time or explicit keyframes.
- Remotion code should prefer `spring` and `interpolate` over hand-rolled
  timers.
- CSS animation loops should be avoided in rendered video unless they are
  deterministic under frame capture.
- Motion should explain hierarchy, not add unrelated movement.
- Generated code must preserve caption and platform safe zones.

## Bead Targets

This report supports:

- `content-machine-ar35`: motion-design agent skill and reference pack.
- `content-machine-ar36`: motion brief and code review artifacts.
