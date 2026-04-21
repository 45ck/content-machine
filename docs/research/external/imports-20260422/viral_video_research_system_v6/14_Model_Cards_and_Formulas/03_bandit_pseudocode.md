# Bandit pseudocode

```python
for arm in arms:
    arm.alpha = 1
    arm.beta = 1

for batch in batches:
    sampled_scores = {}
    for arm in arms:
        sampled_scores[arm] = sample_beta(arm.alpha, arm.beta)

    chosen_arm = argmax(sampled_scores)
    publish_variant(chosen_arm)

    n, x = observe_metric(chosen_arm)
    chosen_arm.alpha += x
    chosen_arm.beta += n - x

    if guardrail_failed(chosen_arm):
        deactivate(chosen_arm)
```

## Utility-bandit variant

For multi-metric utility:

```text
reward = weighted utility score
model reward with normal/gamma/bootstrap posterior
sample utility from posterior
choose max sampled utility
```

## Exploration floor

```text
Reserve at least 10% of batch capacity for new arms.
```
