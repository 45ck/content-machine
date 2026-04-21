
"""
Run the synthetic coordination demo.

Usage:
    python run_demo.py

This script reads ../data/synthetic_posts.csv and writes outputs into ../outputs/.
"""

from __future__ import annotations

from pathlib import Path
import json
import numpy as np
import pandas as pd

from coordination_math import CoordinationParams, build_coordination_edges, build_graph, graph_summary, node_metrics, empirical_p_value


HERE = Path(__file__).resolve().parent
DEMO = HERE.parent
DATA = DEMO / "data"
OUT = DEMO / "outputs"
OUT.mkdir(exist_ok=True, parents=True)


def main() -> None:
    posts = pd.read_csv(DATA / "synthetic_posts.csv")
    params = CoordinationParams(window_seconds=120, min_edge_weight=4)

    edges = build_coordination_edges(posts, params)
    edges.to_csv(OUT / "coordination_edges_from_script.csv", index=False)

    graph = build_graph(edges)
    metrics = node_metrics(graph)
    metrics.to_csv(OUT / "graph_metrics_from_script.csv", index=False)

    summary = graph_summary(graph)

    # Null model: shuffle timestamps while preserving accounts and content IDs.
    null_edge_counts = []
    timestamps = pd.to_datetime(posts["timestamp"]).tolist()

    for _ in range(100):
        shuffled = posts.copy()
        shuffled["timestamp"] = np.random.permutation(timestamps)
        null_edges = build_coordination_edges(shuffled, params)
        null_edge_counts.append(len(null_edges))

    summary["null_simulations"] = len(null_edge_counts)
    summary["observed_edges"] = len(edges)
    summary["empirical_p_edges"] = empirical_p_value(len(edges), null_edge_counts)

    (OUT / "script_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
