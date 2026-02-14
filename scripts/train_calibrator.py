import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple


def _fail(message: str) -> None:
    print(json.dumps({"error": {"message": message}}))
    raise SystemExit(2)


def _load_reports(reports_dir: str) -> List[Dict[str, Any]]:
    """Load all evaluation reports from directory."""
    reports = []
    for report_file in Path(reports_dir).glob("*.json"):
        try:
            with open(report_file, "r") as f:
                report = json.load(f)
                reports.append(report)
        except Exception as e:
            print(f"Warning: Failed to load {report_file}: {e}")
    return reports


def _load_preferences(preferences_path: str) -> List[Dict[str, Any]]:
    """Load preference records from JSONL file."""
    preferences = []
    try:
        with open(preferences_path, "r") as f:
            for line in f:
                line = line.strip()
                if line:
                    preferences.append(json.loads(line))
    except FileNotFoundError:
        _fail(f"Preferences file not found: {preferences_path}")
    except Exception as e:
        _fail(f"Failed to load preferences: {e}")
    return preferences


def _extract_features(report: Dict[str, Any]) -> List[float]:
    """Extract feature vector from evaluation report."""
    features = []

    # Extract check results
    checks = report.get("checks", [])
    check_scores: Dict[str, float] = {}
    for check in checks:
        check_id = check.get("checkId", "")
        if check.get("skipped"):
            check_scores[check_id] = 0.5  # Neutral for skipped
        else:
            check_scores[check_id] = 1.0 if check.get("passed") else 0.0

    # Feature order (consistent across all reports)
    feature_names = [
        "validate",
        "rate",
        "captionQuality",
        "score",
        "temporalQuality",
        "audioSignal",
        "semanticFidelity",
        "safety",
        "freeze",
        "dnsmos",
        "flowConsistency",
    ]

    for name in feature_names:
        features.append(check_scores.get(name, 0.5))

    # Add overall score if available
    overall = report.get("overall", {})
    if isinstance(overall, dict):
        features.append(overall.get("score", 0.5))
    else:
        features.append(0.5)

    return features


def _build_training_data(
    reports: List[Dict[str, Any]], preferences: List[Dict[str, Any]]
) -> Tuple[List[List[float]], List[int]]:
    """Build training data from reports and preferences."""
    # Build report lookup
    report_lookup: Dict[str, Dict[str, Any]] = {}
    for report in reports:
        video_path = report.get("videoPath", "")
        if video_path:
            report_lookup[video_path] = report

    X = []
    y = []

    for pref in preferences:
        video_a = pref.get("videoA", "")
        video_b = pref.get("videoB", "")
        winner = pref.get("winner", "tie")

        if video_a not in report_lookup or video_b not in report_lookup:
            continue

        features_a = _extract_features(report_lookup[video_a])
        features_b = _extract_features(report_lookup[video_b])

        # Compute feature diff: A - B
        diff = [a - b for a, b in zip(features_a, features_b)]

        if winner == "A":
            X.append(diff)
            y.append(1)
        elif winner == "B":
            X.append(diff)
            y.append(0)
        # Skip ties for binary classification

    return X, y


def _train_calibrator(X: List[List[float]], y: List[int]) -> Dict[str, Any]:
    """Train logistic regression calibrator."""
    try:
        from sklearn.linear_model import LogisticRegression  # type: ignore
        import numpy as np  # type: ignore
    except ImportError:
        _fail("scikit-learn and numpy are required. Install with: pip install scikit-learn numpy")

    if len(X) < 10:
        _fail(f"Not enough training data (need at least 10 pairs, got {len(X)})")

    X_array = np.array(X)
    y_array = np.array(y)

    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_array, y_array)

    # Extract weights and intercept
    weights = model.coef_[0].tolist()
    intercept = float(model.intercept_[0])

    # Compute accuracy
    predictions = model.predict(X_array)
    accuracy = float(np.mean(predictions == y_array))

    return {
        "weights": weights,
        "intercept": intercept,
        "accuracy": accuracy,
        "trainingSize": len(X),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reports-dir", required=True, help="Directory containing evaluation reports")
    parser.add_argument("--preferences", required=True, help="JSONL file with preference records")
    parser.add_argument("--output", default="calibrator.json", help="Output calibrator JSON")
    args = parser.parse_args()

    print(f"Loading reports from {args.reports_dir}...")
    reports = _load_reports(args.reports_dir)
    print(f"Loaded {len(reports)} reports")

    print(f"Loading preferences from {args.preferences}...")
    preferences = _load_preferences(args.preferences)
    print(f"Loaded {len(preferences)} preference records")

    print("Building training data...")
    X, y = _build_training_data(reports, preferences)
    print(f"Built {len(X)} training examples")

    if len(X) == 0:
        _fail("No training data could be constructed (check that video paths match)")

    print("Training calibrator...")
    calibrator = _train_calibrator(X, y)
    print(f"Training accuracy: {calibrator['accuracy']:.2%}")

    with open(args.output, "w") as f:
        json.dump(calibrator, f, indent=2)

    print(f"Calibrator saved to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
