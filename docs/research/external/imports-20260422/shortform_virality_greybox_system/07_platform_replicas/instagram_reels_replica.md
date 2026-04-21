# Instagram Reels Grey-Box Replica

## Supported signal classes

Meta says its ranking systems combine many predictions, including predicted sharing. Instagram’s creator updates support originality and a smaller-audience-to-wider-audience expansion pattern.

## Most defensible equation

```text
IGReelsScore =
σ(
  1.25·Retention
+ 1.20·DMShareIntent
+ 0.95·SaveIntent
+ 0.75·Originality
+ 0.65·TopicFit
+ 0.50·CreatorTrust
- 1.20·NegativeRisk
- 0.90·RepostPenalty
- 0.60·Saturation
)
× Eligibility
```

## Important submodels

```text
Retention
DM shareability
Saveability
Originality / eligibility
Creator trust
Expansion wave
Saturation/fatigue
```

## Primary data to collect

```text
plays
reach
accounts reached
non-follower reach
watch time/APV if available
shares/sends
saves
comments
profile visits
follows
originality/repost flags
```

## Validation

```text
Retention + sends + saves + originality
should predict non-follower expansion better than likes.
```
