
"""
Coordination math helpers for defensive research.

This script is intentionally designed for authorized or public datasets and the included synthetic demo data.
It is not a guide for running coordinated campaigns.

Expected post CSV columns:
- account_id
- content_id
- timestamp

Optional columns:
- caption
- hashtags
- action_type
- content_family
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass
from typing import Dict, Tuple, List

import pandas as pd
import networkx as nx


@dataclass
class CoordinationParams:
    window_seconds: int = 120
    min_edge_weight: int = 4


def build_coordination_edges(posts: pd.DataFrame, params: CoordinationParams) -> pd.DataFrame:
    """Build pairwise repeated near-synchronous co-action edges.

    Two accounts are linked when they act on the same content within params.window_seconds.
    Edge weight equals the number of repeated co-actions.
    """
    required = {"account_id", "content_id", "timestamp"}
    missing = required - set(posts.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")

    df = posts.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["timestamp", "account_id", "content_id"])

    edge_counts: Dict[Tuple[str, str], int] = {}
    edge_examples: Dict[Tuple[str, str], List[str]] = {}

    for content_id, group in df.groupby("content_id"):
        rows = group.sort_values("timestamp")[["account_id", "timestamp"]].to_dict("records")
        for i in range(len(rows)):
            for j in range(i + 1, len(rows)):
                delta = abs((rows[j]["timestamp"] - rows[i]["timestamp"]).total_seconds())
                if delta <= params.window_seconds:
                    a, b = sorted([str(rows[i]["account_id"]), str(rows[j]["account_id"])])
                    key = (a, b)
                    edge_counts[key] = edge_counts.get(key, 0) + 1
                    edge_examples.setdefault(key, []).append(str(content_id))

    records = []
    for (source, target), weight in edge_counts.items():
        if weight >= params.min_edge_weight:
            records.append({
                "source": source,
                "target": target,
                "weight": weight,
                "example_content_ids": ";".join(edge_examples[(source, target)][:8]),
            })

    return pd.DataFrame(records).sort_values("weight", ascending=False) if records else pd.DataFrame(
        columns=["source", "target", "weight", "example_content_ids"]
    )


def build_graph(edges: pd.DataFrame) -> nx.Graph:
    """Build an undirected weighted graph from edge dataframe."""
    g = nx.Graph()
    for _, row in edges.iterrows():
        g.add_edge(row["source"], row["target"], weight=int(row["weight"]))
    return g


def graph_summary(g: nx.Graph) -> dict:
    """Calculate basic network statistics."""
    communities = list(nx.algorithms.community.greedy_modularity_communities(g, weight="weight")) if g.number_of_edges() else []
    modularity = nx.algorithms.community.modularity(g, communities, weight="weight") if communities else 0.0
    return {
        "nodes": g.number_of_nodes(),
        "edges": g.number_of_edges(),
        "density": nx.density(g) if g.number_of_nodes() > 1 else 0.0,
        "components": nx.number_connected_components(g) if g.number_of_nodes() else 0,
        "largest_component": len(max(nx.connected_components(g), key=len)) if g.number_of_nodes() else 0,
        "communities": len(communities),
        "modularity": modularity,
    }


def node_metrics(g: nx.Graph) -> pd.DataFrame:
    """Calculate node-level graph metrics."""
    if g.number_of_nodes() == 0:
        return pd.DataFrame()

    degree = dict(g.degree())
    strength = dict(g.degree(weight="weight"))
    betweenness = nx.betweenness_centrality(g, weight="weight")
    clustering = nx.clustering(g, weight="weight")

    try:
        eigenvector = nx.eigenvector_centrality_numpy(g, weight="weight")
    except Exception:
        eigenvector = {node: 0.0 for node in g.nodes()}

    rows = []
    for node in g.nodes():
        rows.append({
            "account_id": node,
            "degree": degree.get(node, 0),
            "weighted_degree": strength.get(node, 0),
            "betweenness": betweenness.get(node, 0.0),
            "eigenvector": eigenvector.get(node, 0.0),
            "clustering": clustering.get(node, 0.0),
        })
    return pd.DataFrame(rows).sort_values(["weighted_degree", "degree"], ascending=False)


def empirical_p_value(observed: float, null_values: list[float]) -> float:
    """One-sided empirical p-value."""
    return (1 + sum(v >= observed for v in null_values)) / (1 + len(null_values))
