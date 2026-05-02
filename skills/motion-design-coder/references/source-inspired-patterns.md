# Source-Inspired Motion Patterns

Use this when adapting animation/component-library or creative-coding
research into deterministic Remotion, SVG, HTML, CSS, React, or Canvas
motion.

## UI Motion Motifs

Adapt component-site patterns into short-form primitives:

- `HookCard`: first-beat card that enters quickly, settles, then holds.
- `FlipWordHeadline`: one word changes while the sentence stays stable.
- `ShimmerStat`: statistic, metric, or proof chip with a short shimmer.
- `SpotlightCallout`: radial light or mask behind the proof object.
- `AuroraBackdrop`: low-contrast animated gradient behind static copy.
- `DiagramDrawOn`: path, arrow, or connector revealed with narration.
- `MarqueeProofStrip`: social proof/logos/comments moving slowly enough
  to stay background.
- `BentoBeatCard`: segmented proof layout for SaaS/product shorts.
- `PointerHighlight`: cursor, tap, ring, or arrow that directs attention.
- `BeforeAfterTabs`: two-state comparison with explicit hold states.

## Remotion Translation Rules

- Convert `initial`, `animate`, `exit`, layout morphs, and springs to
  frame windows using `Sequence`, `interpolate`, and `spring`.
- Convert hover, drag, scroll, and viewport triggers to scripted beats.
- Use component libraries as style references unless code license is
  verified for reuse.
- Avoid copying premium examples or paid template code into skills.
- Keep active captions still when cards, backgrounds, or diagrams move.

## Procedural Visual Motifs

- Flow fields for systems, data movement, attention, and invisible
  forces.
- Deterministic particles for scale, energy, transition glue, and
  abstract crowds.
- SDF rings, gauges, rounded boxes, and masks for living UI cards.
- fBm/domain-warp backgrounds for visual depth behind static text.
- Audio-reactive lines, bars, glows, or masks from precomputed
  waveform/FFT JSON.
- Pre-rendered reaction-diffusion textures for organic emergence, not
  live full-res CPU simulation.

## Performance Budget

- Prefer `30fps` and `1080x1920`.
- Cap SVG node count and particle count.
- Cache geometry and expensive fields.
- Clamp interpolation and shader loops.
- Avoid dense high-frequency detail, rapid full-screen flashing, and
  tiny low-contrast particles.
- Review first frame, highest-motion frame, caption-dense frame, and
  settled state at phone size.
