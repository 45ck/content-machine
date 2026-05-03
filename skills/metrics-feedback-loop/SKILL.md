---
name: metrics-feedback-loop
description: Turn publish receipts and performance metrics into reusable style-profile or niche-profile updates that say what to repeat, kill, or test next.
allowedTools:
  - read
  - write
model: inherit
argumentHint: '{"receiptsPath":"output/content-machine/publish-prep/publish.json","metricsPath":"output/content-machine/performance/short-001.json","styleProfilePath":"output/content-machine/library/style-profiles.v1.json","nicheProfilePath":"profiles/niche.json","outputPath":"output/content-machine/learning/metrics-feedback.v1.json"}'
inputs:
  - name: receiptsPath
    description: Publish receipt, publish metadata, or publish-prep review artifact.
    required: false
  - name: metricsPath
    description: Performance metrics export or manual metrics JSON.
    required: true
  - name: styleProfilePath
    description: Optional existing style profile to update or annotate.
    required: false
  - name: nicheProfilePath
    description: Optional existing niche profile to update or annotate.
    required: false
  - name: outputPath
    description: Path for the feedback artifact or proposed profile patch.
    required: false
outputs:
  - name: metrics-feedback.v1.json
    description: Evidence-backed learning summary with repeat, kill, and test-next decisions.
---

# Metrics Feedback Loop

Use this after a short has been published and enough performance evidence
exists to learn from the result. The skill converts receipts, readiness
review notes, and platform metrics into reusable updates for future
`style-profile-library` or `niche-profile-draft` runs.

## Use When

- A posted short has performance metrics and the user asks what to do
  differently next time.
- A channel wants reusable style or niche-profile learning instead of
  one-off postmortems.
- Publish receipts from
  [`publish-prep-review`](../publish-prep-review/SKILL.md) should be
  compared with actual outcomes.
- A winning short analyzed by
  [`reverse-engineer-winner`](../reverse-engineer-winner/SKILL.md)
  needs to become a repeatable hypothesis, not just inspiration.

## Core Rule

Optimize for meaningful outcomes over vanity metrics. Treat views,
likes, and impressions as context unless they connect to stronger
retention, completion, saves, shares, qualified comments, follows,
clicks, conversions, or audience fit.

## Inputs To Gather

- publish receipt or `publish.json`: title, description, platform,
  posting time, checklist, known risks, and packaging choices
- performance metrics: impressions, view rate, average watch time,
  retention curve, completion rate, rewatches, shares, saves, follows,
  comments, click-through, conversion, and audience segment if available
- source artifacts: script, caption style, visual plan, render defaults,
  style profile, niche profile, and reverse-engineered winner blueprint
- baseline: recent channel median or target benchmark for the same
  platform, niche, duration band, and format

## Workflow

1. Normalize metrics against the most relevant baseline before judging.
2. Separate distribution problems from creative problems: low
   impressions alone does not prove the hook or style failed.
3. Map each signal to a likely creative lever: hook, pacing, caption
   density, visual novelty, proof, payoff, packaging, CTA, or niche fit.
4. Produce three short decision lists: `repeat`, `kill`, and
   `testNext`.
5. Convert stable lessons into proposed `style-profile-library` updates:
   caption rules, pacing rules, render defaults, visual constraints, and
   reference notes.
6. Convert audience or topic lessons into proposed `niche-profile-draft`
   updates: hook patterns, tone rules, forbidden phrases, proof types,
   visual guidance, packaging angles, and thumbnail direction.
7. Keep weak evidence as a hypothesis. Do not overwrite profiles from a
   single noisy post unless the outcome is extreme or confirmed by
   repeated posts.

## Output Shape

Write or return a compact `metrics-feedback.v1.json` artifact:

```json
{
  "postId": "short-001",
  "verdict": "scale | iterate | pause | inconclusive",
  "meaningfulSignals": [],
  "vanitySignals": [],
  "repeat": [],
  "kill": [],
  "testNext": [],
  "styleProfilePatch": {},
  "nicheProfilePatch": {},
  "evidence": [],
  "confidence": "low | medium | high"
}
```

## Decision Guidance

- Repeat hooks, pacing, caption behavior, visual structures, and CTAs
  that beat the baseline on retention, completion, saves, shares,
  follows, clicks, or conversions.
- Kill elements that correlate with early drop-off, poor completion,
  confused comments, low saves, low shares, weak audience fit, or failed
  readiness risks already flagged by `publish-prep-review`.
- Test one or two variables at a time so the next result is learnable.
- Prefer profile patches that are specific enough to guide future
  prompts but generic enough to survive new topics and providers.
- Preserve provenance: cite the metric, baseline, artifact path, or
  reviewed winner that supports each decision.

## Pair With

- Run after
  [`publish-prep-review`](../publish-prep-review/SKILL.md) so readiness
  expectations can be compared with real performance.
- Send durable visual and caption lessons to
  [`style-profile-library`](../style-profile-library/SKILL.md).
- Send durable audience, hook, topic, and packaging lessons to
  [`niche-profile-draft`](../niche-profile-draft/SKILL.md).
- Use
  [`reverse-engineer-winner`](../reverse-engineer-winner/SKILL.md) when
  a high-performing post or competitor reference needs structural
  analysis before becoming a profile update.

## Constraints

- Do not store private audience data, account credentials, ad spend
  exports, or platform access tokens in profiles.
- Do not claim causation from one post without clear evidence.
- Do not blindly chase views if the audience, saves, shares, follows, or
  conversion quality is poor.
- Keep profile updates local, reviewable, and reversible.

## Validation Checklist

- Every repeat, kill, or test-next item cites a metric or artifact.
- Vanity metrics are separated from meaningful outcome signals.
- The recommended profile patch is scoped to style or niche behavior,
  not arbitrary project memory.
- Low-confidence lessons stay as tests instead of permanent rules.
- No provider-specific, private, or rights-sensitive data is stored.
