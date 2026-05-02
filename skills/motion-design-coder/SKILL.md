---
name: motion-design-coder
description: Use when generating or improving SVG, HTML, CSS, React, or Remotion animations for content-machine videos so motion is frame-driven, smooth, readable, performant, and safe for captions/platform chrome.
---

# Motion Design Coder

## Use When

- The user asks for better-looking SVG, HTML, CSS, React, or Remotion
  animation.
- A video lane needs smoother cards, diagrams, kinetic typography,
  icon motion, transitions, or generated visual systems.
- Claude Code, Codex, or another coding agent needs a repeatable motion
  workflow instead of generic "make it premium" styling.
- Render output looks static, janky, busy, caption-colliding, or slow.

## Core Rule

Plan motion before code. Every moving element needs a beat, timing window,
purpose, safe-zone check, and review frame.

For Remotion output, treat every component as:

```text
frame number + input props -> one deterministic image
```

If an animation depends on browser time, render order, `Math.random()`,
unloaded assets, or CSS animation clocks, it is not ready for a rendered
short.

## Workflow

1. Identify the surface:
   - Remotion or React video
   - standalone SVG
   - HTML/CSS
   - hybrid Remotion plus SVG/HTML assets
2. Write a motion brief:
   - duration and fps
   - beat frames
   - moving elements
   - entry, hold, and exit motion
   - caption and platform safe zones
   - blocked effects
   - review frames
3. Use existing repo tokens before inventing new values:
   - `src/render/tokens/easing.ts`
   - `src/render/tokens/timing.ts`
   - `src/render/presets/animation.ts`
4. For Remotion, use frame-driven primitives. Read
   [remotion-patterns.md](references/remotion-patterns.md).
5. For SVG, HTML, and CSS, use transform/opacity-first patterns. Read
   [svg-html-css-patterns.md](references/svg-html-css-patterns.md).
6. If external inspiration or component sources are needed, use
   [`creative-source-scout`](../creative-source-scout/SKILL.md) first
   and rebuild original, deterministic motion rather than copying
   unclear assets.
   For concrete motifs, read
   [source-inspired-patterns.md](references/source-inspired-patterns.md).
7. When prompting Claude Code, Codex CLI, or another coding agent, use
   [agent-prompting-patterns.md](references/agent-prompting-patterns.md)
   so the agent produces a motion brief, code constraints, and review
   frames instead of generic animation styling.
8. Before approval, apply
   [motion-quality-gates.md](references/motion-quality-gates.md).
9. If rendering a full short, hand off to
   [`video-render`](../video-render/SKILL.md) and preserve the motion
   plan for publish review.

## Output Expectations

When advising, return:

- recommended surface
- motion brief
- timing/easing/spring choices
- code-generation constraints
- review frames
- quality gates

When coding, produce:

- deterministic frame or keyframe timing
- bounded interpolation or explicit keyframes
- no unbounded browser timers
- no accidental caption/platform collisions
- no heavy effects without a performance reason

## Good Defaults

- `30fps`
- `1080x1920`
- design and review at phone-preview size, not only desktop zoom
- word pop: `70-130ms`
- card entrance: `180-320ms`
- scene transition: `250-500ms`
- diagram draw-on: `400-900ms`
- stagger: `2-5` frames
- prefer `transform` and `opacity`
- avoid layout-shifting animation properties
- hold important text still for at least `12-24` frames after entrance

## Hard Blocks

- Do not animate `top`, `left`, width, height, or layout flow when a
  transform can do the same job.
- Do not use infinite CSS animation loops for Remotion output unless the
  loop is intentionally deterministic at every rendered frame.
- Do not add blur, filter, huge shadows, or animated gradients to cloud
  renders without recording a performance reason.
- Do not move cards, captions, or diagrams into platform chrome zones.
- Do not approve motion-heavy output from one screenshot only.
- Do not use `Math.random()` in Remotion animation. Use deterministic
  seeded values.
- Do not allow motion to compete with active captions; if captions are
  moving, cards and background text should mostly hold.

## Artifact Targets

- `motion-brief.v1.json`
- `motion-token-map.v1.json`
- `remotion-motion-plan.v1.json`
- `svg-motion-plan.v1.json`
- `html-css-motion-plan.v1.json`
- `motion-code-review.v1.json`
- `motion-frame-samples.v1.json`
- `motion-smoothness-report.v1.json`
- `animation-safe-zone-report.v1.json`
- `render-performance-risk.v1.json`
- `motion-review-bundle.v1.json`

Use
`assets/motion-token-template.json`
as a seed when an implementation needs a concrete token shape.

## Validation Checklist

- Motion is tied to the script, beat, or information hierarchy.
- Remotion code uses `useCurrentFrame`, `useVideoConfig`, `Sequence`,
  `interpolate`, `spring`, or standard transition primitives.
- CSS animations are not used as the clock for rendered Remotion output.
- SVG/HTML/CSS code prefers transform and opacity over layout changes.
- Values are clamped, timed, or deliberately looped.
- Captions and important text stay readable at phone size.
- Representative frames show clean entry, hold, transition, and exit
  states.
- Render-performance risks are documented before batch use.
