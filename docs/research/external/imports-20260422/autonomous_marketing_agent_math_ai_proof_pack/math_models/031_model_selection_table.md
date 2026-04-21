# Model Selection Table

| Problem | Use model | Do not use when |
|---|---|---|
| Small-sample CTR/CVR | Beta-binomial | outcome value varies heavily |
| Variant allocation | Thompson Sampling | final clean causal inference is required |
| Heterogeneous audiences | Contextual bandit | contexts are unreliable |
| Cross-channel budget | Bayesian MMM | little spend variation or poor controls |
| Time-series intervention | CausalImpact/BSTS | control series affected by campaign |
| Randomized ad test | A/B test | sample too small |
| Noisy experiment | CUPED | no pre-period covariate |
| Target incremental responders | uplift model | no treatment/control data |
| Fatigue | nonstationary bandit / fatigue score | audience size is too small |
| SaaS economics | LTV/CAC/payback | retention data absent |
