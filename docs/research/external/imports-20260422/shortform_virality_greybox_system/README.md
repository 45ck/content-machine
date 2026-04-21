# Short-Form Virality Grey-Box Scoring System

This repository packages the research thesis, mathematical models, signal-by-signal AI engineering plan, validation protocols, and implementation skeleton for a **short-form content scoring system**.

The goal is to approximate the signal families used by TikTok, Instagram Reels, and YouTube Shorts:

```text
Predicted Reach
≈
Eligibility
× Predicted Viewer Utility
× Audience Fit
× Creator Baseline
× Trend/Freshness
× Expansion-Wave Success
× Exploration
- Negative Feedback
- Saturation
```

## Important boundary

This system does **not** claim to reproduce the private source code, private model weights, or exact coefficients of TikTok, Instagram, or YouTube. Those are proprietary. This repository defines a **proof-grade grey-box replica** based on public platform documentation, recommender-system theory, academic research, and measurable creator analytics.

## What is inside

```text
00_executive_overview/       System thesis, limits, roadmap
01_foundations/              Ranking theory, expected utility, Bayesian waves, bandits
02_signal_models/            One complete model spec per signal
03_hypotheses_rankings/      Five-build-method rankings per signal and criteria
04_ai_engineering/           Data architecture, pipelines, MLOps, APIs, dashboard spec
05_math_model_specs/         Formal equations and training objectives
06_experiment_protocols/     Validation, ablations, temporal holdout, TRIBE tests
07_platform_replicas/        TikTok/Reels/Shorts grey-box scoring variants
08_tribe_and_neuroscience/   TRIBE v2 integration and feature compression
09_research_and_sources/     Annotated references and source matrix
10_templates/                CSV schema, YAML config, model cards, reports
11_code_skeletons/           Pseudocode and implementation scaffolding
12_previous_content_archive/ Consolidated archive of prior reasoning and equations
```

## First implementation target

Build the minimum viable replica first:

```text
1. Creator Baseline Model
2. Scroll-Stop Model
3. Retention Survival Model
4. Positive Intent Model
5. Negative Risk Model
6. Audience Fit Model
7. Eligibility Gate
8. Final Pre-Publish Score
9. Bayesian Expansion-Wave Live Model
```

Then add:

```text
10. TRIBE Neural-Response Feature Layer
11. Trend/Saturation Models
12. Exploration/Bandit Lab
13. Platform-specific calibration
```

## Core validation rule

Every signal must survive an ablation test:

```text
Full model
minus ScrollStop      -> performance should degrade
minus Retention       -> performance should degrade
minus Shareability    -> performance should degrade
minus NegativeRisk    -> performance should degrade
minus AudienceFit     -> performance should degrade
minus CreatorBaseline -> performance should degrade sharply
minus TRIBE           -> keep TRIBE only if performance degrades without it
```

## Current artifact status

Generated: 2026-04-21
Format: Markdown repository packaged as ZIP.
