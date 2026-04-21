# AI Engineering System Architecture

## High-level architecture

```text
        Video Draft / Published Video
                    |
                    v
        Ingestion + Metadata Capture
                    |
                    v
        Feature Extraction Layer
        ├── Video frames / motion
        ├── Audio / music / speech
        ├── Transcript / captions / OCR
        ├── Creator history
        ├── Platform metrics
        ├── Trend signals
        └── TRIBE features
                    |
                    v
        Feature Store
                    |
                    v
        Specialist Signal Models
        ├── Eligibility
        ├── Scroll-stop
        ├── Retention
        ├── Intent
        ├── Shareability
        ├── Audience fit
        ├── Creator baseline
        ├── Trend/freshness
        ├── Saturation
        ├── Negative risk
        └── TRIBE response
                    |
                    v
        Stacked Final Scoring Model
        ├── Pre-publish VPS-P
        └── Live VPS-L
                    |
                    v
        Dashboard + API
                    |
                    v
        Experiment / Feedback Loop
```

## Deployment modes

### Batch mode

```text
score all drafts nightly
score all published videos at 15m/30m/1h/24h/72h
update dashboards
```

### Online mode

```text
creator uploads draft
extract features
score in near-real time
return edit recommendations
```

### Live mode

```text
ingest early metrics
update Bayesian wave posteriors
predict next expansion wave
trigger stall diagnosis
```

## Minimum stack

```text
Python
FastAPI
PostgreSQL
DuckDB or BigQuery
Object storage for videos/features
LightGBM/CatBoost/XGBoost
PyTorch for multimodal/sequence models
MLflow or Weights & Biases
Prefect/Airflow for pipelines
```

## Core design principle

Do not start with a single black-box model. Start with specialist models. Specialist models are easier to validate, interpret, and ablate.
