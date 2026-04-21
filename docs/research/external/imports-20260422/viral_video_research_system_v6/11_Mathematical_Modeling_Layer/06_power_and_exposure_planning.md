# Power and exposure planning

## Problem

Organic tests often fail because there is not enough exposure to distinguish weak performance from random variation.

## Minimum viable exposure

For binary metrics, the approximate sample size per variant for detecting a difference between two proportions is:

```text
n ≈ 2 × p̄(1 - p̄) × (z_{1-α/2} + z_{1-β})² / Δ²
```

Where:

```text
p̄ = average expected rate
Δ = minimum detectable effect
α = false positive tolerance
β = false negative tolerance
```

## Practical creator rule

If sample size is small:

```text
Do not claim proof.
Treat as signal only.
Replicate before scaling.
```

## Exposure sources

Minimum exposure can be created through:

```text
organic platform distribution
Trial Reels
paid micro-seeding
owned audience
community posting
partner/collab distribution
email/newsletter
website embeds
```

## Exposure guarantee

You cannot guarantee organic reach, but you can guarantee a minimum test audience by using controlled distribution.

## Exposure tiers

```text
Tier 0: <100 views — unusable except catastrophic QC.
Tier 1: 100–500 views — weak directional signal.
Tier 2: 500–2,000 views — useful for first-frame/hook diagnosis.
Tier 3: 2,000–10,000 views — useful for metric comparison.
Tier 4: 10,000+ views — stronger decision confidence.
```

## Controlled exposure protocol

```text
1. Publish platform-native variant.
2. Let organic early test run.
3. If exposure below threshold, route to controlled channel.
4. Compare only variants with similar exposure contexts.
5. Record distribution source as a covariate.
```
