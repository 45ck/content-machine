# Remotion, SVG, HTML, And CSS Animation Quality Deep Dive

Date: 2026-04-29

## Purpose

This report turns current Remotion guidance and local render implementation into
animation rules for content-machine. The goal is not just "more animation"; the
goal is smoother flow, clearer hierarchy, fewer render bottlenecks, and
repeatable motion that coding agents can implement without guessing.

## Source Signals

| Source                                  | Signal                                                                                                        | Content-machine takeaway                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Remotion `interpolate()` docs           | Map frame values to opacity, scale, position, colors, and easing; clamp output ranges                         | Agents should use bounded interpolation for predictable motion                           |
| Remotion `spring()` docs                | Physics-based primitive with damping, stiffness, mass, delay, and duration controls                           | Entrances and emphasis should use tuned springs rather than arbitrary bezier-only motion |
| Remotion `Sequence` docs                | Time-shifts and trims components; child frame values are sequence-relative                                    | Scene and card motion should be staged with explicit frame windows                       |
| Remotion `@remotion/transitions` docs   | Provides `TransitionSeries`, spring/linear timings, and presentations                                         | Scene transitions should use standard primitives before bespoke transition code          |
| Remotion performance docs               | Render cost can suffer from GPU-heavy effects, slow JS, overfetching, codecs, resolution, and bad concurrency | Smooth visual design also needs render-performance budgets                               |
| Local `src/render/tokens/*`             | Timing and easing tokens already exist                                                                        | Motion generation should reuse repo tokens before adding new values                      |
| Local `src/render/remotion/visuals.tsx` | Image scenes already use sequence-relative Ken Burns via `interpolate`                                        | New motion should follow this deterministic pattern                                      |

## Motion Rules

### Remotion

- Use `useCurrentFrame()` and `useVideoConfig()` for all timeline-driven
  movement.
- Use `Sequence` for scene-local time and nested timing.
- Use `interpolate(..., {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})`
  for bounded opacity, scale, translate, and color progress.
- Use `spring()` for entry, emphasis, and settle states.
- Use `@remotion/transitions` for scene-to-scene transitions when the effect is
  a normal fade, slide, wipe, iris, or flip.
- Use existing tokens:
  - `TIMING_MS.wordPop`
  - `TIMING_MS.titleEntrance`
  - `TIMING_MS.sceneTransition`
  - `EASING_CURVES.snapSettle`
  - `EASING_CURVES.punchyPop`
  - `SPRING_CONFIGS.snappy`

### SVG

- Set a stable `viewBox`.
- Animate `transform`, `opacity`, `strokeDashoffset`, masks, and clip paths.
- Avoid animating layout-like SVG attributes when a transform can do the job.
- Keep text as real text when it must be readable; convert to paths only for
  locked logos or decorative shape motion.
- Use path length and draw-on effects sparingly for diagram explanation, not
  every line.

### HTML/CSS

- Prefer `transform` and `opacity`.
- Avoid `top`, `left`, width, height, and layout-affecting animation for
  repeated motion.
- Avoid heavy `filter`, `blur`, `drop-shadow`, huge `box-shadow`, and radial or
  linear gradient animation in cloud renders unless precomputed.
- Avoid infinite CSS animation loops in Remotion output; use frame-derived state
  so the rendered frame is deterministic.
- Use CSS custom properties for motion tokens when generating standalone HTML.

## Timing Grammar

| Motion type       | Recommended duration |
| ----------------- | -------------------- |
| Word pop          | 70-130ms             |
| Icon or badge pop | 100-180ms            |
| Card entrance     | 180-320ms            |
| Scene transition  | 250-500ms            |
| Diagram draw-on   | 400-900ms            |
| Background drift  | Full scene duration  |

## Motion Density Rules

- One primary motion per beat.
- One secondary motion maximum when it supports the same beat.
- Captions must not fight card motion.
- Background drift should be slow enough to be felt, not read as camera shake.
- Element entrances should stagger by 2-5 frames, not all at once.

## Performance Rules

- Precompute heavy glows, textures, and complex shadows into image assets.
- Memoize expensive geometry or path calculations.
- Avoid network fetches during render; use `staticFile()` or bundled assets.
- Use Remotion verbose logs and benchmarks when render speed becomes uncertain.
- Validate at target `1080x1920`, `30fps`, and any lower-resolution preview mode
  separately.

## External Source Notes

- Remotion `interpolate()` docs:
  `https://www.remotion.dev/docs/interpolate`
- Remotion `spring()` docs:
  `https://www.remotion.dev/docs/spring`
- Remotion `Sequence` docs:
  `https://www.remotion.dev/docs/sequence`
- Remotion transitions docs:
  `https://www.remotion.dev/docs/transitions`
- Remotion performance docs:
  `https://www.remotion.dev/docs/performance`

## Artifact Stack

### `motion-token-map.v1.json`

Purpose: tie a generated animation to timing, easing, and spring tokens.

Fields:

- `fps`
- `timing_tokens`
- `easing_tokens`
- `spring_tokens`
- `custom_tokens`
- `source_files`

### `remotion-motion-plan.v1.json`

Purpose: plan frame windows and primitives for a Remotion composition.

Fields:

- `composition_id`
- `duration_frames`
- `sequences`
- `transitions`
- `springs`
- `interpolations`
- `caption_safe_zone`
- `performance_budget`

### `svg-motion-plan.v1.json`

Purpose: plan SVG-specific animation.

Fields:

- `view_box`
- `animated_elements`
- `path_draws`
- `masks`
- `transforms`
- `text_strategy`
- `reduced_motion_fallback`

### `html-css-motion-plan.v1.json`

Purpose: plan standalone HTML/CSS motion.

Fields:

- `layout_constraints`
- `animated_selectors`
- `css_variables`
- `keyframes`
- `transform_only_checks`
- `blocked_properties`

## Quality Gates

- Motion values must be bounded or intentionally looped.
- Every moving layer must have a purpose tied to a beat.
- Rendered text must remain readable at phone preview size.
- Effects known to slow Remotion renders must be justified or precomputed.
- SVG and HTML/CSS motion must have a deterministic frame or keyframe plan.

## Bead Targets

This report supports:

- `content-machine-ar36`: motion brief, token map, and code review artifacts.
- `content-machine-ar37`: Remotion, SVG, and HTML/CSS motion plan artifacts.
