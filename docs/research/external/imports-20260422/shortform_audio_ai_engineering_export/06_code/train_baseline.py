"""Baseline model scaffold.

Expected input: CSV with engineered features and target metrics.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error


def train_reward_model(csv_path: str, target: str = "reward") -> None:
    df = pd.read_csv(csv_path)
    drop_cols = {target, "video_id", "audio_asset_id"}
    feature_cols = [c for c in df.columns if c not in drop_cols and pd.api.types.is_numeric_dtype(df[c])]

    X = df[feature_cols].fillna(0)
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=300, random_state=42, min_samples_leaf=3)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    print({"mae": float(mean_absolute_error(y_test, preds)), "features": feature_cols})

    importance = pd.DataFrame({"feature": feature_cols, "importance": model.feature_importances_})
    print(importance.sort_values("importance", ascending=False).head(25).to_string(index=False))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python train_baseline.py features.csv")
    train_reward_model(sys.argv[1])
