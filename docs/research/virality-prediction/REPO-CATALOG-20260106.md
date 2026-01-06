# Repo Catalog: Engagement / Popularity / Virality Prediction

**Date:** 2026-01-06  
**Goal:** Summarize each vendored repo and identify how it could inform (or be safely quarantined from) `content-machine`.

---

## How to Read This Catalog

For each repo:

- **What it is:** task framing and modality assumptions.
- **What it provides:** code, dataset links, baselines, tooling.
- **Integration into content-machine:**
  - Production-safe: ideas that become **proxy scoring** or quality gates.
  - Research-only: dataset-bound models and training pipelines.
- **Cost & risk:** dependencies, compute, licensing/dataset constraints.

The authoritative integration plan is:

- `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`

---

## Adjacent repos already present (short-video engagement prediction)

### AMPS

- **Path:** `vendor/engagement-prediction/amps`
- **What it is:** PyTorch implementation of “Predicting Popularity of Short-Form Videos Using Multi-Modal Attention Mechanisms”.
- **What it provides:** a short-video-specific modeling framing and dataset acquisition via YouTube API (metadata via Google Drive link in README).
- **Integration:** primarily conceptual for proxy scoring (attention over modalities; content vs channel effects), plus dataset framing for future evals.

### MMVED / MMRA / SnapUGC

- **Paths:**
  - `vendor/engagement-prediction/mmved`
  - `vendor/engagement-prediction/mmra`
  - `vendor/engagement-prediction/snapugc`
- **Integration:** anchors for “adjacent” short-video engagement research; keep as research references unless a clean, content-only inference path emerges.

---

## Short-video / micro-video popularity + engagement prediction

### HMMVED (Micro-video Popularity Prediction via Multimodal Variational Information Bottleneck)

- **Path:** `vendor/research/virality-prediction/HMMVED`
- **Stack:** TensorFlow 1.13 + TensorFlow Probability; Python 3.6-era.
- **Task:** micro-video popularity regression (NUS) + popularity sequence prediction (Xigua).
- **Notable assets:** describes released Xigua features (`resnet50.npy`, `audiovgg.npy`, NLP features, user/social features) and time-aligned targets.
- **Integration into content-machine:**
  - **Production-safe:** translate “early popularity matters” → enforce a strong first-3-seconds hook and beat cadence gate.
  - **Research-only:** baseline for multimodal fusion + temporal prediction when running offline experiments.
- **Risks:** legacy TF stack; external dataset downloads.

### TIML (Temporal Information-aware Multimodal Learning Network)

- **Path:** `vendor/research/virality-prediction/TIML`
- **Stack:** PyTorch; README lists CUDA/GPU environment assumptions.
- **Task:** UGV popularity prediction; provides a Google Drive dataset link.
- **Integration into content-machine:**
  - **Production-safe:** motivates representing “temporal information” explicitly in `script.json` (beat timeline) and scoring its cadence.
  - **Research-only:** model training and evaluation.

### SMTPD (Social Media Temporal Popularity Dataset)

- **Path:** `vendor/research/virality-prediction/SMTPD`
- **Task:** temporal prediction of popularity curves over ~30 days; multilingual multimodal samples; provides dataset download instructions.
- **Integration into content-machine:**
  - **Production-safe:** adopt the discipline of separating “pre-publish-known” vs “post-publish-only” features; add “time-series mindset” fields to `score.json`.
  - **Research-only:** baseline training/eval; dataset download.

### LMM-EVQA (EVQA-SnapUGC Winner; Engagement Prediction with Large Multimodal Models)

- **Path:** `vendor/research/virality-prediction/LMM-EVQA`
- **Task:** engagement prediction on SnapUGC using LMMs (VideoLLaMA2, Qwen2.5-VL).
- **Notable assets:** explicit “audio matters” finding (VideoLLaMA2 > Qwen2.5-VL).
- **Integration into content-machine:**
  - **Production-safe:** elevate `cm audio` pacing and alignment reliability as scoring dimensions (proxy for comprehension/retention).
  - **Research-only:** LMM stack and dataset downloads are heavy; keep quarantined.

---

## Retrieval-augmented popularity prediction

### SKAPP (Selective Retrieval Knowledge Augmentation; AAAI 2025)

- **Path:** `vendor/research/virality-prediction/skapp`
- **What it is:** selective retrieval + refiner + knowledge augmentation network.
- **Datasets referenced:** SMPD, ICIP, Instagram influencer dataset (links in README).
- **Integration into content-machine:**
  - **Production-safe:** retrieval patterns apply to:
    - exemplar memory for hooks, titles, beat plans
    - similarity/diversity gates across variants (avoid near-duplicates)
  - **Research-only:** full training/eval pipeline with dataset preprocessing.

### RAGTrans (Retrieval-Augmented Hypergraph for Multimodal Popularity Prediction)

- **Path:** `vendor/research/virality-prediction/RAGTrans`
- **Stack:** PyTorch + torch-geometric + sentence-transformers + Towhee.
- **Integration into content-machine:**
  - **Production-safe:** inspires graph-structured content neighborhoods; supports a future “retrieval + graph” scorer design.
  - **Research-only:** heavy dependencies and dataset reliance.

---

## Engagement-signal datasets (repurposable)

### KuaiRand

- **Path:** `vendor/research/virality-prediction/KuaiRand`
- **What it is:** unbiased sequential recommendation dataset with randomly exposed items; multi-signal feedback.
- **Integration into content-machine:**
  - **Production-safe:** informs how to define and normalize engagement metrics for post-publish ingestion and evaluation.
  - **Research-only:** dataset is large and external; not shipped.

### KuaiRec

- **Path:** `vendor/research/virality-prediction/KuaiRec`
- **What it is:** near-fully-observed user-item feedback matrix; includes watch-like signals (`play_duration`, `video_duration`, `play_progress`).
- **Integration into content-machine:**
  - **Production-safe:** maps to proxy scoring dimensions (pacing/caption fit as watch-ratio proxies).
  - **Research-only:** dataset download and offline evaluation.

---

## Propagation / cascade-based virality prediction

### DeepHawkes

- **Path:** `vendor/research/virality-prediction/DeepHawkes`
- **Task:** cascade popularity prediction; includes a Weibo dataset link and preprocessing steps.
- **Integration into content-machine:**
  - **Production-safe:** primarily conceptual (cascade ≠ watch-time engagement).
  - **Research-only:** does not map cleanly to generator-time scoring.

### CoupledGNN

- **Path:** `vendor/research/virality-prediction/CoupledGNN`
- **Task:** network-aware popularity prediction.
- **Integration:** research-only reference for future distribution modeling.

### PREP

- **Path:** `vendor/research/virality-prediction/PREP`
- **Task:** pretraining for popularity prediction across varying horizons.
- **Integration into content-machine:**
  - **Production-safe:** supports the idea of pretraining a general proxy scorer and specializing later.
  - **Research-only:** training pipeline and external datasets; older environment assumptions.

---

## General multimodal benchmarks

### SMPChallenge / SMPD

- **Path:** `vendor/research/virality-prediction/SMPChallenge`
- **What it is:** benchmark distribution + evaluation framing.
- **Integration into content-machine:**
  - **Production-safe:** borrow “leaderboard discipline” for internal evals (consistent metrics, splits, docs).
  - **Research-only:** dataset download.

### DTCN + TPIC2017

- **Paths:** `vendor/research/virality-prediction/DTCN_IJCAI`, `vendor/research/virality-prediction/TPIC2017`
- **What it is:** classic sequential popularity prediction and supporting dataset.
- **Integration into content-machine:**
  - **Production-safe:** time-bucket representations inspire scheduling metadata and beat-time normalization.
  - **Research-only:** legacy environment and dataset.

### PPCL

- **Path:** `vendor/research/virality-prediction/PPCL`
- **What it is:** CLIP feature extraction pipeline + contrastive learning framing.
- **Integration into content-machine:**
  - **Production-safe:** supports future “style embedding” for diversity and retrieval; pairs naturally with FAISS indexing research.
  - **Research-only:** model training pipeline and dataset dependencies.

---

## Lightweight / practical repos

### MultiPop

- **Path:** `vendor/research/virality-prediction/MultiPop`
- **What it is:** content-only multimodal popularity prediction for Instagram posts in a niche domain.
- **Integration into content-machine:**
  - **Production-safe:** aligns with our constraint (content-only). Use it to inspire proxy features and ablation thinking.
  - **Research-only:** full dataset access is by request; not portable by default.

### TikTok-Virality-Predictor

- **Path:** `vendor/research/virality-prediction/TikTok-Virality-Predictor`
- **What it is:** multimodal feature pipeline + Streamlit app; defines a weighted “virality” formula from views/likes/comments/shares.
- **Integration into content-machine:**
  - **Production-safe:** mine feature extraction patterns (audio extraction, transcription usage, image feature handling).
  - **Research-only:** avoid adopting the “virality formula” messaging; Kaggle dataset is dated and not representative.

### tiktok-engagement-analysis

- **Path:** `vendor/research/virality-prediction/tiktok-engagement-analysis`
- **What it is:** exploratory analysis and engagement-rate vocabulary.
- **Integration into content-machine:** helps define a future `metrics.json` schema for post-publish ingestion.

### Forecasting-TikTok-Trend-Engagement-Using-ML

- **Path:** `vendor/research/virality-prediction/Forecasting-TikTok-Trend-Engagement-Using-ML`
- **What it is:** forecasting engagement without “crystal ball features”.
- **Integration into content-machine:** reinforces feature hygiene (only use pre-publish-known inputs) and timing/trend framing.

