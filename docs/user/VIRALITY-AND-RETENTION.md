# Virality And Retention

Content Machine treats virality as an editorial and learning system, not
as a guarantee. The goal is to make better shorts by checking hooks,
retention, platform fit, packaging, and real outcomes before repeating a
format.

## Skill Sequence

Use this order when a short needs serious social-native review:

1. [`short-form-archetype-research`](../../skills/short-form-archetype-research/SKILL.md)
   chooses the right format and quality gates.
2. [`hook-packaging`](../../skills/hook-packaging/SKILL.md) generates
   hook, title, cover, opening-frame, and metadata variants.
3. [`short-form-production-playbook`](../../skills/short-form-production-playbook/SKILL.md)
   keeps the script, visuals, captions, and review loop editorially
   coherent.
4. [`virality-review`](../../skills/virality-review/SKILL.md) checks
   hook, retention, clarity, payoff, risk, and platform fit.
5. [`retention-pass`](../../skills/retention-pass/SKILL.md) catches
   dead air, weak first frames, repetitive visuals, caption overload, and
   payoff problems.
6. [`platform-packaging`](../../skills/platform-packaging/SKILL.md)
   prepares platform-specific titles, descriptions, hashtags, CTAs,
   disclosures, and upload checklists.
7. [`publish-prep-review`](../../skills/publish-prep-review/SKILL.md)
   remains the final rendered-video readiness gate.
8. [`metrics-feedback-loop`](../../skills/metrics-feedback-loop/SKILL.md)
   turns publish receipts and performance metrics into style-profile or
   niche-profile updates.

## Rules

- Do not promise guaranteed views, reach, conversions, or algorithmic
  performance.
- Treat reference winners as structure to learn from, not footage to
  copy into a new render.
- Keep packaging truthful to the script and source evidence.
- Optimize for retention, saves, shares, qualified comments, follows,
  clicks, or conversions instead of raw views alone.
- Preserve artifacts so another agent can see why a hook, platform
  package, or style-profile update was chosen.

## Minimal Artifacts

For a serious production run, expect:

- `packaging-variants.v1.json`
- `virality-review.v1.json` or a compact equivalent review note
- `retention-pass.v1.json` or scene/timestamp-specific retention notes
- `platform_packaging.json`
- `publish-prep/`
- `metrics-feedback.v1.json` after the short has real performance data

## Practical Prompt

```text
Use Content Machine's virality and retention workflow on this short.
Choose the archetype, generate hook/title/cover variants, review the
script or render for hook and retention problems, prepare platform
packaging, and do not call it publish-ready until publish-prep passes.
After publishing metrics exist, turn the result into repeat/kill/test
learning for the relevant style or niche profile.
```
