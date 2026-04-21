# Frequency, Fatigue, and Wearout Model

## Purpose

A creative can become less effective as the same audience sees it repeatedly.

## Simple model

```text
response_t = base_response × exp(-δ × max(0, frequency_t − f0))
```

Where:

```text
δ = fatigue decay
f0 = safe frequency threshold
```

## Alternative logistic model

```text
logit(p_response) = β0 + β1 relevance − β2 frequency + β3 novelty
```

## Refresh rule

Refresh creative when any two are true:

```text
CTR down > 25% from rolling baseline
CPC up > 25% from rolling baseline
frequency above threshold
conversion rate stable or falling
comments/sentiment worsening
```

## Agent output

```text
fatigue_state = fresh | warming | fatigued | burned
recommended_action = keep | rotate | refresh | retire
```
