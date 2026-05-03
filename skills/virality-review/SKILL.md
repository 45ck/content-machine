---
name: virality-review
description: Review a short before or after production using quality gates for hook, retention, clarity, payoff, risk, and platform fit without promising guaranteed virality.
---

# Virality Review

## Use When

- The user wants an editorial preflight before scripting, rendering, or
  publishing a short.
- A finished draft needs a go/no-go review focused on viewer pull,
  retention, clarity, payoff, risk, and platform fit.
- The agent needs a generic Content Machine rubric that can reuse local
  research without depending on one product, niche, or campaign.

## Core Rule

Treat virality as a set of quality gates, not an outcome promise.

This skill can identify friction, missed opportunities, and revision
paths. It must not guarantee views, reach, conversion, or algorithmic
performance.

## Core Approach

1. Define the target viewer, platform, archetype, and intended action.
2. Use local repo knowledge before generic advice:
   [`short-form-archetype-research`](../short-form-archetype-research/SKILL.md)
   for archetype gates,
   [`short-form-production-playbook`](../short-form-production-playbook/SKILL.md)
   for editorial craft,
   [`style-profile-library`](../style-profile-library/SKILL.md) for local
   caption/pacing rules,
   [`reverse-engineer-winner`](../reverse-engineer-winner/SKILL.md) for
   reference breakdowns, and
   [`publish-prep-review`](../publish-prep-review/SKILL.md) for final
   rendered readiness.
3. Score the short across six gates:
   `hook`, `retention`, `clarity`, `payoff`, `risk`, and `platform_fit`.
4. Separate blocking failures from optimization notes.
5. Recommend concrete revisions that preserve the chosen archetype.

## Review Gates

- `hook`: The first beat creates immediate context, curiosity, stakes, or
  visual contrast within the opening second.
- `retention`: The edit keeps adding information, tension, pattern
  changes, or useful escalation without dead air.
- `clarity`: The viewer can understand the premise, subject, and next
  beat on a phone without rereading.
- `payoff`: The short resolves the promise with a reveal, result, lesson,
  emotional turn, or clear call to action.
- `risk`: The draft avoids misleading claims, rights gaps, unsafe advice,
  brand mismatch, platform policy issues, and unwanted controversy.
- `platform_fit`: Duration, aspect ratio, safe zones, captions, pacing,
  native visual language, and packaging fit the selected platform.

## Inputs

- script, outline, storyboard, `visuals.json`, render notes, or final MP4
- target platform such as TikTok, Instagram Reels, or YouTube Shorts
- optional niche, viewer, style profile, archetype, reference breakdown,
  and publish constraints

## Outputs

- gate scores with pass, caution, or fail status
- top blocking issues
- specific rewrite, edit, caption, visual, pacing, or packaging fixes
- a recommendation: `proceed`, `revise`, `reroute`, or `reject`

## Output Contract

Return a compact review object or markdown summary with:

- `context`: platform, archetype, viewer, and artifact reviewed
- `overall`: `proceed`, `revise`, `reroute`, or `reject`
- `scores`: six gate scores from `1` to `5`
- `blockers`: issues that must be fixed before production or publish
- `improvements`: high-leverage non-blocking changes
- `next_steps`: the smallest concrete changes to make next

## Pre-Production Checklist

- The hook can be understood from the first frame and first spoken line.
- The script has one promise, one core idea, and one payoff.
- Every beat either escalates, clarifies, proves, or resolves.
- The visual plan leaves room for captions and platform chrome.
- The planned archetype matches the target viewer and source assets.
- Risky claims, source rights, or sensitive topics have a review path.

## Post-Production Checklist

- The rendered first `1s` to `3s` contains the real hook, not filler.
- Captions are readable, synchronized, and native to the format.
- Visual rhythm supports the spoken rhythm without random noise.
- The payoff arrives before viewer patience runs out.
- Packaging copy, thumbnail/frame choice, and CTA match the content.
- Any final publish decision can be handed to
  [`publish-prep-review`](../publish-prep-review/SKILL.md) for technical
  and provenance validation.

## Non-Goals

- Do not guarantee virality or algorithmic reach.
- Do not approve a weak short only because it follows a trend.
- Do not replace final render validation, rights review, or platform
  policy review.
- Do not copy a winning reference; extract transferable structure.
