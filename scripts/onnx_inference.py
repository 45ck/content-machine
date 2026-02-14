#!/usr/bin/env python3
"""Run ONNX model inference on a feature vector JSON file.

Usage:
    python onnx_inference.py --model quality_scorer.onnx --features features.json

Output: JSON with score (0-100) and optional feature importances.
"""
import argparse
import json
import sys
from typing import Any, Dict, List


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _load_model_meta(model_path: str) -> Dict[str, Any]:
    """Load model metadata from the companion _meta.json file."""
    meta_path = model_path.replace(".onnx", "_meta.json")
    try:
        with open(meta_path, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def _flatten_features(features: Dict[str, Any], feature_names: List[str]) -> List[float]:
    """Flatten a feature vector JSON into an ordered list matching feature_names."""
    flat: Dict[str, float] = {}

    # Flatten repoMetrics
    for key, val in features.get("repoMetrics", {}).items():
        if isinstance(val, (int, float)):
            flat[key] = float(val)

    # Flatten metadata
    for key, val in features.get("metadata", {}).items():
        if isinstance(val, (int, float)):
            flat[key] = float(val)

    # Build ordered vector
    result = []
    for name in feature_names:
        result.append(flat.get(name, 0.0))

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="ONNX model inference for quality scoring")
    parser.add_argument("--model", required=True, help="Path to ONNX model file")
    parser.add_argument("--features", required=True, help="Path to feature vector JSON file")
    args = parser.parse_args()

    try:
        import onnxruntime as ort
        import numpy as np
    except ImportError:
        _fail("Missing dependencies: pip install onnxruntime numpy")
        return

    # Load features
    try:
        with open(args.features, "r") as f:
            features = json.load(f)
    except FileNotFoundError:
        _fail(f"Features file not found: {args.features}")
        return
    except json.JSONDecodeError:
        _fail(f"Invalid JSON in features file: {args.features}")
        return

    # Load model
    try:
        session = ort.InferenceSession(args.model)
    except Exception as e:
        _fail(f"Failed to load ONNX model: {e}")
        return

    # Load metadata for feature ordering
    meta = _load_model_meta(args.model)
    feature_names = meta.get("feature_names", [])

    if not feature_names:
        # Infer from model input shape
        input_info = session.get_inputs()[0]
        input_shape = input_info.shape
        # Fall back to all numeric features
        flat = {}
        for key, val in features.get("repoMetrics", {}).items():
            if isinstance(val, (int, float)):
                flat[key] = float(val)
        for key, val in features.get("metadata", {}).items():
            if isinstance(val, (int, float)):
                flat[key] = float(val)
        feature_names = sorted(flat.keys())

    feature_vector = _flatten_features(features, feature_names)

    # Include embeddings if present and model expects them
    if features.get("clipEmbedding"):
        feature_vector.extend(features["clipEmbedding"])
    if features.get("textEmbedding"):
        feature_vector.extend(features["textEmbedding"])

    # Run inference
    input_name = session.get_inputs()[0].name
    input_array = np.array([feature_vector], dtype=np.float32)

    try:
        outputs = session.run(None, {input_name: input_array})
    except Exception as e:
        _fail(f"Inference failed: {e}", {"input_shape": list(input_array.shape)})
        return

    # Parse output — expect a single score or probability
    raw_output = outputs[0]
    if raw_output.ndim > 1:
        raw_output = raw_output.squeeze()

    # Convert to 0-100 score
    if raw_output.size == 1:
        score = float(raw_output.item())
    elif raw_output.size == 5:
        # 5-class ordinal: weighted average
        probs = raw_output / raw_output.sum() if raw_output.sum() > 0 else raw_output
        score = float(np.dot(probs, [1, 2, 3, 4, 5]))
    else:
        score = float(raw_output[0])

    # Normalize to 0-100 if needed
    if 0 <= score <= 5:
        score = (score - 1) / 4 * 100
    elif 0 <= score <= 1:
        score = score * 100

    score = max(0, min(100, score))

    print(json.dumps({
        "score": round(score, 2),
        "rawOutput": raw_output.tolist() if hasattr(raw_output, "tolist") else float(raw_output),
        "featureCount": len(feature_vector),
        "modelVersion": meta.get("version", "unknown"),
    }))


if __name__ == "__main__":
    main()
