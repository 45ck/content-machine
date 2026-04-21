# 19 Synthetic Network Demo

This folder contains a safe, fully synthetic demonstration of manufactured-traction verification.

The demo creates several synthetic groups:

- `organic`: independent activity with diverse content and loose timing.
- `coordinated_alpha`: repeated near-synchronous posting of the same assets.
- `coordinated_beta`: smaller repeated coordination pattern.
- `benign_fan_wave`: legitimate-ish fan live-event synchronization.
- `news_breaking`: legitimate tight synchronization caused by breaking news.

The point is to show why network maths must be combined with context. Both synthetic campaign clusters and benign event clusters can synchronize, but campaign clusters tend to show repeated co-action across multiple objects without an independent public event explanation.

## Main files

- `data/synthetic_posts.csv`
- `data/account_profiles.csv`
- `data/synthetic_engagement.csv`
- `outputs/coordination_edges_threshold_4.csv`
- `outputs/graph_metrics.csv`
- `outputs/community_summary.csv`
- `outputs/null_model_statistics.csv`
- `outputs/demo_findings.md`
- `outputs/figures/coordination_network.png`

## How to explain this in a paper

> A repeated co-action graph links accounts that post the same content within a fixed time window. Dense clusters with high repeated edge weights are consistent with coordinated amplification. A timestamp-shuffle null model helps estimate whether the observed density is unusual under independent timing assumptions.

## Safe wording

Use the demo to show method, not accusation. For real-world data, always label conclusions by evidence strength.
