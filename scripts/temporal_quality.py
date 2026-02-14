import argparse
import json
from typing import Any, Dict, List


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _sample_frames(video_path: str, sample_rate: int) -> List[Any]:
    try:
        import cv2  # type: ignore
    except Exception as e:
        _fail("opencv-python is required", {"error": str(e)})

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        _fail("failed to open video", {"video": video_path})

    frames: List[Any] = []
    frame_num = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if sample_rate <= 1 or (frame_num % sample_rate == 0):
            frames.append(frame)
        frame_num += 1

    cap.release()
    return frames


def _compute_flicker(frames: List[Any]) -> Dict[str, Any]:
    """Compute frame-to-frame luminance variance (flicker index)."""
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except Exception as e:
        _fail("opencv-python and numpy are required", {"error": str(e)})

    if len(frames) < 2:
        return {"score": 1.0, "variance": 0.0}

    luminances: List[float] = []
    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        luminances.append(float(np.mean(gray)))

    # Frame-to-frame absolute differences
    diffs = [abs(luminances[i + 1] - luminances[i]) for i in range(len(luminances) - 1)]
    variance = float(np.var(diffs)) if diffs else 0.0
    mean_diff = float(np.mean(diffs)) if diffs else 0.0

    # Normalize to 0-1 score: low variance = good (1.0), high variance = bad (0.0)
    # Empirical: mean_diff > 30 is very flickery for 0-255 luminance range
    score = max(0.0, 1.0 - mean_diff / 30.0)

    return {"score": round(score, 4), "variance": round(variance, 4), "meanDiff": round(mean_diff, 4)}


def _compute_duplicate_ratio(frames: List[Any]) -> float:
    """Compute ratio of perceptually duplicate frames using pHash."""
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except Exception as e:
        _fail("opencv-python and numpy are required", {"error": str(e)})

    if len(frames) < 2:
        return 0.0

    def phash(frame: Any) -> Any:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (32, 32), interpolation=cv2.INTER_AREA)
        dct = cv2.dct(np.float32(resized))
        dct_low = dct[:8, :8]
        median = np.median(dct_low)
        return dct_low > median

    hashes = [phash(f) for f in frames]
    duplicates = 0
    for i in range(1, len(hashes)):
        # Hamming distance between consecutive hashes
        diff = np.count_nonzero(hashes[i] != hashes[i - 1])
        if diff <= 5:  # threshold: <=5 bits different out of 64 = duplicate
            duplicates += 1

    return round(duplicates / (len(frames) - 1), 4)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--sample-rate", type=int, default=1)
    args = parser.parse_args()

    frames = _sample_frames(args.video, max(1, args.sample_rate))
    if not frames:
        _fail("no frames sampled from video", {"sampleRate": args.sample_rate})

    flicker = _compute_flicker(frames)
    duplicate_ratio = _compute_duplicate_ratio(frames)

    out = {
        "flicker": flicker,
        "duplicateFrameRatio": duplicate_ratio,
        "framesAnalyzed": len(frames),
    }
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
