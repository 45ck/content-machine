import argparse
import json
from typing import Any, Dict


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _compute_intern_video_similarity(video_path: str, text: str | None) -> Dict[str, Any]:
    """Compute InternVideo2 video-text similarity."""
    try:
        import torch  # type: ignore
        from transformers import AutoModel  # type: ignore
    except Exception:
        # InternVideo2 unavailable, return fallback
        return {"similarity": 0.5, "method": "fallback", "reason": "model_unavailable"}

    try:
        # Try to load InternVideo2 from HuggingFace
        device = "cuda" if torch.cuda.is_available() else "cpu"

        # Placeholder: In production, this would load the actual InternVideo2 model
        # model = AutoModel.from_pretrained("OpenGVLab/InternVideo2", trust_remote_code=True)
        # model = model.to(device)
        # similarity = model.compute_similarity(video_path, text or "")

        # Fallback: return a neutral score
        return {"similarity": 0.5, "method": "fallback", "reason": "model_not_implemented"}
    except Exception as e:
        return {"similarity": 0.5, "method": "fallback", "reason": str(e)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--text", default=None, help="Text for video-text similarity")
    args = parser.parse_args()

    result = _compute_intern_video_similarity(args.video, args.text)
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
