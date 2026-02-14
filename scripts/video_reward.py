import argparse
import json
from typing import Any, Dict


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _compute_video_reward(video_path: str, prompt: str | None) -> Dict[str, Any]:
    """Compute VideoReward score for video+prompt alignment."""
    try:
        import torch  # type: ignore
        from transformers import pipeline  # type: ignore
    except Exception:
        # VideoReward model unavailable, return fallback
        return {"score": 0.5, "method": "fallback", "reason": "model_unavailable"}

    try:
        # Try to load VideoReward from HuggingFace
        # Note: VideoReward is typically available as a custom model
        # For now, we'll use a placeholder/fallback approach
        device = "cuda" if torch.cuda.is_available() else "cpu"

        # Placeholder: In production, this would load the actual VideoReward model
        # model = pipeline("video-reward", model="VideoReward/VideoRM", device=device)
        # score = model(video_path, text=prompt or "")

        # Fallback: return a neutral score
        return {"score": 0.5, "method": "fallback", "reason": "model_not_implemented"}
    except Exception as e:
        return {"score": 0.5, "method": "fallback", "reason": str(e)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--prompt", default=None, help="Text prompt for alignment scoring")
    args = parser.parse_args()

    result = _compute_video_reward(args.video, args.prompt)
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
