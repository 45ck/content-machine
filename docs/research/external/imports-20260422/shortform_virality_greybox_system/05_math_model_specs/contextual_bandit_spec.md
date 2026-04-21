# Contextual Bandit Specification

## Arm definition

An arm can be:

```text
hook variant
topic angle
editing style
content format
posting slot
platform-specific version
```

## Context

```text
creator
platform
topic
audience cluster
trend state
draft features
subscores
```

## Reward

```text
Reward =
0.30·RetentionLift
+ 0.25·ShareLift
+ 0.20·SaveLift
+ 0.10·FollowLift
+ 0.10·NonFollowerReachLift
- 0.15·NegativeLift
```

## UCB policy

```text
score_arm =
predicted_reward
+ c · uncertainty
```

## Thompson policy

```text
sample reward from posterior for each arm
choose arm with max sampled reward
```

## Guardrails

Never explore when:

```text
EligibilityScore < threshold
NegativeRisk > threshold
AudienceFit < minimum
```

## Evaluation

```text
cumulative regret
average reward per test
top-decile hit rate
variant win rate
learning speed
```
