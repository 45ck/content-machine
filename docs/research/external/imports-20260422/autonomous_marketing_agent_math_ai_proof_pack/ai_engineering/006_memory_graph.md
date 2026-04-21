# Memory Graph

## Nodes

```text
buyer_segment
problem
job_to_be_done
tactic
creative_angle
offer
proof_asset
campaign
experiment
metric
learning
claim
source
```

## Edges

```text
buyer_segment HAS problem
problem MAPS_TO job
job SUPPORTS tactic
tactic PRODUCES creative_angle
creative_angle TESTED_IN campaign
campaign PRODUCED learning
learning UPDATES memory
claim SUPPORTED_BY source
```

## Markdown implementation

Use cross-links:

```text
[[memory/buyer_language.md]]
[[tactics_deep/demo_proof_ads.md]]
[[math_models/005_bayesian_beta_binomial_model.md]]
```

If the system does not support wiki-links, use relative Markdown links.
