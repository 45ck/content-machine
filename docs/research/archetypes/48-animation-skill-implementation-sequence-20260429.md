# Animation Skill Implementation Sequence

Date: 2026-04-29

## Purpose

This report turns the motion research into an implementation order. The goal is
to improve the videos that Claude Code and Codex generate by giving agents a
clear motion-design workflow, concrete references, reusable tokens, and review
artifacts.

## Phase A: Skill And References

Create a lean `motion-design-coder` skill:

- route by surface: Remotion, SVG, HTML/CSS, or hybrid
- require a motion brief before code
- point to repo tokens and render surfaces
- point to validation checks
- keep detailed examples in references

Files:

- `skills/motion-design-coder/SKILL.md`
- `skills/motion-design-coder/references/remotion-patterns.md`
- `skills/motion-design-coder/references/svg-html-css-patterns.md`
- `skills/motion-design-coder/references/motion-quality-gates.md`
- `skills/motion-design-coder/assets/motion-token-template.json`

## Phase B: Planning Artifacts

Add schemas and fixtures:

- `motion-brief.v1.json`
- `motion-token-map.v1.json`
- `remotion-motion-plan.v1.json`
- `svg-motion-plan.v1.json`
- `html-css-motion-plan.v1.json`

These should be produced before code-heavy animation changes.

## Phase C: Review Artifacts

Add review outputs:

- `motion-code-review.v1.json`
- `motion-frame-samples.v1.json`
- `motion-smoothness-report.v1.json`
- `animation-safe-zone-report.v1.json`
- `render-performance-risk.v1.json`
- `motion-review-bundle.v1.json`

These should feed `publish-prep-review` so animation quality affects final
approval.

## Phase D: Harness Support

Add thin harnesses only after schemas exist:

- capture planned Remotion frames as PNG stills
- capture standalone HTML/SVG screenshots with Playwright
- scan CSS for layout-affecting animated properties
- summarize motion-review bundles for publish prep

## Phase E: Eval Fixtures

Create golden fixtures for:

- motion card lesson entrance and reveal
- diagram draw-on explainer
- caption-safe kinetic typography
- scene transition with no caption collision
- SVG icon system animation

## Integration Points

| Surface                     | Integration                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| `animation-explainer-short` | Use motion brief for diagram and generated-scene beats             |
| `motion-card-lesson-short`  | Use card-state and reveal timing as first-class motion plans       |
| `video-render`              | Consume motion review bundle before final approval                 |
| `style-profile-library`     | Store motion language and animation intensity in reusable profiles |
| `publish-prep-review`       | Fail janky, unreadable, or unsafe motion                           |
| `evals/`                    | Add golden motion fixtures and rubric checks                       |

## External Source Notes

This sequence is based on local repo surfaces plus current documentation for:

- OpenAI skills:
  `https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md`
- Claude Code slash commands:
  `https://docs.anthropic.com/en/docs/claude-code/slash-commands`
- Remotion animation primitives:
  `https://www.remotion.dev/docs/interpolate`,
  `https://www.remotion.dev/docs/spring`,
  `https://www.remotion.dev/docs/sequence`,
  `https://www.remotion.dev/docs/transitions`
- Remotion performance:
  `https://www.remotion.dev/docs/performance`

## Bead Targets

This report supports:

- `content-machine-ar35`: create the `motion-design-coder` skill.
- `content-machine-ar36`: add motion planning schemas.
- `content-machine-ar37`: add Remotion/SVG/HTML motion plan schemas.
- `content-machine-ar38`: add frame and smoothness validation.
- `content-machine-ar39`: integrate motion review into publish-prep.
