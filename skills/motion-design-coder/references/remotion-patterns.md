# Remotion Patterns

Use these patterns when coding Remotion animation for content-machine.

Official Remotion docs this guidance is based on:

- `https://www.remotion.dev/docs/use-current-frame`
- `https://www.remotion.dev/docs/use-video-config`
- `https://www.remotion.dev/docs/interpolate`
- `https://www.remotion.dev/docs/spring`
- `https://www.remotion.dev/docs/flickering`
- `https://www.remotion.dev/docs/random`

## Frame-Driven Baseline

Use Remotion time, not browser time:

```tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const frame = useCurrentFrame();
const { fps } = useVideoConfig();
```

Avoid `Date.now()`, `setInterval()`, and runtime randomness. If variety is
needed, use deterministic input-derived seeds.

Think of each component as a pure function:

```text
frame + props -> visual state
```

It must look the same if frame `215` is rendered first, last, or in a
different browser tab.

## Bounded Interpolation

Clamp by default:

```tsx
const opacity = interpolate(frame, [0, 12], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

Use interpolation for opacity, translate, scale, progress, color, and mask
progress.

Never leave `interpolate()` unbounded unless a deliberate loop or overshoot
is being reviewed. Unbounded scale/translate is a common cause of elements
leaving the phone frame or colliding with captions.

## Spring Entrances

Use spring for entry and settle:

```tsx
const enter = spring({
  frame,
  fps,
  config: { damping: 15, stiffness: 200, mass: 1 },
  durationInFrames: 18,
});

const y = interpolate(enter, [0, 1], [48, 0]);
const scale = interpolate(enter, [0, 1], [0.96, 1]);
```

Increase damping when bounce distracts from readability.

Use spring for short entrances, not for every property. Prefer one primary
spring driver per element:

- opacity plus slight `translateY`
- scale plus opacity
- path reveal plus label fade

Avoid combining bounce, rotation, blur, and text scale on the same readable
object.

## Sequence Timing

Use `Sequence` to isolate scene-local frames:

```tsx
<Sequence from={hookFrames} durationInFrames={sceneFrames}>
  <SceneCard />
</Sequence>
```

Inside a sequence, `useCurrentFrame()` starts at `0`. Use this to keep card
motion self-contained.

For script-driven shorts, convert timestamps to frame windows before coding:

```ts
const start = Math.round(beat.startSeconds * fps);
const end = Math.round(beat.endSeconds * fps);
```

Then use `Sequence` or a scene-local `frame - start` so each scene can be
reviewed independently.

## Deterministic Variety

Use Remotion's seeded `random()` for particles, offset choices, or organic
variation:

```tsx
import { random } from 'remotion';

const x = random(`particle-x-${index}`) * 1080;
```

Do not use `Math.random()` for rendered video. It can differ across render
tabs and cause flicker or inconsistent frames.

## Transition Rules

Use standard transitions first:

- fade for soft scene changes
- slide for directional continuity
- wipe or iris for diagram reveals
- no transition when the cut itself is the beat

Prefer `@remotion/transitions` before bespoke transition code.

Transitions should have editorial meaning:

- `cut` when the narration beat itself creates the punch
- `fade` for softer mood/context changes
- `slide` when spatial direction matters
- `wipe` for before/after, progress, or diagram reveals
- `match cut` when two cards share a shape or layout

## Layer Order

Recommended full-frame order:

1. background or footage
2. secondary drift/parallax
3. diagram/card layer
4. hook or emphasis overlays
5. captions
6. foreground flourishes only when they do not block captions

Only one layer should own attention at a time. If captions are actively
highlighting words, background cards should hold or drift subtly.

## Local Repo Hooks

Check these files before inventing patterns:

- `src/render/remotion/visuals.tsx`
- `src/render/remotion/ShortVideo.tsx`
- `src/render/presets/animation.ts`
- `src/render/tokens/easing.ts`
- `src/render/tokens/timing.ts`

## Asset Loading And Flicker

Use Remotion media primitives that wait for assets where possible:

- `<Img>`
- `<OffthreadVideo>`
- `<Audio>`
- `<IFrame>`

If custom font or data loading is needed, block render until ready. Do not
let a loading frame become part of the MP4.

## Anti-Patterns

- CSS-only infinite animations inside Remotion compositions.
- Unclamped `interpolate()` that grows past the intended range.
- Animating all elements at once.
- Combining bounce, blur, rotation, and scale on readable text.
- Moving captions and card text at the same time.
- `Date.now()`, `performance.now()`, `setInterval()`, or requestAnimationFrame
  as the render clock.
- `Math.random()` for render-time visual state.
- Relying on `--concurrency=1` as the normal fix for flicker instead of
  making the composition deterministic.
