# SVG, HTML, And CSS Patterns

Use this when the animation is standalone SVG, HTML/CSS, or an asset that will
be embedded into Remotion.

## SVG

Start with a stable frame:

```svg
<svg viewBox="0 0 1080 1920" role="img" aria-label="Animated lesson card">
```

Prefer:

- `transform`
- `opacity`
- `stroke-dasharray`
- `stroke-dashoffset`
- masks
- clip paths
- CSS custom properties

Avoid:

- changing the `viewBox` over time
- animating text layout
- dense filter stacks
- tiny text that only looks good at desktop size

## Path Draw

Use path draw only when it explains a relationship:

```css
.path {
  stroke-dasharray: var(--path-length);
  stroke-dashoffset: var(--path-length);
  animation: draw 640ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}
```

For Remotion, prefer computing this from frame progress rather than relying on
CSS animation time.

## HTML/CSS

Use transforms and opacity:

```css
.card {
  transform: translate3d(0, var(--motion-y), 0) scale(var(--motion-scale));
  opacity: var(--motion-opacity);
  will-change: transform, opacity;
}
```

Blocked unless justified:

- `top`
- `left`
- `right`
- `bottom`
- width or height
- margin animation
- grid/flex layout animation
- heavy animated `filter`
- large animated `box-shadow`
- animated radial or linear gradients

## CSS In Remotion

CSS is fine for static style, layout, typography, and variables. CSS
animations are not the preferred timing mechanism for Remotion renders
because rendered frames may be captured out of order or in multiple tabs.

If the asset will be embedded into Remotion:

- expose motion as CSS custom properties
- compute those properties from `frame`
- keep keyframes only for standalone browser previews
- port final timing to Remotion `interpolate()` or `spring()`

Example handoff:

```tsx
const progress = interpolate(frame, [0, 18], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});

<div
  className="card"
  style={
    {
      '--motion-y': `${(1 - progress) * 48}px`,
      '--motion-opacity': progress,
    } as React.CSSProperties
  }
/>;
```

## Kinetic Typography

- One moving headline per beat.
- Keep body copy stable.
- Use active word pop or highlight, not entire paragraph movement.
- Never animate captions and background text with competing rhythms.
- Let text settle before the viewer must read a new clause.
- Keep punctuation, line breaks, and emphasis stable during hold frames.

## Motion Recipes

Use these before inventing more effects:

- `card-rise`: translateY `32-72px` to `0`, opacity `0` to `1`, settle
  within `12-18` frames.
- `chip-stagger`: each chip enters `2-4` frames after the previous chip.
- `path-draw`: stroke dash reveal over `12-28` frames, then label fade.
- `number-pop`: scale `0.92 -> 1.06 -> 1`, hold for readability.
- `scene-reset`: quick wipe or hard cut between card states; do not
  crossfade dense text over dense text.
- `cta-pulse`: one pulse only, after narration reaches the call to action.

## Responsive Safety

For vertical shorts:

- design at `1080x1920`
- keep important text inside `x=96..984`
- keep captions and primary text away from lower platform UI
- test at phone-preview size
- avoid text below `y=1540` unless it is intentionally outside the main
  reading path

## Export Safety

If SVG/HTML becomes a rendered video asset:

- make fonts explicit
- bundle images locally
- avoid network resources at render time
- verify transparent backgrounds intentionally
- record source and license for imported graphics
- export representative frame samples, not only the source file
