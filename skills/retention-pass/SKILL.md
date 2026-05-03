---
name: retention-pass
description: Review scripts, timelines, scene plans, or rendered shorts for retention and mobile pacing before final render approval or publish readiness.
---

# Retention Pass

## Use When

- A short is close to render, approval, or publish, but needs an
  editorial retention gate before shipping.
- The agent needs to review a script, timeline, scene plan, storyboard,
  caption plan, or rendered MP4 for pacing risks.
- Existing checks passed technically, but the edit may still lose
  viewers because the hook, rhythm, captions, or payoff are weak.

## What This Skill Checks

- first-frame clarity and visible stakes in the first `1s` to `3s`
- dead air, long holds, slow starts, and unsupported narration gaps
- visual turnover, beat density, and whether each scene changes enough
- caption density, safe-zone readability, and mobile skim value
- payoff strength, closure, and whether the ending resolves the hook
- repeated layouts, repeated shot grammar, repeated claims, or filler
- mobile-safe pacing across TikTok, Reels, Shorts, and similar feeds

## Core Approach

1. Review the asset as a viewer experience, not as a checklist of valid
   files.
2. Start with the first frame and first three seconds; fail if the topic,
   stakes, subject, or visual promise is unclear.
3. Walk the timeline beat by beat and flag any segment that asks the
   viewer to wait without new information, movement, or tension.
4. Compare narration density against visual turnover and caption load.
5. Check that the final beat delivers a payoff, reveal, proof point, or
   satisfying closure that matches the hook.
6. Route fixes to script cuts, scene rewrites, caption changes, visual
   variation, or render review instead of giving vague notes.

## Inputs

- script text or `script.json`
- scene plan, storyboard, visuals plan, or render timeline
- optional caption chunks, word timestamps, or caption sidecar
- optional rendered MP4 or contact sheet evidence
- target platform and target duration

## Outputs

- verdict: `pass`, `revise`, or `fail`
- retention risk level: `low`, `medium`, or `high`
- timestamped or scene-specific issues
- prioritized fixes with owners: `script`, `timeline`, `visuals`,
  `captions`, `audio`, or `render`
- final approval note explaining whether the short may proceed to render
  or publish-prep review

## Coordination

- Use [`scene-pacing-verifier`](../scene-pacing-verifier/SKILL.md) when
  narration cues, scene durations, or visual landmarks need precise
  alignment proof.
- Use [`scene-variation-check`](../scene-variation-check/SKILL.md) when
  the pre-render scene plan lacks shot variety, movement, texture, or a
  clear visual peak.
- Use [`slideshow-risk-review`](../slideshow-risk-review/SKILL.md) when
  the plan or render may be too static, decorative, text-heavy, or
  repetitive.
- Run before [`publish-prep-review`](../publish-prep-review/SKILL.md)
  so final technical readiness does not mask retention problems.

## Review Rules

- Fail closed on unclear first frames, dead air before the hook lands,
  unreadable captions, or an ending with no payoff.
- Do not require constant motion; require constant viewer value.
- Treat repeated media, repeated layouts, and repeated sentence shapes
  as pacing debt unless they intentionally build tension or clarity.
- Prefer cuts and rewrites over adding more decorative visuals.
- Keep notes actionable enough that the next agent can change one file,
  one scene, or one timestamp range.

## Validation Checklist

- The first `1s` to `3s` state what this short is about and why to keep
  watching.
- No beat holds longer than its information value supports.
- Captions are readable, scannable, and not fighting the primary visual.
- Visual changes support narration instead of merely decorating it.
- The ending pays off the hook or clearly completes the promise.
- The verdict tells the pipeline whether to revise, render, or proceed
  to publish-prep review.
