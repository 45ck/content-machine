# Python Pseudocode

## Metric lift

```python
import numpy as np

def metric_lift(actual_rate: float, expected_rate: float, eps: float = 1e-6) -> float:
    return float(np.log((actual_rate + eps) / (expected_rate + eps)))

def compressed_lift(actual_rate: float, expected_rate: float, eps: float = 1e-6) -> float:
    return float(np.tanh(metric_lift(actual_rate, expected_rate, eps)))
```

## Pre-publish scoring

```python
def pre_publish_score(signals: dict) -> float:
    z = (
        1.30 * signals["scroll_stop"]
        + 1.40 * signals["retention"]
        + 1.25 * signals["shareability"]
        + 1.05 * signals["saveability"]
        + 0.95 * signals["audience_fit"]
        + 0.80 * signals["content_quality"]
        + 0.75 * signals["creator_trust"]
        + 0.65 * signals["freshness"]
        + 0.50 * signals.get("tribe", 0.0)
        - 1.45 * signals["negative_risk"]
        - 0.90 * signals["saturation"]
        - 1.20 * signals["eligibility_penalty"]
    )
    return 100.0 / (1.0 + np.exp(-z))
```

## Bayesian wave update

```python
from scipy.stats import beta

def beta_posterior(alpha0: float, beta0: float, successes: int, trials: int):
    return alpha0 + successes, beta0 + trials - successes

def expansion_probability(samples, threshold: float) -> float:
    return float(np.mean(samples > threshold))
```
