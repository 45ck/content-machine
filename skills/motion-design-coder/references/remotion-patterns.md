# Remotion Patterns

Use these patterns when coding Remotion animation for content-machine.

## Frame-Driven Baseline

Use Remotion time, not browser time:

```tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const frame = useCurrentFrame();
const { fps } = useVideoConfig();
```

Avoid `Date.now()`, `setInterval()`, and runtime randomness. If variety is
needed, use deterministic input-derived seeds.

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

## Sequence Timing

Use `Sequence` to isolate scene-local frames:

```tsx
<Sequence from={hookFrames} durationInFrames={sceneFrames}>
  <SceneCard />
</Sequence>
```

Inside a sequence, `useCurrentFrame()` starts at `0`. Use this to keep card
motion self-contained.

## Transition Rules

Use standard transitions first:

- fade for soft scene changes
- slide for directional continuity
- wipe or iris for diagram reveals
- no transition when the cut itself is the beat

Prefer `@remotion/transitions` before bespoke transition code.

## Layer Order

Recommended full-frame order:

1. background or footage
2. secondary drift/parallax
3. diagram/card layer
4. hook or emphasis overlays
5. captions
6. foreground flourishes only when they do not block captions

## Local Repo Hooks

Check these files before inventing patterns:

- `src/render/remotion/visuals.tsx`
- `src/render/remotion/ShortVideo.tsx`
- `src/render/presets/animation.ts`
- `src/render/tokens/easing.ts`
- `src/render/tokens/timing.ts`

## Anti-Patterns

- CSS-only infinite animations inside Remotion compositions.
- Unclamped `interpolate()` that grows past the intended range.
- Animating all elements at once.
- Combining bounce, blur, rotation, and scale on readable text.
- Moving captions and card text at the same time.
