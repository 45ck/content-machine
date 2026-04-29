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

## Kinetic Typography

- One moving headline per beat.
- Keep body copy stable.
- Use active word pop or highlight, not entire paragraph movement.
- Never animate captions and background text with competing rhythms.

## Responsive Safety

For vertical shorts:

- design at `1080x1920`
- keep important text inside `x=96..984`
- keep captions and primary text away from lower platform UI
- test at phone-preview size

## Export Safety

If SVG/HTML becomes a rendered video asset:

- make fonts explicit
- bundle images locally
- avoid network resources at render time
- verify transparent backgrounds intentionally
- record source and license for imported graphics
