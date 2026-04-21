# TRIBE v2 Feature Extractor

## Purpose

Use TRIBE v2 as a **pre-publish neural-response feature generator**, not as a direct virality oracle.

TRIBE-derived features may improve:

```text
hook prediction
retention prediction
shareability prediction
cognitive-load detection
cross-modal alignment diagnosis
```

## Input

```text
video clip
audio
transcript / text
```

## Raw output

TRIBE outputs predicted brain responses across time and cortical vertices. Raw vertex data is too high-dimensional for small creator datasets.

## Required compression

Convert raw output into:

```text
ROI summaries
time-window statistics
event-aligned features
cross-modal alignment features
```

## Suggested time windows

```text
Hook:            0–3s
Commitment:      3–8s
Development:     8–20s
Payoff:          final 20%
Loop:            final 3s vs first 3s
```

## Suggested features

```text
HookPeak
HookSlope
ResponseDecay
ResponseVolatility
VisualROI
AuditoryROI
LanguageROI
SocialROI
AttentionROI
ValueROI
CrossModalAlignment
CognitiveLoadProxy
```

## Integration

Feed TRIBE features into:

```text
ScrollStopModel
RetentionModel
ShareabilityModel
NegativeRiskModel
FinalScoreModel
```

## Validation rule

TRIBE must provide incremental lift:

```text
metadata + multimodal embeddings + TRIBE
>
metadata + multimodal embeddings
```

If not, remove it.
