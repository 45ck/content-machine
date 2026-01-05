# Virality Prediction Tools & Models Research

**Research Date:** 2026-01-05  
**Status:** Active Research  
**Purpose:** Evaluate virality prediction options for content-machine pipeline  
**Sources:** ChatGPT Deep Research, Academic papers, GitHub projects

---

## Executive Summary

This document evaluates tools and models for predicting short-form video virality **before publication**. The goal is to integrate a scoring system into content-machine that can automatically filter or rank generated videos by their viral potential.

**Key Finding:** For an automated, cost-effective pipeline, **open-source models (especially MVP)** are the best choice. Commercial tools like Quso.ai offer polish but lack APIs for automation.

---

## Table of Contents

1. [Commercial Platforms](#1-commercial-platforms)
2. [Open-Source Models](#2-open-source-models)
3. [Academic Models](#3-academic-models)
4. [Vision-Language Model Approaches](#4-vision-language-model-approaches)
5. [Comparison Matrix](#5-comparison-matrix)
6. [Implementation Recommendation](#6-implementation-recommendation)
7. [Integration Architecture](#7-integration-architecture)

---

## 1. Commercial Platforms

### Quso.ai (formerly vidyo.ai)

**What it does:** Cloud service for analyzing short videos before posting. Upload MP4 → get Virality Score + optimization feedback.

| Aspect                     | Details                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------- |
| **Pricing**                | Freemium: ~75 min/month free (720p, watermark). Paid: $15-25/month for 300-1800 min |
| **API**                    | ❌ No public API. Web UI only                                                       |
| **Automation**             | Low. Must use web interface or browser automation                                   |
| **Scalability**            | Good for volume (4M+ users), but gated by plan limits                               |
| **Integration Difficulty** | Easy for manual use. Hard for pipelines (no API)                                    |

**Verdict:** Good for manual review, not suitable for automated pipelines.

### StreamLadder ClipGPT

**What it does:** AI module for streamers. Ingests Twitch VOD URLs → outputs clips with virality scores.

| Aspect                     | Details                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| **Pricing**                | Base plan ($8-20/mo) + ClipGPT add-on ($9-30/mo). Total: ~$20-50/month |
| **API**                    | ❌ No public API. Web UI only                                          |
| **Automation**             | High within platform. Low for external pipelines                       |
| **Scalability**            | Designed for long streams, not bulk short clips                        |
| **Integration Difficulty** | Very low for streamers. High for custom pipelines                      |

**Verdict:** Excellent for stream highlight extraction. Not ideal for scoring independent clips.

### BigMotion AI

**What it does:** AI video generation platform with virality prediction capabilities. Analyzes trends, keywords, and past performance.

| Aspect                     | Details                               |
| -------------------------- | ------------------------------------- |
| **Pricing**                | Enterprise SaaS (contact for pricing) |
| **API**                    | Possibly available (enterprise)       |
| **Automation**             | Potentially high if API available     |
| **Scalability**            | Enterprise-grade                      |
| **Integration Difficulty** | Medium (if API available)             |

**Verdict:** Worth exploring for enterprise use cases.

---

## 2. Open-Source Models

### TikTok Virality Predictor (GitHub)

**Repository:** `github.com/juanls1/TikTok-Virality-Predictor`

**What it does:** Deep learning model that takes TikTok videos (video + audio + text) and predicts virality score based on weighted engagement metrics (views, likes, comments, shares).

| Aspect                     | Details                                                |
| -------------------------- | ------------------------------------------------------ |
| **Pricing**                | Free (open-source)                                     |
| **API**                    | Build your own (full source code provided)             |
| **Automation**             | ✅ Fully scriptable. Batch processing supported        |
| **Scalability**            | Depends on your GPU resources                          |
| **Integration Difficulty** | Moderate. Requires Python/PyTorch setup, possibly CUDA |

**Technical Details:**

- Multi-modal: vision, audio, NLP
- Pre-trained models available via download link
- Streamlit web app included for manual use
- Can bypass GUI and call model directly

**Verdict:** Excellent for developers who want full control. Moderate setup effort.

### Tube Virality (YouTube)

**Repository:** `github.com/gpsyrou/tube-virality`

**What it does:** Collects YouTube trending data and builds ML models to estimate viral potential based on historical patterns.

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **License**    | MIT                                                                  |
| **Focus**      | YouTube videos (adaptable to Shorts)                                 |
| **Features**   | Trending data collection, virality pattern mining, ML classification |
| **Limitation** | Relies on posted video stats (not pre-publication)                   |

**Verdict:** Good for understanding virality patterns. Requires adaptation for pre-publication use.

### Content Virality Score Analyzer (AnotherWrapper)

**Repository:** AnotherWrapper no-code AI template

**What it does:** Uses GPT-4 Vision to analyze uploaded video and predict virality with textual suggestions.

| Aspect         | Details                                              |
| -------------- | ---------------------------------------------------- |
| **Pricing**    | Free code, but requires OpenAI API key (pay-per-use) |
| **Stack**      | Next.js, GPT-4 Vision                                |
| **Output**     | Virality score + improvement suggestions             |
| **Automation** | ✅ Can be fully automated via API calls              |

**Verdict:** Quick to set up. API costs scale with usage. Good for interpretable feedback.

---

## 3. Academic Models

### MVP: Multimodal Video Predictor (2025) ⭐ RECOMMENDED

**Paper:** "MVP: Winning Solution to SMP Challenge 2025 Video Track" (arxiv.org/abs/2507.00950)

**What it does:** Winning solution to 2025 Social Media Prediction Challenge. Combines deep video features (XCLIP) with metadata, then uses CatBoost regressor for prediction.

| Aspect                     | Details                                    |
| -------------------------- | ------------------------------------------ |
| **Pricing**                | Free (open-source, code available)         |
| **API**                    | Build your own                             |
| **Automation**             | ✅ Fully scriptable                        |
| **Accuracy**               | State-of-the-art (competition winner)      |
| **Integration Difficulty** | Moderate (requires XCLIP + CatBoost setup) |

**Technical Details:**

- Pre-trained XCLIP for video feature extraction
- CatBoost gradient boosting for prediction (very fast)
- Tested on 6,000 videos dataset
- Designed for <60s videos (perfect for Shorts/Reels/TikTok)

**Architecture:**

```
Video → XCLIP (frame features) →
Metadata → Feature engineering →
Combined features → CatBoost → Popularity Score
```

**Why it's best:**

1. Public code available
2. No training required (use pre-trained weights)
3. Proven accuracy (competition winner)
4. Fast inference (CatBoost is lightweight)
5. Designed for short-form content

**Verdict:** Best choice for automated pipelines. Battle-tested, efficient, and free.

### AMPS: Attention-based Multi-modal Popularity Predictor (2024)

**Paper:** "AMPS: Predicting popularity of short-form videos..." (Journal of Retailing and Consumer Services, 2024)

**What it does:** BiLSTM with self-attention and co-attention across video frames, audio, and text.

| Aspect                     | Details                                                     |
| -------------------------- | ----------------------------------------------------------- |
| **Pricing**                | Academic (may need to request code)                         |
| **Accuracy**               | Significantly outperformed baselines (F1, G-Mean, Accuracy) |
| **Complexity**             | High (full frame sequences, custom architecture)            |
| **Integration Difficulty** | High (complex deep learning setup)                          |

**Verdict:** Powerful but complex. Better for research than production pipelines.

### LLM-Based Popularity Prediction (2024-25)

**Paper:** "Large Language Models Are Natural Video Popularity Predictors" (ACL 2025 Findings)

**What it does:** Converts video to text descriptions via VLM, then prompts LLM to predict popularity.

| Aspect               | Details                                                       |
| -------------------- | ------------------------------------------------------------- |
| **Accuracy**         | ~82% classification accuracy (LLM alone), 85.5% with ensemble |
| **Interpretability** | ✅ High (LLM explains why video might trend)                  |
| **Cost**             | Per-call API fees (GPT-4)                                     |
| **Scalability**      | Moderate (API rate limits, costs)                             |

**Verdict:** Excellent for interpretable predictions. Higher cost at scale.

---

## 4. Vision-Language Model Approaches

### DIY VLM + LLM Pipeline

Build your own using open-source vision-language models:

**Stack Options:**

- **VLM:** LLaVA, BLIP-2, InternVL, Qwen-VL
- **LLM:** GPT-4, Claude, Llama, Mistral
- **Pipeline:** Video → frame sampling → VLM captioning → LLM scoring

**Pros:**

- Fully customizable
- Interpretable (can explain predictions)
- Can leverage latest models

**Cons:**

- High compute requirements
- Slower inference (seconds to tens of seconds per video)
- Requires ML engineering skills

**Cost Considerations:**

- Open models: Free (just compute)
- API models: ~$0.01-0.10 per video (varies by prompt length)

---

## 5. Comparison Matrix

| Tool/Model           | Cost      | API | Automation | Accuracy  | Setup Effort | Best For       |
| -------------------- | --------- | --- | ---------- | --------- | ------------ | -------------- |
| **Quso.ai**          | $15-25/mo | ❌  | Low        | Good      | Low          | Manual review  |
| **StreamLadder**     | $20-50/mo | ❌  | Low        | Good      | Low          | Stream clips   |
| **TikTok Predictor** | Free      | DIY | High       | Good      | Medium       | Full control   |
| **MVP** ⭐           | Free      | DIY | High       | **Best**  | Medium       | **Production** |
| **AMPS**             | Free      | DIY | Medium     | Excellent | High         | Research       |
| **LLM Approach**     | Per-call  | ✅  | High       | Good      | Medium       | Interpretable  |
| **VLM DIY**          | Compute   | DIY | High       | Variable  | High         | Custom needs   |

---

## 6. Implementation Recommendation

### For content-machine: Use MVP

**Why MVP is the best fit:**

1. **Free and open-source** — No recurring fees, no API limits
2. **Proven accuracy** — Competition-winning performance
3. **Designed for short-form** — Tested on <60s videos
4. **Scriptable** — Full code available for pipeline integration
5. **Efficient** — XCLIP extraction + fast CatBoost inference
6. **No training required** — Pre-trained weights available

### Proposed Pipeline Integration

```
content-machine pipeline:
┌─────────────┐   ┌───────────────┐   ┌─────────────┐
│ cm render   │ → │ MVP Predictor │ → │ Filter/Rank │
│ (video.mp4) │   │ (score 0-100) │   │ (threshold) │
└─────────────┘   └───────────────┘   └─────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ Publish only  │
                  │ score > 70    │
                  └───────────────┘
```

### Alternative: LLM Approach for Feedback

For **interpretable feedback** (not just scores), consider hybrid:

```
Video → MVP (fast score) →
If borderline (50-70): → GPT-4V (detailed feedback)
If high (>70): → Publish
If low (<50): → Discard
```

---

## 7. Integration Architecture

### MVP Integration Code Sketch

```typescript
// src/virality/predictor.ts

import { spawn } from 'child_process';

export interface ViralityResult {
  score: number; // 0-100
  confidence: number; // 0-1
  features: {
    visual: number;
    audio: number;
    metadata: number;
  };
}

export async function predictVirality(videoPath: string): Promise<ViralityResult> {
  // Call MVP Python model
  const result = await runMVPModel(videoPath);
  return {
    score: normalizeScore(result.rawScore),
    confidence: result.confidence,
    features: result.featureBreakdown,
  };
}

export function shouldPublish(result: ViralityResult, threshold = 70): boolean {
  return result.score >= threshold;
}
```

### CLI Integration

```bash
# Score a single video
cm score video.mp4
# Output: Virality Score: 78/100 ✓ Recommended for publishing

# Score and filter batch
cm score --batch ./outputs/ --threshold 70
# Output: 12/20 videos passed threshold

# Integrate with generate
cm generate "Redis vs PostgreSQL" --min-virality 70
# Only outputs if predicted score >= 70
```

### Future Enhancement: Feedback Loop

```typescript
// Track actual vs predicted performance
interface PerformanceData {
  videoId: string;
  predictedScore: number;
  actualEngagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

// Use to fine-tune model over time
function updateModel(data: PerformanceData[]): void {
  // Retrain CatBoost with real engagement data
}
```

---

## Source References

### Open-Source Projects

- TikTok Virality Predictor: `github.com/juanls1/TikTok-Virality-Predictor`
- Tube Virality: `github.com/gpsyrou/tube-virality`
- Content Virality Analyzer: `anotherwrapper.com`

### Academic Papers

- MVP (2025): `arxiv.org/abs/2507.00950`
- AMPS (2024): Journal of Retailing and Consumer Services
- LLM Prediction (2025): ACL Findings, `openreview.net/forum?id=iKsTtpzBtc`
- TikTok Virality Indicators (2022): `arxiv.org/abs/2111.02452`
- Multi-Modal Feature Ensemble (2024): `arxiv.org/abs/2501.01422`

### Commercial Platforms

- Quso.ai: `quso.ai/products/virality-score`
- StreamLadder: `streamladder.com/clipgpt-features/ai-virality-score`
- BigMotion: `bigmotion.ai`

---

## Appendix: Key Virality Factors (Research-Backed)

From academic studies, these factors correlate with virality:

### Visual Factors

- Close-up or medium camera shots
- On-screen text presence
- Certain POV styles
- High visual quality

### Content Factors

- Strong hook in first 3 seconds
- Pattern interrupts
- Emotional triggers
- Trend alignment (sounds, hashtags)

### Metadata Factors

- Creator follower count
- Posting time
- Hashtag selection
- Video duration (sweet spot varies by platform)

### Engagement Velocity

- Early likes/comments ratio
- Share rate
- Watch completion rate
- Loop/replay behavior

---

**Last Updated:** 2026-01-05  
**Next Steps:** Evaluate MVP model setup, prototype integration
