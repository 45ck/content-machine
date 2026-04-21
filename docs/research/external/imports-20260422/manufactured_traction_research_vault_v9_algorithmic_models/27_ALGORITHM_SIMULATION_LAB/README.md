# Algorithm Simulation Lab

This lab contains toy simulations that illustrate mechanism-level proof. They do **not** reproduce any private platform algorithm.

## Included demonstrations

- `rank_flip_boundary.png`: shows the boost needed to cross a rank boundary.
- `feedback_multiplier_paths.png`: shows how strong feedback multiplies an early signal.
- `bandit_seed_bias_arm0.png`: shows how early fake success can bias exploration.
- `threshold_cascade_paths.png`: shows threshold-sensitive cascades.
- `coordination_null_distribution.png`: compares observed coordination against timestamp-shuffled null models.
- `toy_coordination_graph.png`: shows a synthetic coordination cluster.
- `fake_review_posterior_curve.png`: shows how fake positive reviews shift perceived quality.
- `preferential_attachment_seed.png`: shows early popularity seeds changing future share.
- `candidate_gate_step.png`: shows the discontinuous exposure jump after a candidate threshold.
- `dampening_condition.png`: shows why platforms can neutralize artificial signals with anomaly penalties.

## How to run

From the vault root:

```bash
python 27_ALGORITHM_SIMULATION_LAB/scripts/run_all_algorithmic_simulations.py
```

The script is intentionally simple. The richer generated outputs already exist in `outputs/`, `data/`, and `figures/`.
