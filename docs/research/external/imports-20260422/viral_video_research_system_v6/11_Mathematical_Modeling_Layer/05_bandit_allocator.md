# Bandit allocator

## Purpose

Allocate limited production and distribution effort between exploration and exploitation.

## Arms

An arm can be:

```text
first-frame type
hook type
story format
CTA type
platform surface
content form
niche topic
```

## Reward

Use the utility score:

```text
reward_v = U_v
```

or a primary metric:

```text
reward_v = CTV for first-frame tests
reward_v = APV/CPL for retention tests
reward_v = SAV for checklist tests
reward_v = SND for identity/send tests
reward_v = FOL for series tests
```

## Thompson sampling for binary metrics

For each arm `k`:

```text
θ_k ~ Beta(α_k, β_k)
```

After observing successes `x` and failures `n-x`:

```text
α_k ← α_k + x
β_k ← β_k + n - x
```

To choose the next arm:

```text
sample θ̃_k from each posterior
choose arm with max θ̃_k
```

## Creative allocation rule

Each weekly batch:

```text
60% exploitation = proven mechanisms
30% structured exploration = promising variants
10% wildcards = new forms/platform grammar
```

## Guardrails

Bandits can over-optimise short-term reward. Add constraints:

```text
Do not allocate to arms with trust failure.
Do not allocate to arms with high CTV but collapsing completion.
Do not allocate all capacity to one platform.
Reserve minimum exploration budget.
```

## Use cases

```text
First-frame bandit:
arms = before/after, face, result-first, proof screenshot, visible mistake
reward = CTV + EHR guardrail

CTA bandit:
arms = save, send, comment, follow, no CTA
reward = selected action rate + follow guardrail

Format bandit:
arms = teardown, checklist, myth-bust, tutorial, challenge
reward = U_v
```
