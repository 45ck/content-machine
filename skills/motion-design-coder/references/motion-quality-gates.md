# Motion Quality Gates

Use these gates before approving animation-heavy output.

## Planning Gates

- `motion-brief.v1.json` or equivalent notes exist.
- Duration and fps are known.
- Beat frames are named.
- Caption and platform safe zones are named.
- Moving elements have clear purpose.
- Any external inspiration has a source URL, usage mode, license status,
  and fallback plan.

## Code Gates

- Remotion uses frame-driven primitives.
- Interpolations are clamped unless a loop is intentional.
- Render-time randomness is deterministic and seeded.
- CSS animation clocks are not used for rendered Remotion output.
- Springs are tuned for readability.
- SVG has a stable `viewBox`.
- HTML/CSS animation prefers transform and opacity.
- Heavy render effects are documented.

## Source Gates

- Component-library and creative-coding sources are treated as
  inspiration unless reuse rights are verified.
- Copied code, fonts, icons, images, models, textures, or audio have
  asset-ledger/source-note records.
- Premium examples, paid templates, watermarked previews, and unclear
  marketplace assets are not included.
- Procedural or generative visuals use deterministic seed/frame inputs
  and have particle/node/performance budgets.

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

For public examples, also run the repo demo audit after rendering if the
MP4 is placed under `docs/demo`:

```bash
npm_config_script_shell=/bin/bash npm run review:demo-videos
```

## Failure Modes

Fail or revise when:

- motion is decorative and unrelated to the beat
- text is unreadable during movement
- captions collide with cards, icons, or platform chrome
- elements jump because layout properties are animated
- frame output changes between renders because of browser time or
  unseeded randomness
- CSS animations drive Remotion timing and flicker under multi-tab render
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
