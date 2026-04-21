# Signal Formulas

## Stop

```text
StopScore =
σ(
  w1·FirstFrameSalience
+ w2·EarlyMotion
+ w3·CaptionClarity
+ w4·SpeechOnset
+ w5·HookCuriosity
+ w6·TRIBE_HookActivation
- w7·VisualConfusion
- w8·DeadAirStart
)
```

## Retention

```text
RetentionScore =
a·ExpectedWatchSeconds
+ b·AveragePercentageViewed
+ c·CompletionRate
+ d·RewatchRate
+ e·EndRetention
```

## Intent

```text
IntentScore =
0.30·P(share)
+ 0.25·P(save)
+ 0.15·P(comment)
+ 0.15·P(follow)
+ 0.10·P(like)
+ 0.05·P(profile_visit)
```

## Shareability

```text
ShareabilityScore =
SocialCurrency
+ PracticalValue
+ IdentitySignal
+ Arousal
+ FriendTagPotential
- ConfusionPenalty
- TooNichePenalty
```

## Saveability

```text
SaveScore =
PracticalValue
+ StepClarity
+ ReferenceDensity
+ FutureUsefulness
- CognitiveLoad
```

## Audience fit

```text
AudienceFit =
cosine(VideoEmbedding, AudienceClusterEmbedding)
```

## Audience pool

```text
AudiencePool =
TopicDemand
× PlatformDemand
× CreatorAccess
× TrendBoost
× LanguageLocationFit
÷ CompetitionVolume
```

## Creator baseline lift

```text
MetricLift =
log((actual + ε) / (expected + ε))
```

## Trend freshness

```text
FreshnessScore =
TrendVelocity
× TrendRelevance
× CreatorFit
× PlatformFit
```

## Saturation

```text
SaturationPenalty =
RecentSimilarityDensity
× TrendAge
× CreatorRepetition
× CompetitionVolume
```

## Negative risk

```text
NegativeRisk =
0.35·P(skip)
+ 0.25·P(not_interested)
+ 0.20·P(report)
+ 0.10·P(dislike)
+ 0.10·P(hide)
```

## Exploration

```text
TestScore =
PredictedUtility
+ c·Uncertainty
+ NoveltyBonus
- NegativeRisk
```

## TRIBE

```text
TRIBEResponseScore =
f(
  HookPeak,
  HookSlope,
  ResponseDecay,
  ResponseVolatility,
  CrossModalAlignment,
  VisualROI,
  AuditoryROI,
  LanguageROI,
  SocialROI,
  CognitiveLoadProxy
)
```
