import argparse
import json
from typing import Any, Dict, List


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _sample_keyframes(video_path: str, num_frames: int = 8) -> List[Any]:
    """Sample evenly-spaced keyframes from video."""
    try:
        import cv2  # type: ignore
    except Exception as e:
        _fail("opencv-python is required", {"error": str(e)})

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        _fail("failed to open video", {"video": video_path})

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        _fail("video has no frames", {"video": video_path})

    if total_frames <= num_frames:
        indices = list(range(total_frames))
    else:
        step = total_frames / num_frames
        indices = [int(i * step) for i in range(num_frames)]

    frames: List[Any] = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frames.append(frame)

    cap.release()
    return frames


def _compute_image_reward(frames: List[Any], prompt: str | None) -> Dict[str, Any]:
    """Score keyframes with ImageReward."""
    try:
        import torch  # type: ignore
        from PIL import Image  # type: ignore
        import numpy as np  # type: ignore
    except Exception:
        # ImageReward unavailable, return fallback
        return {
            "meanScore": 0.5,
            "minScore": 0.5,
            "maxScore": 0.5,
            "framesScored": len(frames),
            "method": "fallback",
            "reason": "dependencies_unavailable",
        }

    try:
        # Try to load ImageReward model
        # Placeholder: In production, this would load the actual ImageReward model
        # from ImageReward import ImageReward
        # model = ImageReward(device="cuda" if torch.cuda.is_available() else "cpu")

        # Fallback: return neutral scores
        return {
            "meanScore": 0.5,
            "minScore": 0.5,
            "maxScore": 0.5,
            "framesScored": len(frames),
            "method": "fallback",
            "reason": "model_not_implemented",
        }
    except Exception as e:
        return {
            "meanScore": 0.5,
            "minScore": 0.5,
            "maxScore": 0.5,
            "framesScored": len(frames),
            "method": "fallback",
            "reason": str(e),
        }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--prompt", default=None, help="Text prompt for image quality scoring")
    parser.add_argument("--num-frames", type=int, default=8, help="Number of keyframes to sample")
    args = parser.parse_args()

    frames = _sample_keyframes(args.video, num_frames=args.num_frames)
    if not frames:
        _fail("no frames sampled from video")

    result = _compute_image_reward(frames, args.prompt)
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
