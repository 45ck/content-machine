# Platform Mapping to Generic Models

## Goal
This file maps public platform/recommender structures to the generic models.

| Public structure | Generic model | Why it matters |
|---|---|---|
| YouTube-style candidate generation + ranking | two-stage recommender model | signal shifts can matter at candidate gate or rank gate |
| TikTok-style interaction signals | multi-behaviour signal vector | watches, likes, follows, skips, and content information are behavioural proxies |
| Short-form video velocity | burst/velocity model | rapid early signal may trigger wider testing or human attention |
| Product Hunt launch rank | threshold/badge model | ranking creates legitimacy beyond the platform |
| App-store charts/reviews | credibility + visibility model | ratings/reviews/install counts can become trust proxies |
| Search ranking | authority/usefulness proxy model | scaled content can manufacture relevance signals |
| Ad attribution | budget feedback model | fake conversions change future budget allocation |
| Streaming royalties | proportional allocation model | fake streams divert money under pool-based payouts |

## Safe interpretation
Do not claim private weights. Claim that public documents and academic papers show these systems use behavioural signals and ranking stages, making proxy corruption theoretically and empirically relevant.
