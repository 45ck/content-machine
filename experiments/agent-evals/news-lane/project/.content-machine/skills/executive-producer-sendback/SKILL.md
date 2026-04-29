---
name: executive-producer-sendback
description: Orchestrate a multi-stage short-video run as a stateful review loop that can pass, revise, or send work back to an earlier stage when downstream reality invalidates upstream decisions.
---

# Executive Producer Sendback

## Use When

- A short is being made through several stages and quality keeps failing
  at the handoffs.
- The run needs one stateful reviewer rather than blind stage chaining.
- A downstream discovery can invalidate upstream work:
  duration, style drift, missing assets, bad sync, or budget pressure.

## Core Rule

- Treat the pipeline as a gated review loop, not a conveyor belt.
- If later evidence proves an earlier decision wrong, send the work
  back instead of patching around the mistake.

## Inputs

- ordered stage list
- stage artifacts and review criteria
- cumulative state:
  budget, duration target, revision counts, style anchors, prior issues

## Outputs

- per-stage gate decision:
  `pass`, `revise`, or `send_back`
- updated cumulative state
- issue log with explicit reason for every send-back or forced pass

## Workflow

1. Carry one cumulative state object through the whole run.
2. After each stage, review both the new artifact and its fit with prior
   stages.
3. Pass clean work forward.
4. Revise a stage when the fix is local to that stage.
5. Send work back to an earlier stage when the new evidence breaks an
   upstream assumption.

## Good Send-Back Cases

- narration comes back materially longer than the planned scene
- asset generation reveals the scene plan is infeasible
- final sync check shows narration is riding over the wrong visuals
- style consistency fails because earlier scene planning was too loose

## Guardrails

- cap revision attempts so the run cannot loop forever
- record what triggered the send-back
- invalidate downstream artifacts that depended on the bad upstream
  decision
- do not "pass with vibes" just to keep the pipeline moving

## Bad Pattern

- letting every stage succeed independently while the finished short is
  obviously off
- fixing duration overruns only in the final edit
- hiding upstream planning mistakes inside last-minute compose tweaks
- losing the audit trail of why a stage was rerun

## Pair With

- Use with [`timing-sync`](../timing-sync/SKILL.md),
  [`scene-pacing-verifier`](../scene-pacing-verifier/SKILL.md), and
  [`publish-prep-review`](../publish-prep-review/SKILL.md) as concrete
  gate surfaces.
- Use with [`retry-with-cache`](../retry-with-cache/SKILL.md) when
  reruns should preserve still-valid generated assets.

## Aggregated From

- `calesthio/OpenMontage` explainer executive-producer workflow
- `calesthio/OpenMontage` `lib/checkpoint.py`

## Validation Checklist

- Every gate decision has a concrete reason.
- Send-backs target the earliest stage that can really fix the issue.
- Downstream artifacts are invalidated when upstream assumptions change.
- Revision caps and issue logs prevent infinite hidden loops.
