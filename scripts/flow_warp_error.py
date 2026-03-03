import argparse
import json
from typing import Any, Dict, List, Tuple


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _sample_frame_pairs(video_path: str, max_pairs: int) -> List[Tuple[Any, Any, int]]:
    """Sample evenly-spaced consecutive frame pairs from video."""
    try:
        import cv2  # type: ignore
    except Exception as e:
        _fail("opencv-python is required", {"error": str(e)})

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        _fail("failed to open video", {"video": video_path})

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 1:
        cap.release()
        _fail("video has insufficient frames", {"totalFrames": total_frames})

    # Determine frame indices for sampling
    if total_frames - 1 <= max_pairs:
        # Sample all consecutive pairs
        indices = list(range(total_frames - 1))
    else:
        # Sample evenly
        step = (total_frames - 1) / max_pairs
        indices = [int(i * step) for i in range(max_pairs)]

    pairs: List[Tuple[Any, Any, int]] = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret1, frame1 = cap.read()
        ret2, frame2 = cap.read()
        if ret1 and ret2:
            pairs.append((frame1, frame2, idx))

    cap.release()
    return pairs


def _compute_flow_warp_errors(pairs: List[Tuple[Any, Any, int]]) -> Dict[str, Any]:
    """Compute optical flow warp errors for frame pairs."""
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except Exception as e:
        _fail("opencv-python and numpy are required", {"error": str(e)})

    if not pairs:
        return {
            "meanWarpError": 0.0,
            "maxWarpError": 0.0,
            "frameErrors": [],
            "framesAnalyzed": 0,
        }

    # Try to use TV-L1 optical flow, fallback to Farneback
    flow_method = None
    try:
        if hasattr(cv2, "optflow") and hasattr(cv2.optflow, "DualTVL1OpticalFlow_create"):
            flow_method = cv2.optflow.DualTVL1OpticalFlow_create()
    except Exception:
        pass

    errors: List[float] = []

    for frame1, frame2, idx in pairs:
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)

        # Compute optical flow
        if flow_method is not None:
            flow = flow_method.calc(gray1, gray2, None)
        else:
            # Fallback to Farneback
            flow = cv2.calcOpticalFlowFarneback(
                gray1, gray2, None,
                pyr_scale=0.5, levels=3, winsize=15,
                iterations=3, poly_n=5, poly_sigma=1.2, flags=0
            )

        # Warp frame1 using flow
        h, w = gray1.shape
        flow_map = np.zeros((h, w, 2), dtype=np.float32)
        flow_map[..., 0] = np.arange(w)
        flow_map[..., 1] = np.arange(h)[:, np.newaxis]
        flow_map += flow

        warped = cv2.remap(gray1, flow_map, None, cv2.INTER_LINEAR)

        # Compute L1 error
        l1_error = float(np.mean(np.abs(warped.astype(float) - gray2.astype(float))) / 255.0)

        # Exclude scene cuts (L1 error > 0.3 likely indicates a cut)
        if l1_error <= 0.3:
            errors.append(round(l1_error, 6))

    if not errors:
        return {
            "meanWarpError": 0.0,
            "maxWarpError": 0.0,
            "frameErrors": [],
            "framesAnalyzed": 0,
        }

    return {
        "meanWarpError": round(sum(errors) / len(errors), 6),
        "maxWarpError": round(max(errors), 6),
        "frameErrors": errors,
        "framesAnalyzed": len(errors),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--max-pairs", type=int, default=30)
    args = parser.parse_args()

    pairs = _sample_frame_pairs(args.video, max(1, args.max_pairs))
    result = _compute_flow_warp_errors(pairs)
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
