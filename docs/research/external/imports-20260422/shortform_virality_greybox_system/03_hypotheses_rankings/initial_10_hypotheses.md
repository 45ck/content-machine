# Initial 10 Research Hypotheses

These are the first hypotheses to test before building the full system.

| Rank | Hypothesis | Why it matters | Pass condition |
|---:|---|---|---|
| 1 | Creator-adjusted metrics beat raw metrics | Removes account-size bias | Higher temporal holdout performance than raw views/likes |
| 2 | First 0–3 seconds predict stop/swipe | First feed gate | +10% lift for viewed-vs-swiped or 3s hold |
| 3 | Survival retention beats average watch time | Captures full retention curve | Better APV/completion/drop prediction |
| 4 | Shares/saves outperform likes for expansion | Stronger intent signals | Higher 24h/72h breakout prediction |
| 5 | Negative risk explains stalls | High engagement can still fail | Detects early-view/high-stall videos |
| 6 | Dual-tower audience fit predicts cold reach | Personalization is central | Better non-follower reach prediction |
| 7 | Bayesian wave model beats first-hour views | Expansion is sequential | Better 24h/72h calibrated probability |
| 8 | Trend velocity minus saturation predicts lift | Timing matters | Better above-baseline reach prediction |
| 9 | TRIBE adds pre-publish lift | Neural response may improve hook/retention/share | Multimodal+TRIBE beats multimodal-only |
| 10 | Contextual bandit improves variant selection | Exploration is needed | Bandit-selected variants beat random/manual tests |

## Correct order

Start with hypotheses 1–5. They need less exotic infrastructure and explain the most common platform behavior.
