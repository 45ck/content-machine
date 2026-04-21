# AI model cards

## Retention forecaster

```text
Purpose: predict CTV/APV/CPL ranges.
Inputs: creative features, platform, form, length, prior metrics.
Outputs: predicted interval and risk flags.
Main risk: overconfidence on new formats.
Guardrail: conformal intervals and human review.
```

## Hook critic

```text
Purpose: score tension, specificity, accuracy.
Inputs: hook text + video brief.
Outputs: score, risk, rewrite.
Main risk: rewarding sensationalism.
Guardrail: trust critic overrides.
```

## Cognitive load critic

```text
Purpose: detect text/visual/audio overload.
Inputs: storyboard, transcript, frame screenshots.
Outputs: clutter/readability warnings.
Main risk: missing platform-native chaos that performs.
Guardrail: compare with actual metrics.
```

## Bandit allocator

```text
Purpose: allocate next batch effort.
Inputs: posterior estimates and guardrails.
Outputs: arm allocation.
Main risk: over-exploiting early noisy winners.
Guardrail: exploration floor and replication rule.
```
