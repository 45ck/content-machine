#!/usr/bin/env python3
"""Train a quality scorer model on extracted features + human labels.

Usage:
    python train_quality_scorer.py \
        --features-dir features/ \
        --labels labels.jsonl \
        --output quality_scorer.onnx \
        --model-type xgboost

Produces: quality_scorer.onnx + quality_scorer_meta.json
"""
import argparse
import json
import os
import sys
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Tuple


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _load_features(features_dir: str) -> Dict[str, Dict[str, Any]]:
    """Load feature JSONs keyed by video_id."""
    features = {}
    for path in Path(features_dir).glob("*.json"):
        with open(path, "r") as f:
            data = json.load(f)
        vid = data.get("videoId", path.stem)
        features[vid] = data
    return features


def _load_labels(labels_path: str) -> List[Dict[str, Any]]:
    """Load JSONL labels."""
    labels = []
    with open(labels_path, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                labels.append(json.loads(line))
    return labels


def _flatten_features(feature_data: Dict[str, Any], feature_names: List[str]) -> List[float]:
    """Flatten feature JSON into ordered numeric vector."""
    flat: Dict[str, float] = {}
    for key, val in feature_data.get("repoMetrics", {}).items():
        if isinstance(val, (int, float)):
            flat[key] = float(val)
    for key, val in feature_data.get("metadata", {}).items():
        if isinstance(val, (int, float)):
            flat[key] = float(val)
    return [flat.get(n, 0.0) for n in feature_names]


def _discover_feature_names(features: Dict[str, Dict[str, Any]]) -> List[str]:
    """Discover all numeric feature names from the feature set."""
    names = set()
    for data in features.values():
        for key, val in data.get("repoMetrics", {}).items():
            if isinstance(val, (int, float)):
                names.add(key)
        for key, val in data.get("metadata", {}).items():
            if isinstance(val, (int, float)):
                names.add(key)
    return sorted(names)


def _make_cv(y, groups=None):
    """Create cross-validation splitter. Uses GroupKFold if groups provided."""
    import numpy as np
    n_splits = min(5, len(y))
    if groups is not None and len(set(groups)) >= n_splits:
        from sklearn.model_selection import GroupKFold
        return GroupKFold(n_splits=n_splits), groups
    from sklearn.model_selection import KFold
    return KFold(n_splits=n_splits, shuffle=True, random_state=42), None


def _compute_extended_metrics(y_true, y_pred) -> Dict[str, float]:
    """Compute PR-AUC, balanced accuracy, and ECE in addition to basic metrics."""
    import numpy as np
    metrics: Dict[str, float] = {}

    # Binarize at threshold 4 (good/bad) for classification metrics
    y_bin = (y_true >= 4).astype(int)
    y_pred_bin = (y_pred >= 4).astype(int)
    y_pred_prob = np.clip((y_pred - 1) / 4, 0, 1)  # Normalize to [0,1]

    try:
        from sklearn.metrics import precision_recall_curve, auc, balanced_accuracy_score
        precision, recall, _ = precision_recall_curve(y_bin, y_pred_prob)
        metrics["pr_auc"] = float(auc(recall, precision))
        metrics["balanced_accuracy"] = float(balanced_accuracy_score(y_bin, y_pred_bin))
    except Exception:
        pass

    # Expected Calibration Error (ECE)
    try:
        n_bins = min(10, len(y_true))
        bin_edges = np.linspace(0, 1, n_bins + 1)
        ece = 0.0
        for i in range(n_bins):
            # Use <= for last bin to include upper edge (values == 1.0)
            upper_op = np.less_equal if i == n_bins - 1 else np.less
            mask = (y_pred_prob >= bin_edges[i]) & upper_op(y_pred_prob, bin_edges[i + 1])
            if mask.sum() > 0:
                bin_acc = y_bin[mask].mean()
                bin_conf = y_pred_prob[mask].mean()
                ece += mask.sum() / len(y_true) * abs(bin_acc - bin_conf)
        metrics["ece"] = float(ece)
    except Exception:
        pass

    return metrics


def _eval_model(model, X, y, cv, groups) -> Dict[str, Any]:
    """Evaluate a model with cross-validation and extended metrics."""
    import numpy as np
    from sklearn.model_selection import cross_val_score
    from scipy.stats import spearmanr

    if groups is not None:
        scores = cross_val_score(model, X, y, cv=cv, groups=groups, scoring="neg_mean_squared_error")
    else:
        scores = cross_val_score(model, X, y, cv=cv, scoring="neg_mean_squared_error")
    rmse_scores = np.sqrt(-scores)

    model.fit(X, y)
    preds = model.predict(X)
    spearman_corr, _ = spearmanr(y, preds)

    metrics = {
        "cv_rmse_mean": float(rmse_scores.mean()),
        "cv_rmse_std": float(rmse_scores.std()),
        "spearman_correlation": float(spearman_corr),
        "n_samples": len(y),
    }
    metrics.update(_compute_extended_metrics(y, preds))
    return metrics


# Global state set by main() before training
_cv_groups = None


def _train_xgboost(X, y, feature_names: List[str]) -> Tuple[Any, Dict[str, Any]]:
    try:
        from xgboost import XGBRegressor
        import numpy as np
    except ImportError:
        _fail("Missing dependencies: pip install xgboost scikit-learn numpy")

    model = XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        objective="reg:squarederror",
    )

    cv, groups = _make_cv(y, _cv_groups)
    metrics = _eval_model(model, X, y, cv, groups)
    return model, metrics


def _train_logistic(X, y, feature_names: List[str]) -> Tuple[Any, Dict[str, Any]]:
    try:
        from sklearn.linear_model import Ridge
        import numpy as np
    except ImportError:
        _fail("Missing dependencies: pip install scikit-learn numpy")

    model = Ridge(alpha=1.0)
    cv, groups = _make_cv(y, _cv_groups)
    metrics = _eval_model(model, X, y, cv, groups)
    return model, metrics


def _train_mlp(X, y, feature_names: List[str]) -> Tuple[Any, Dict[str, Any]]:
    try:
        from sklearn.neural_network import MLPRegressor
        import numpy as np
    except ImportError:
        _fail("Missing dependencies: pip install scikit-learn numpy")

    model = MLPRegressor(
        hidden_layer_sizes=(64, 32),
        max_iter=500,
        early_stopping=True,
        validation_fraction=0.15,
    )

    cv, groups = _make_cv(y, _cv_groups)
    metrics = _eval_model(model, X, y, cv, groups)
    return model, metrics


def _export_onnx(model: Any, feature_count: int, output_path: str, model_type: str) -> None:
    try:
        import numpy as np
    except ImportError:
        _fail("Missing numpy for ONNX export")

    if model_type == "xgboost":
        try:
            from onnxmltools import convert_xgboost
            from onnxmltools.convert.common.data_types import FloatTensorType
            onnx_model = convert_xgboost(model, initial_types=[("features", FloatTensorType([None, feature_count]))])
            with open(output_path, "wb") as f:
                f.write(onnx_model.SerializeToString())
            return
        except ImportError:
            pass

    # Fallback: sklearn to ONNX
    try:
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType
        onnx_model = convert_sklearn(model, initial_types=[("features", FloatTensorType([None, feature_count]))])
        with open(output_path, "wb") as f:
            f.write(onnx_model.SerializeToString())
    except ImportError:
        _fail("Missing ONNX export dependencies: pip install skl2onnx onnxmltools")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train quality scorer model")
    parser.add_argument("--features-dir", required=True, help="Directory of feature JSON files")
    parser.add_argument("--labels", required=True, help="JSONL file with quality labels")
    parser.add_argument("--output", default="quality_scorer.onnx", help="Output ONNX model path")
    parser.add_argument("--model-type", choices=["logistic", "xgboost", "mlp"], default="xgboost")
    parser.add_argument("--group-col", default=None, help="Column for GroupKFold split (e.g. creator prefix from video_id)")
    parser.add_argument("--quantize", action="store_true", help="Apply post-training ONNX quantization")
    args = parser.parse_args()

    # Load data
    features = _load_features(args.features_dir)
    labels = _load_labels(args.labels)

    if not features:
        _fail("No feature files found", {"dir": args.features_dir})
    if not labels:
        _fail("No labels found", {"path": args.labels})

    # Join by video_id
    feature_names = _discover_feature_names(features)
    X_rows = []
    y_rows = []
    matched_ids = []

    for label in labels:
        vid = label.get("videoId", label.get("video_id"))
        if vid and vid in features:
            row = _flatten_features(features[vid], feature_names)
            # Include embeddings if present
            feat_data = features[vid]
            if feat_data.get("clipEmbedding"):
                row.extend(feat_data["clipEmbedding"])
            if feat_data.get("textEmbedding"):
                row.extend(feat_data["textEmbedding"])
            X_rows.append(row)
            y_rows.append(float(label["overallQuality"]))
            matched_ids.append(vid)

    if len(X_rows) < 5:
        _fail(f"Too few matched samples ({len(X_rows)}), need at least 5", {
            "feature_ids": list(features.keys())[:10],
            "label_ids": [l.get("videoId", l.get("video_id")) for l in labels[:10]],
        })

    try:
        import numpy as np
    except ImportError:
        _fail("Missing numpy")

    X = np.array(X_rows, dtype=np.float32)
    y = np.array(y_rows, dtype=np.float32)

    # Replace NaN with 0
    X = np.nan_to_num(X, nan=0.0)

    # Set up group-based CV if requested
    global _cv_groups
    if args.group_col:
        # Extract group from video_id (e.g. creator prefix before first dash or underscore)
        _cv_groups = np.array([vid.split("-")[0].split("_")[0] for vid in matched_ids])

    # Train
    trainers = {"xgboost": _train_xgboost, "logistic": _train_logistic, "mlp": _train_mlp}
    trainer = trainers[args.model_type]
    model, metrics = trainer(X, y, feature_names)

    # Export ONNX
    _export_onnx(model, X.shape[1], args.output, args.model_type)

    # Optional quantization
    if args.quantize:
        try:
            from onnxruntime.quantization import quantize_dynamic, QuantType
            quantized_path = args.output.replace(".onnx", "_quantized.onnx")
            quantize_dynamic(args.output, quantized_path, weight_type=QuantType.QUInt8)
            metrics["quantized_path"] = quantized_path
        except ImportError:
            print(json.dumps({"warning": "onnxruntime.quantization not available, skipping quantization"}), file=sys.stderr)

    # Save metadata
    version_hash = hashlib.sha256(json.dumps(sorted(matched_ids)).encode()).hexdigest()[:12]
    meta = {
        "version": f"{args.model_type}-{version_hash}",
        "model_type": args.model_type,
        "feature_names": feature_names,
        "feature_count": X.shape[1],
        "training_metrics": metrics,
        "sample_count": len(X_rows),
        "matched_ids": matched_ids,
    }

    meta_path = args.output.replace(".onnx", "_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    print(json.dumps({
        "model_path": args.output,
        "meta_path": meta_path,
        "metrics": metrics,
        "sample_count": len(X_rows),
        "feature_count": X.shape[1],
    }))


if __name__ == "__main__":
    main()
