# Motion Quality Gates

Use these gates before approving animation-heavy output.

## Planning Gates

- `motion-brief.v1.json` or equivalent notes exist.
- Duration and fps are known.
- Beat frames are named.
- Caption and platform safe zones are named.
- Moving elements have clear purpose.

## Code Gates

- Remotion uses frame-driven primitives.
- Interpolations are clamped unless a loop is intentional.
- Springs are tuned for readability.
- SVG has a stable `viewBox`.
- HTML/CSS animation prefers transform and opacity.
- Heavy render effects are documented.

## Frame Review Gates

Review at least:

- first frame
- first visible movement
- entrance midpoint
- settled state
- highest-motion frame
- scene boundary before and after
- caption-dense frame
- final frame

## Failure Modes

Fail or revise when:

- motion is decorative and unrelated to the beat
- text is unreadable during movement
- captions collide with cards, icons, or platform chrome
- elements jump because layout properties are animated
- animation starts or ends between meaningful beats
- render performance is likely to collapse in batch mode
- the final MP4 exists but the motion feels unsynchronized

## Review Output

Summarize:

- pass, revise, or fail
- exact frame or time range with the issue
- code or artifact to change
- whether rerender is required
- whether downstream publish review is invalidated
