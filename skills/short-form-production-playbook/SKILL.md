---
name: short-form-production-playbook
description: Plan, build, and fix short-form videos like an editor, using hook-first structure, caption-aware visual design, Remotion/FFmpeg assembly, and reject-regenerate review loops instead of one-shot automation.
---

# Short-Form Production Playbook

## Use When

- The user wants a short that feels edited on purpose, not merely
  assembled.
- You need to choose how the hook, script density, captions, visuals,
  pacing, audio mix, and review loop should work together.
- You are using `generate-short`, `video-render`, or
  `publish-prep-review` and need the craft rules that should drive those
  runtime steps.
- You need a portable playbook that a coding-agent CLI can import into a
  project without depending on a legacy control plane.

## Core Rule

The skill is the editor. Runtime scripts are support.

Do not start from flags, providers, or render options. Start from what
should make the viewer stop, understand, and finish.

Keep every phase artifact-driven where possible. Script, timestamps,
visual plan, render metadata, and review bundle should exist as files,
not hidden chat state.

## First Pass

1. Decide the promise of the short in one sentence.
2. Decide the hook in one visual beat and one spoken beat.
3. Decide whether the short is mainly:
   `explainer`, `proof/result`, `reaction`, `clip-and-comment`, or
   `story`.
4. Pick the caption family before building visuals.
5. Build visuals that leave room for captions and platform chrome.
6. Render.
7. Review.
8. Reject and regenerate if the edit feels weak, messy, repetitive, or
   unreadable.

## What Good Shorts Usually Need

- A hook that lands in frame 1 or within the first half-second.
- One idea, not three.
- Fast visual turnover without random noise.
- Captions that feel native to the platform and content type.
- Constant respect for mobile safe zones.
- Audio that starts immediately and stays intelligible over music.
- A real review loop instead of "the file rendered, ship it".
- Full-bleed vertical composition. If a source clip is boxed with black
  gutters, crop-fill or build a blurred/motion background; do not
  preserve gutters just because the clip is already `1080x960` or
  `1080x1920`.
- Native-feel opener. The first `1s` to `3s` should show the stakes as
  a clear visual hook, title card, receipt, face, or conflict overlay,
  not just a generic stock/gameplay frame.

## Read These References As Needed

- [editorial-patterns.md](references/editorial-patterns.md)
  Hook, structure, pacing, script density, segment selection.
- [visual-assembly.md](references/visual-assembly.md)
  Visual sourcing, shot variety, Remotion/FFmpeg assembly,
  caption-aware layout, audio layering.
- [review-loop.md](references/review-loop.md)
  Self-validation, rejection triggers, and regeneration choices.
- For caption styling details, use
  [`../short-form-captions/SKILL.md`](../short-form-captions/SKILL.md).

## Output Behavior

- If you are only advising, hand back a concrete editorial plan:
  hook, structure, caption family, visual plan, and validation focus.
- If you are executing, use the repo skills to produce files, but keep
  this playbook as the decision layer:
  `brief-to-script`, `script-to-audio`, `timestamps-to-visuals`,
  `video-render`, `publish-prep-review`.
- Prefer resumable phase artifacts over one giant prompt or one giant
  run log.

## Non-Goals

- Do not treat already-captioned published shorts as clean source
  footage.
- Do not rely on deterministic templates as a substitute for judgment.
- Do not call a short "good" because the codec, duration, and aspect
  ratio passed.

## Validation Checklist

- The hook is visible and understandable immediately.
- The script has one clear promise and a payoff.
- Captions match the content and remain readable on phone-sized frames.
- Visual changes support the spoken rhythm instead of fighting it.
- No source-text collision, muddy layout, or dead air slipped through.
- No black gutters, boxed media, or default template background slipped
  through unless the format intentionally uses them.
- The review step gives a real go/no-go result, and failure leads to a
  concrete reroute.
