# Visual Assembly

Use this when the question is how the short should look and move once
you have a script or clip candidate.

## Source Footage Rules

- Prefer caption-clean footage and assets.
- Treat published shorts as references, not raw source.
- Reject clips with persistent burned-in text unless that text is the
  subject of the short.
- Vary scene type, scale, and motion. A sequence of near-identical shots
  reads as lazy even if the cuts are technically fast.

## Frame Design

- Build for `1080x1920`.
- Keep important information inside a conservative centered safe zone.
- Leave the bottom area clear enough for platform chrome and captions.
- Put large hook text in the upper half unless the composition clearly
  supports centered impact text.

## Shot Variety

Aim for contrast across consecutive beats:

- wide -> medium -> detail
- static -> motion -> static
- footage -> graphic -> footage
- proof/result -> explanation -> payoff

If every scene uses the same motion language, the short feels flat even
when the subject changes.

## Remotion / FFmpeg Split

Use Remotion when:

- captions are a design system, not a plain subtitle burn-in
- overlays, layout, and timing need code-level control
- you need reliable composition logic and reusable patterns

Use FFmpeg directly when:

- you are trimming, concatenating, reframing, speed-ramping, or mixing
  assets quickly
- the change is mechanical and not design-heavy
- you need cheap iteration before a final Remotion pass

Strong workflow:

1. Use FFmpeg-class operations for prep and cleanup.
2. Use Remotion for the final editorial composition layer.
3. Review the MP4, not just the data.

## Caption-Aware Visuals

- Never force dense captions onto equally dense footage.
- Keep faces, UI, and high-value motion away from the caption lane.
- If the active word needs bright highlight treatment, calm the
  background behind it.
- If the visual relies on bottom-screen detail, move captions or change
  the shot.

## Audio Layering

- Voice starts immediately.
- Music supports energy but should not compete with speech.
- Use transitions and stingers sparingly; they should separate beats,
  not announce every cut.
- Silence is allowed only when it creates tension or clarity.

## Render Hygiene

- Check the actual phone-sized frame.
- Reject flicker, freeze, empty frames, weak contrast, or unreadable
  text.
- If a placeholder asset sneaks in, fail the run.

## Aggregated From

- `calesthio/OpenMontage`
- `DojoCodingLabs/remotion-superpowers`
- `imgly/videoclipper`
- `iDoust/youtube-clip`
- `eddieoz/reels-clips-automator`
- this repo's `src/render/*`, `src/score/source-text-guard.ts`, and
  `src/render/captions/*`
