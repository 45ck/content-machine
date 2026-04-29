# Animation Review And Render Validation Deep Dive

Date: 2026-04-29

## Purpose

Agents can produce impressive-looking animation code that still fails as a
video: elements jitter, captions collide, transitions feel mushy, layout shifts
between frames, or render performance collapses. This report defines validation
artifacts and review checks for motion-heavy content-machine output.

## Source Signals

| Source                                  | Signal                                                                                           | Content-machine takeaway                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Local `skills/video-render`             | Requires real MP4 inspection, caption sidecars, safe zones, and readability                      | Animation review should feed publish review and render skill gates |
| Local `src/render/remotion/visuals.tsx` | Scene background motion is deterministic and sequence-relative                                   | Review should check frame windows, not only final MP4 existence    |
| Local `src/score/*`                     | Caption, sync, pacing, audio, and burned-in caption scoring exist                                | Motion review should integrate with existing scoring surfaces      |
| Remotion performance docs               | Slow renders can come from GPU-heavy effects, slow JS, external fetches, and concurrency choices | Motion review needs performance risk fields                        |
| Playwright availability in repo         | Browser screenshots can validate HTML/SVG/Remotion preview frames                                | Agent skills can use screenshots for frame-by-frame review         |

## Validation Model

Recommended lifecycle:

1. Generate motion plan.
2. Run code review for deterministic timing and safe properties.
3. Capture representative frames.
4. Compare frame states against intended beats.
5. Render short preview or full MP4.
6. Run safe-zone, caption, performance, and readability checks.
7. Produce a motion review report with pass, revise, or fail.

## Representative Frames

For a `30fps`, `6s` motion scene, default review frames:

- `0`: empty or pre-entry state
- `6`: first movement visible
- `15`: entrance midpoint
- `30`: entrance settled
- `75`: hold state
- `120`: exit or transition begins
- `150`: transition midpoint
- `180`: final frame

For longer videos, sample:

- first frame
- first hook beat
- each scene boundary minus one frame
- each scene boundary plus one frame
- caption-dense frame
- highest-motion frame
- final frame

## Artifact Stack

### `motion-frame-samples.v1.json`

Purpose: index screenshot or still-frame samples.

Fields:

- `composition_id`
- `fps`
- `frames`
- `sample_paths`
- `reason`
- `capture_command`

### `motion-smoothness-report.v1.json`

Purpose: check continuity and visual flow.

Fields:

- `sample_set_path`
- `jitter_detected`
- `layout_shift_detected`
- `unexpected_jump_cuts`
- `transition_coherence`
- `motion_density`
- `status`

### `animation-safe-zone-report.v1.json`

Purpose: verify moving elements do not collide with captions or platform chrome.

Fields:

- `frame_samples_path`
- `caption_lane`
- `platform_safe_zone`
- `violations`
- `moving_element_bounds`
- `status`

### `render-performance-risk.v1.json`

Purpose: identify animation choices that may slow rendering.

Fields:

- `gpu_heavy_effects`
- `layout_animated_properties`
- `external_fetches`
- `expensive_js`
- `uncached_assets`
- `recommended_precomputes`
- `status`

### `motion-review-bundle.v1.json`

Purpose: final animation review wrapper.

Fields:

- `motion_plan_path`
- `motion_code_review_path`
- `frame_samples_path`
- `smoothness_report_path`
- `safe_zone_report_path`
- `performance_risk_path`
- `status`
- `recommended_action`

## Review Rubric

| Area          | Pass condition                                              |
| ------------- | ----------------------------------------------------------- |
| Flow          | Motion starts and settles on intentional beats              |
| Smoothness    | No unplanned jumps, jitter, or frame-to-frame layout shifts |
| Hierarchy     | Viewer knows what to read or watch first                    |
| Captions      | Captions remain readable and unblocked                      |
| Performance   | No unjustified heavy effects or render-time fetching        |
| Repeatability | Same input produces the same frame states                   |
| Platform fit  | Motion leaves safe-zone room for Shorts/Reels/TikTok chrome |

## Skill/Harness Opportunities

- A `motion-design-coder` skill should ask for review frames before code.
- A future harness can capture Remotion stills at planned frames.
- A future harness can parse generated CSS for blocked animated properties.
- `publish-prep-review` can read `motion-review-bundle.v1.json`.
- The eval suite can add golden motion cases for card, diagram, caption, and
  transition-heavy outputs.

## Quality Gates

- Motion-heavy output cannot be approved from a single static screenshot.
- A rendered MP4 can fail if motion harms readability or safe-zone placement.
- Scene transitions should be checked on frames before and after the boundary.
- Performance risk should block obviously expensive effects in batch rendering.
- Review output must name the upstream artifact or code to revise.

## Bead Targets

This report supports:

- `content-machine-ar38`: motion frame samples, smoothness, safe-zone, and
  performance reports.
- `content-machine-ar39`: publish-prep integration for motion review bundles.
