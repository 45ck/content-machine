# **Key Decisions**

## **Decision 1 — Audio is a behavioural intervention**

We stopped treating audio as decoration and modelled it as a timed intervention that affects viewer survival, emotion, memory, replay, and sharing.

## **Decision 2 — Optimize outcomes, not aesthetics**

The system optimizes measurable outputs:

```text
retention
completion
replay
share
save
comment
follow
sound reuse
brand memory
```

## **Decision 3 — Use format-specific audio strategies**

No single audio strategy is globally optimal. The model is conditioned by format:

```text
educational → clarity/save/completion
meme → share/replay/comment
demo → foley/sensory/completion
montage → rhythm/reveal/loop
brand series → recognition/repetition
```

## **Decision 4 — Separate prediction from causality**

Correlation between audio and performance is insufficient. The system requires variant tests and uplift modelling.

## **Decision 5 — Risk is part of the objective**

The system does not maximize virality alone. It subtracts rights, consent, disclosure, platform, and brand risk.

## **Decision 6 — Build an audio asset bank**

Winning audio patterns should become reusable assets with metadata, features, risks, and historical lift.

## **Decision 7 — Start with interpretable models**

The practical sequence is:

```text
manual scoring → feature extraction → XGBoost/LightGBM → uplift → bandits → multimodal neural model
```
