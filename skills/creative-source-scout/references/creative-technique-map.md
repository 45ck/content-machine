# Creative Technique Map

Use this when a source site or provider has been found and the agent
needs to turn it into a Content Machine technique rather than a link
dump.

## Animation And UI Components

Use sources like `21st.dev`, Magic UI, Aceternity, React Bits, Motion
Primitives, Animata, shadcn/ui, and Motion for visual grammar.

Good short-form adaptations:

- `HookCard`: first-beat claim card with `180-320ms` entrance and a
  still readable hold.
- `FlipWordHeadline`: one changing word, not a full sentence shuffle.
- `ShimmerStat`: stat card with shimmer or counter motion that settles
  before narration needs reading.
- `SpotlightCallout`: radial/spotlight emphasis behind a product proof,
  receipt, or quote.
- `AuroraBackdrop`: slow masked gradient background behind static text.
- `DiagramDrawOn`: SVG path reveal tied to cause/effect narration.
- `MarqueeProofStrip`: logo/comment/result strip with low contrast and
  no active-caption collision.
- `BentoBeatCard`: `2x2` or `1+3` proof layout for product/demo shorts.
- `PointerHighlight`: cursor/tap/arrow cue for screen or UI explainers.

Port rules:

- Convert hover, drag, scroll, and presence interactions into scripted
  frame windows.
- Treat Motion/Framer patterns as recipes; implement Remotion output as
  `frame -> style`.
- Preserve source URL and license before copying code. If license is
  unclear, rebuild the pattern locally from first principles.

## 3D And Procedural Gameplay

Use Three.js, React Three Fiber, `@remotion/three`, Spline, Poly Haven,
ambientCG, Sketchfab, Mixamo, Kenney, Quaternius, and OpenGameArt for
gameplay-like loops, references, models, materials, and characters.

Good short-form adaptations:

- endless low-poly road or tunnel
- lane runner with orbiting coins or gates
- shader grid with smooth camera drift
- parallax terrain or city corridor
- loopable obstacle rhythm with no gameplay HUD text
- simple character silhouette or avatar running in the top third

Render rules:

- Prefer code-native loops before imported assets.
- In Remotion 3D, use `<ThreeCanvas>` with `useCurrentFrame()` and
  explicit `width` / `height`.
- Avoid React Three Fiber `useFrame()` in final Remotion renders unless
  translated to frame-derived props.
- Keep loops `6-12s`, `30fps`, `1080x1920`, seamless by modulo motion,
  and caption-clean.
- Record model, texture, animation, and environment licenses separately.

## AI Image And Video

Use Runway, Luma, Kling/fal, Pika via verified provider path, Krea,
Replicate, Hugging Face, ComfyUI, and provider-specific docs for
generated media.

Technique patterns:

- **First-frame discipline**: image-to-video starts from a strong,
  clean, caption-safe still.
- **Last-frame chaining**: extract the previous clip's last frame and
  seed the next scene when continuity matters.
- **Reference libraries**: tag character, object, style, and environment
  references instead of re-describing them loosely every prompt.
- **Multi-shot prompts**: use provider-native shot lists when available.
- **Async job ledger**: store provider, model, prompt, references,
  request id, status URL, result URL, cost, seed/settings, and output
  hash.
- **ComfyUI workflow record**: store workflow JSON plus generated media
  for reproducible local or open-model runs.

Reject prompts or inputs that rely on copyrighted characters, real-person
likenesses without rights, copyrighted music, unclear reference images,
or provider outputs with watermarks.

## Creative Coding And Generative Art

Use p5.js, Book of Shaders, Observable, CodePen, OpenProcessing,
Shadertoy-like references, Canvas, SVG, and GLSL as inspiration sources.

Code-native techniques:

- seeded p5-style blobs, terrain lines, jittered grids, and masks
- flow fields for systems, attention, invisible forces, and transitions
- deterministic particles with capped lifetimes and scripted attractors
- SDF cards for rings, blobs, gauges, masks, and living UI backgrounds
- fBm noise, domain warp, polar gradients, contour bands, and
  smoothstep masks
- precomputed reaction-diffusion textures for emergence or organic
  growth
- audio-reactive visuals driven by precomputed waveform or FFT JSON

Safety rules:

- Use `useCurrentFrame()`, seeded PRNG, fixed timestep, and cached
  geometry.
- Avoid `Math.random()`, wall-clock time, CSS clocks, live audio
  analysis during render, dense noise, strobing, and tiny particles.
- Review at phone size before shipping.

## Stock, Audio, Fonts, Icons

Use stock and asset sources only after the exact asset license is
checked.

Good defaults:

- Heroicons, Lucide, Google Fonts, and Fontsource for OSS-friendly UI
  primitives.
- Pexels, Unsplash, and Pixabay for broad stock search with source
  metadata stored.
- Freesound only when the exact asset license is `CC0` or compatible
  `CC BY`.
- Mixkit, Coverr, Videvo, Noun Project, OpenMoji, and similar sources
  only with per-asset license handling.

Always store source URL, author/provider, license URL, retrieval date,
hash, transforms, attribution text, and usage restrictions.
