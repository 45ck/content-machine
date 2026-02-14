import argparse
import json
from typing import Any, Dict, List


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _sample_frames(video_path: str, max_frames: int = 16) -> List[Any]:
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

    # Evenly space frame indices
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


def _load_scene_descriptions(script_path: str) -> List[str]:
    """Extract scene descriptions from a script JSON file."""
    try:
        with open(script_path, "r") as f:
            script = json.load(f)
    except Exception as e:
        _fail("failed to read script file", {"error": str(e), "path": script_path})

    descriptions: List[str] = []

    # Try common script structures
    scenes = script.get("scenes", [])
    if not scenes:
        scenes = script.get("segments", [])

    for scene in scenes:
        desc = scene.get("description") or scene.get("visual") or scene.get("prompt") or ""
        if desc:
            descriptions.append(str(desc))

    # Fallback: use the whole script text if no scenes found
    if not descriptions:
        text = script.get("text") or script.get("narration") or script.get("script") or ""
        if text:
            descriptions.append(str(text))

    return descriptions


def _compute_clip_similarity(
    frames: List[Any], descriptions: List[str], model_name: str
) -> Dict[str, Any]:
    """Compute CLIP cosine similarity between frames and text descriptions."""
    try:
        import torch  # type: ignore
        import clip  # type: ignore
        from PIL import Image  # type: ignore
        import numpy as np  # type: ignore
    except Exception as e:
        _fail("torch, clip, Pillow, and numpy are required for CLIP", {"error": str(e)})

    device = "cuda" if torch.cuda.is_available() else "cpu"

    try:
        model, preprocess = clip.load(model_name, device=device)
    except Exception as e:
        _fail(f"failed to load CLIP model '{model_name}'", {"error": str(e)})

    # Encode frames
    frame_features: List[Any] = []
    for frame in frames:
        # Convert BGR (OpenCV) to RGB PIL Image
        rgb = frame[:, :, ::-1]
        pil_image = Image.fromarray(rgb)
        image_input = preprocess(pil_image).unsqueeze(0).to(device)
        with torch.no_grad():
            feat = model.encode_image(image_input)
            feat = feat / feat.norm(dim=-1, keepdim=True)
        frame_features.append(feat.cpu())

    if not frame_features:
        return {"mean": 0.0, "min": 0.0, "p10": 0.0}

    frame_features_tensor = torch.cat(frame_features, dim=0)

    # Encode text descriptions
    if not descriptions:
        return {"mean": 0.0, "min": 0.0, "p10": 0.0}

    text_tokens = clip.tokenize(descriptions, truncate=True).to(device)
    with torch.no_grad():
        text_features = model.encode_text(text_tokens)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)
    text_features = text_features.cpu()

    # Compute similarity matrix: [num_frames x num_descriptions]
    sim_matrix = (frame_features_tensor @ text_features.T).numpy()

    # For each description, take the max similarity across frames
    per_desc_max = sim_matrix.max(axis=0).tolist()

    # Aggregate
    all_scores = per_desc_max
    if not all_scores:
        return {"mean": 0.0, "min": 0.0, "p10": 0.0}

    mean_score = float(np.mean(all_scores))
    min_score = float(np.min(all_scores))
    p10_score = float(np.percentile(all_scores, 10)) if len(all_scores) >= 2 else min_score

    return {"mean": round(mean_score, 4), "min": round(min_score, 4), "p10": round(p10_score, 4)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--script", required=True, help="Path to script JSON file")
    parser.add_argument("--max-frames", type=int, default=16)
    parser.add_argument("--model", default="ViT-B/32", help="CLIP model name")
    args = parser.parse_args()

    frames = _sample_frames(args.video, max_frames=args.max_frames)
    if not frames:
        _fail("no frames sampled from video")

    descriptions = _load_scene_descriptions(args.script)
    if not descriptions:
        _fail("no scene descriptions found in script", {"script": args.script})

    clip_score = _compute_clip_similarity(frames, descriptions, model_name=args.model)

    out = {
        "clipScore": clip_score,
        "scenesEvaluated": len(descriptions),
        "framesAnalyzed": len(frames),
    }
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
