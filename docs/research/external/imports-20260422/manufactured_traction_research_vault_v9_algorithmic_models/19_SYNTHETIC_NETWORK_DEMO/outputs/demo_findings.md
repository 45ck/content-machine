# Synthetic Demo Findings

This demo uses synthetic data only. It is designed to show how network maths can verify whether a visible traction pattern is more consistent with independent activity or repeated coordination.

## Parameters

- Time window: `120` seconds.
- Edge threshold: `weight >= 4` repeated near-synchronous co-actions.
- Null simulations: `120` timestamp shuffles.

## Observed graph

- Nodes: `27`
- Edges: `112`
- Density: `0.3191`
- Modularity: `0.3368`
- Maximum edge weight: `15`
- Edges above threshold: `112`

## Null comparison

- Empirical p-value for edges above threshold: `0.0083`
- Empirical p-value for max edge weight: `0.0083`

## Interpretation

The synthetic coordinated groups create dense repeated co-action networks because the same accounts post the same content within tight windows repeatedly. Organic accounts create many isolated events but few repeated pairwise co-actions. The benign fan and news groups demonstrate why context matters: they can be synchronized for legitimate reasons, so researchers must combine network maths with disclosure, actor identity, and public-event context.

## Files to inspect

- `coordination_edges_threshold_4.csv`
- `graph_metrics.csv`
- `community_summary.csv`
- `burst_z_scores.csv`
- `null_model_statistics.csv`
- `figures/coordination_network.png`
- `figures/timeline_bursts.png`
- `figures/actor_content_heatmap.png`

## Safe conclusion wording

Use: "The synthetic alpha group displays patterns consistent with repeated coordinated amplification under this test."

Do not use: "The accounts are fraudulent" or "The campaign is illegal" unless external evidence supports that claim.
