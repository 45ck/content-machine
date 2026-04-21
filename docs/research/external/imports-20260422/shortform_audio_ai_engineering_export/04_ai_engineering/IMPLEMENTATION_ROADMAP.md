# **Implementation Roadmap**

## **Phase 1 — Manual scoring and asset bank**

Build:

```text
audio asset bank
prompt templates
manual VAS score
risk logging
simple spreadsheet/dashboard
```

## **Phase 2 — Feature extraction**

Build:

```text
FFmpeg audio extraction
librosa acoustic features
speech-to-text transcript
basic speech metrics
schema/database
```

## **Phase 3 — Predictive baseline**

Train:

```text
logistic regression for retention thresholds
negative binomial for shares/saves/comments
XGBoost/LightGBM for reward prediction
```

## **Phase 4 — Controlled tests and uplift**

Build:

```text
variant framework
audio-lift calculation
matched tests
uplift model
```

## **Phase 5 — Candidate generation**

Build:

```text
TTS prompt compiler
music prompt compiler
SFX selector
mix variants
risk filter
candidate scorer
```

## **Phase 6 — Bandits and active learning**

Build:

```text
Thompson sampling
contextual bandit
uncertainty sampling
exploration policy
```

## **Phase 7 — Multimodal model**

Add:

```text
audio embeddings
visual embeddings
text embeddings
cross-modal alignment
retention curve prediction
```
