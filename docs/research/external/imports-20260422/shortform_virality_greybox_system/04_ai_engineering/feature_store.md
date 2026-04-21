# Feature Store Design

## Feature groups

### Video-content features

```text
frame_embeddings
clip/video embeddings
motion features
cut-rate features
scene-change features
face/object features
OCR features
caption timing features
```

### Audio features

```text
speech onset
music onset
audio energy curve
beat alignment
silence duration
clipping risk
Wav2Vec/audio embeddings
```

### Text features

```text
transcript embedding
caption embedding
hashtag embedding
hook-language score
topic taxonomy labels
LLM diagnostics
```

### Creator features

```text
historical median metrics
rolling EWMA metrics
creator momentum
format-specific baseline
policy/account health flags
```

### Audience features

```text
audience cluster embeddings
comment embeddings
historical winner clusters
follower/non-follower split
warm audience relationship features
```

### TRIBE features

```text
HookPeak
HookSlope
ResponseDecay
ResponseVolatility
VisualROI
AuditoryROI
LanguageROI
SocialROI
CrossModalAlignment
CognitiveLoadProxy
```

### Live features

```text
15m metrics
30m metrics
1h metrics
velocity
acceleration
Bayesian posterior parameters
wave probability
stall flags
```

## Storage recommendation

```text
Postgres: metadata, metrics, predictions
Object storage: videos, frames, audio, large embeddings
Feature store table: precomputed scalar features
Vector DB: embeddings and similarity search
```

## Feature versioning

Every feature row should include:

```text
feature_version
extraction_model_version
extracted_at
source_video_hash
```

No model should consume unversioned features.
