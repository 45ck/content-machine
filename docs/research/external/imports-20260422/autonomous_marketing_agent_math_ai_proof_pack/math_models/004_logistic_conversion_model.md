# Logistic Conversion Model

## Purpose

Estimate conversion probability from buyer, creative, channel, and proof features.

## Model

```text
p_i = P(Y_i = 1 | x_i)
logit(p_i) = β0 + β1 x_{i1} + ... + βk x_{ik}
```

Where:

```text
logit(p) = log(p / (1 - p))
p = 1 / (1 + exp(-η))
```

## Useful features

```text
buyer_state
channel
search_intent_strength
creative_angle
offer_type
proof_type
landing_page_type
pricing_visibility
device
geo
time
frequency
competitor_context
```

## Hierarchical extension

When data is sparse by campaign:

```text
β_campaign ~ Normal(β_global, σ_campaign)
```

This lets campaigns borrow strength from similar campaigns.

## Use

Use when enough event-level data exists.

## Do not use

Do not use as causal proof by itself. It predicts response; it does not prove the ad caused response.

## Agent action

Use coefficients to generate hypotheses:

```text
If proof_type = demo has high positive coefficient, generate more demo-proof variants.
If frequency has negative coefficient after threshold, refresh or cap creative.
```
