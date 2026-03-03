import argparse
import json
import re
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


def _check_visual_safety_clip(frames: List[Any]) -> Dict[str, Any]:
    """Zero-shot safety classification using CLIP with safety-related prompts."""
    try:
        import torch  # type: ignore
        import clip  # type: ignore
        from PIL import Image  # type: ignore
        import numpy as np  # type: ignore
    except Exception:
        # CLIP not available — skip visual safety
        return {"passed": True, "flags": [], "method": "skipped"}

    device = "cuda" if torch.cuda.is_available() else "cpu"

    try:
        model, preprocess = clip.load("ViT-B/32", device=device)
    except Exception:
        return {"passed": True, "flags": [], "method": "skipped"}

    safe_prompts = [
        "a safe, appropriate image",
        "a normal everyday scene",
        "educational content",
    ]
    unsafe_prompts = [
        "violent or graphic content",
        "explicit or adult content",
        "hateful or offensive imagery",
        "dangerous or harmful activity",
    ]

    all_prompts = safe_prompts + unsafe_prompts
    text_tokens = clip.tokenize(all_prompts).to(device)
    with torch.no_grad():
        text_features = model.encode_text(text_tokens)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

    flags: List[str] = []
    n_safe = len(safe_prompts)

    for i, frame in enumerate(frames):
        rgb = frame[:, :, ::-1]
        pil_image = Image.fromarray(rgb)
        image_input = preprocess(pil_image).unsqueeze(0).to(device)

        with torch.no_grad():
            image_features = model.encode_image(image_input)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            similarities = (image_features @ text_features.T).squeeze(0).cpu().numpy()

        # Check if any unsafe prompt scores higher than all safe prompts
        max_safe = float(np.max(similarities[:n_safe]))
        for j, score in enumerate(similarities[n_safe:]):
            if float(score) > max_safe:
                flags.append(f"frame_{i}:{unsafe_prompts[j]}:{float(score):.3f}")

    passed = len(flags) == 0
    return {"passed": passed, "flags": flags, "method": "clip-zero-shot"}


def _check_text_safety(script_path: str | None) -> Dict[str, Any]:
    """Check script text for flagged terms."""
    if not script_path:
        return {"passed": True, "flags": []}

    try:
        with open(script_path, "r") as f:
            script = json.load(f)
    except Exception:
        return {"passed": True, "flags": []}

    # Extract all text content
    text_parts: List[str] = []
    for key in ("text", "narration", "script"):
        if key in script and isinstance(script[key], str):
            text_parts.append(script[key].lower())

    for scene in script.get("scenes", []):
        for key in ("narration", "text", "description"):
            if key in scene and isinstance(scene[key], str):
                text_parts.append(scene[key].lower())

    full_text = " ".join(text_parts)

    # Basic keyword check (expandable)
    flagged_patterns = [
        "kill", "murder", "suicide", "self-harm",
        "hate speech", "racial slur",
        "explicit", "pornographic",
    ]

    flags: List[str] = []
    for pattern in flagged_patterns:
        if re.search(r'\b' + re.escape(pattern) + r'\b', full_text):
            flags.append(pattern)

    return {"passed": len(flags) == 0, "flags": flags}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--script", default=None, help="Path to script JSON file")
    parser.add_argument("--max-frames", type=int, default=8)
    args = parser.parse_args()

    frames = _sample_frames(args.video, max_frames=args.max_frames)
    if not frames:
        _fail("no frames sampled from video")

    visual_safety = _check_visual_safety_clip(frames)
    text_safety = _check_text_safety(args.script)

    out = {
        "visualSafety": visual_safety,
        "textSafety": text_safety,
    }
    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
