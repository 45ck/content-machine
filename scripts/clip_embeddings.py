import argparse
import json
from typing import Any, Dict, List


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _sample_frames(video_path: str, max_frames: int = 8) -> List[Any]:
    """Sample evenly-spaced frames from video."""
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

    if total_frames <= max_frames:
        indices = list(range(total_frames))
    else:
        step = total_frames / max_frames
        indices = [int(i * step) for i in range(max_frames)]

    frames: List[Any] = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frames.append(frame)

    cap.release()
    return frames


def _compute_clip_embeddings(frames: List[Any], model_name: str) -> Any:
    """Extract CLIP embeddings for frames."""
    try:
        import torch  # type: ignore
        import clip  # type: ignore
        from PIL import Image  # type: ignore
        import numpy as np  # type: ignore
    except Exception:
        # CLIP unavailable, return None to trigger fallback
        return None

    device = "cuda" if torch.cuda.is_available() else "cpu"

    try:
        model, preprocess = clip.load(model_name, device=device)
    except Exception:
        # Model load failed, return None to trigger fallback
        return None

    embeddings: List[Any] = []
    for frame in frames:
        rgb = frame[:, :, ::-1]
        pil_image = Image.fromarray(rgb)
        image_input = preprocess(pil_image).unsqueeze(0).to(device)
        with torch.no_grad():
            feat = model.encode_image(image_input)
            feat = feat / feat.norm(dim=-1, keepdim=True)
        embeddings.append(feat.cpu().numpy())

    if not embeddings:
        return None

    import numpy as np
    return np.vstack(embeddings)


def _compute_color_histogram_embeddings(frames: List[Any]) -> Any:
    """Fallback: compute color histograms as embeddings."""
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except Exception as e:
        _fail("opencv-python and numpy required for fallback embeddings", {"error": str(e)})

    histograms: List[Any] = []
    for frame in frames:
        # Compute 3D color histogram (8 bins per channel = 512-dim vector)
        hist = cv2.calcHist([frame], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        hist = hist.flatten()
        hist = hist / (hist.sum() + 1e-8)  # Normalize
        histograms.append(hist)

    return np.array(histograms)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--output", required=True, help="Output .npy path")
    parser.add_argument("--max-frames", type=int, default=8)
    parser.add_argument("--model", default="ViT-B/32", help="CLIP model name")
    args = parser.parse_args()

    frames = _sample_frames(args.video, max_frames=args.max_frames)
    if not frames:
        _fail("no frames sampled from video")

    # Try CLIP first, fall back to color histograms
    embeddings = _compute_clip_embeddings(frames, model_name=args.model)
    method = "clip"
    if embeddings is None:
        embeddings = _compute_color_histogram_embeddings(frames)
        method = "color-histogram"

    # Save embeddings as .npy
    try:
        import numpy as np
        np.save(args.output, embeddings)
    except Exception as e:
        _fail("failed to save embeddings", {"error": str(e), "output": args.output})

    out = {
        "framesProcessed": len(frames),
        "embeddingDim": int(embeddings.shape[1]),
        "outputPath": args.output,
        "method": method,
    }
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
