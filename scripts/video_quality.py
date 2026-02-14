import argparse
import json
import subprocess
import re
from typing import Any, Dict, List, Tuple


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


def _brisque_scores(frames: List[Any]) -> List[float]:
    try:
        import torch  # type: ignore
        import piq  # type: ignore
    except Exception as e:
        _fail("piq and torch are required for BRISQUE", {"error": str(e)})

    scores: List[float] = []
    for frame in frames:
        # frame is BGR uint8 (OpenCV), convert to RGB float tensor in [0, 1]
        rgb = frame[:, :, ::-1].copy()
        tensor = torch.from_numpy(rgb).float() / 255.0
        tensor = tensor.permute(2, 0, 1).unsqueeze(0)  # [1, 3, H, W]
        with torch.no_grad():
            score = piq.brisque(tensor, data_range=1.0)
        scores.append(float(score.item()))
    return scores


def _niqe_scores(frames: List[Any]) -> List[float] | None:
    """Compute NIQE scores using piq. Returns None if piq.niqe is unavailable."""
    try:
        import torch  # type: ignore
        import piq  # type: ignore
    except Exception:
        return None

    if not hasattr(piq, "niqe"):
        return None

    scores: List[float] = []
    for frame in frames:
        rgb = frame[:, :, ::-1].copy()
        tensor = torch.from_numpy(rgb).float() / 255.0
        tensor = tensor.permute(2, 0, 1).unsqueeze(0)  # [1, 3, H, W]
        with torch.no_grad():
            score = piq.niqe(tensor, data_range=1.0)
        scores.append(float(score.item()))
    return scores


def _cambi_scores(video_path: str, ffmpeg_path: str = "ffmpeg") -> Dict[str, float] | None:
    """Compute CAMBI banding index via FFmpeg libvmaf filter. Returns None if unavailable."""
    try:
        result = subprocess.run(
            [
                ffmpeg_path,
                "-i", video_path,
                "-lavfi", "libvmaf=feature=name=cambi",
                "-f", "null", "-",
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None

    # Parse CAMBI scores from ffmpeg stderr
    # Lines like: [libvmaf ... ] CAMBI score: 1.234
    scores: List[float] = []
    for line in result.stderr.splitlines():
        match = re.search(r"CAMBI score:\s*([\d.]+)", line)
        if match:
            scores.append(float(match.group(1)))

    if not scores:
        return None

    return {
        "mean": sum(scores) / len(scores),
        "max": max(scores),
    }


def _summarize(values: List[float]) -> Tuple[float, float, float]:
    if not values:
        return 0.0, 0.0, 0.0
    mean = sum(values) / len(values)
    return mean, min(values), max(values)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--sample-rate", type=int, default=30)
    parser.add_argument("--ffmpeg-path", default="ffmpeg")
    parser.add_argument("--skip-niqe", action="store_true", help="Skip NIQE computation")
    parser.add_argument("--skip-cambi", action="store_true", help="Skip CAMBI computation")
    args = parser.parse_args()

    frames = _sample_frames(args.video, max(1, args.sample_rate))
    if not frames:
        _fail("no frames sampled from video", {"sampleRate": args.sample_rate})

    scores = _brisque_scores(frames)
    mean, min_v, max_v = _summarize(scores)

    out: Dict[str, Any] = {
        "brisque": {"mean": mean, "min": min_v, "max": max_v},
        "framesAnalyzed": len(scores),
    }

    # NIQE (optional — gracefully degrade if unavailable)
    if not args.skip_niqe:
        niqe = _niqe_scores(frames)
        if niqe is not None:
            n_mean, n_min, n_max = _summarize(niqe)
            out["niqe"] = {"mean": n_mean, "min": n_min, "max": n_max}

    # CAMBI (optional — gracefully degrade if ffmpeg lacks libvmaf)
    if not args.skip_cambi:
        cambi = _cambi_scores(args.video, ffmpeg_path=args.ffmpeg_path)
        if cambi is not None:
            out["cambi"] = cambi

    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
