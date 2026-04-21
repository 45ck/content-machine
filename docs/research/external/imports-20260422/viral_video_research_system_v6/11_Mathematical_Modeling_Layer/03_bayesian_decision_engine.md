# Bayesian decision engine

## Goal

Make scale/kill decisions without pretending noisy metrics are certain.

## Inputs

```text
Variant A, B, C...
Primary metric m_primary
Secondary metrics m_secondary
Guardrails G
Minimum practical effect δ
Baseline B
```

## Posterior comparison

For each variant `v`, estimate:

```text
P(θ_v > θ_baseline + δ | data)
P(U_v > U_baseline + δ_U | data)
P(v is best among variants | data)
```

## Decision thresholds

```text
Scale:
P(U_v > U_baseline + δ_U) ≥ 0.85
and guardrails pass
and result has replication or enough exposure

Replicate:
0.65 ≤ P(U_v > U_baseline + δ_U) < 0.85
or one metric is strong but sample is small

Rewrite:
primary gate succeeds but downstream gate fails

Kill:
P(U_v > U_baseline + δ_U) < 0.35
or same mechanism fails 3 times
or trust guardrail fails
```

## Example

If the hypothesis is first-frame salience:

```text
Primary metric: CTV
Secondary: EHR, APV
Guardrails: no misleading first frame, no collapse in completion
Minimum effect: +5 percentage points CTV or +15% relative lift
```

Decision:

```text
Scale if CTV lift is probable and completion does not collapse.
Do not scale a first frame that earns starts but destroys trust/body retention.
```

## Why Bayesian

Bayesian updating gives usable answers for small, iterative content tests:

```text
How likely is this variant better?
How much uncertainty remains?
Which variant deserves the next exposure allocation?
```

This is more useful operationally than asking whether a p-value is below a fixed threshold after noisy, non-random organic exposure.
