import argparse
import json
from typing import Any, Dict, List


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _detect_freezes_and_black_frames(video_path: str, sample_rate: int) -> Dict[str, Any]:
    """Detect freeze events and black frames in video."""
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except Exception as e:
        _fail("opencv-python and numpy are required", {"error": str(e)})

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        _fail("failed to open video", {"video": video_path})

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        cap.release()
        _fail("video has no frames", {"video": video_path})

    freeze_events = 0
    black_frames = 0
    frames_analyzed = 0
    prev_frame = None
    frame_num = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Only analyze frames according to sample rate
        if sample_rate > 1 and (frame_num % sample_rate != 0):
            frame_num += 1
            continue

        frames_analyzed += 1
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Check for black frames (mean luminance < 10)
        mean_luminance = float(np.mean(gray))
        if mean_luminance < 10:
            black_frames += 1

        # Check for freeze (consecutive frames with high similarity)
        if prev_frame is not None:
            # Compute mean absolute difference
            diff = np.mean(np.abs(gray.astype(float) - prev_frame.astype(float)))
            # Threshold: diff < 2.55 (~1% of 255 range) indicates freeze
            similarity = 1.0 - (diff / 255.0)
            if similarity >= 0.99:
                freeze_events += 1

        prev_frame = gray.copy()
        frame_num += 1

    cap.release()

    if frames_analyzed == 0:
        _fail("no frames analyzed", {"sampleRate": sample_rate})

    freeze_ratio = round(freeze_events / frames_analyzed, 4) if frames_analyzed > 0 else 0.0
    black_ratio = round(black_frames / frames_analyzed, 4) if frames_analyzed > 0 else 0.0

    return {
        "freezeEvents": freeze_events,
        "blackFrames": black_frames,
        "freezeRatio": freeze_ratio,
        "blackRatio": black_ratio,
        "totalFrames": frames_analyzed,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--sample-rate", type=int, default=1)
    args = parser.parse_args()

    result = _detect_freezes_and_black_frames(args.video, max(1, args.sample_rate))
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
