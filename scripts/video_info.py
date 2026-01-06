import argparse
import json
import subprocess
from typing import Any, Dict, Optional


def _parse_fraction(value: Optional[str]) -> Optional[float]:
    if not value:
        return None
    value = value.strip()
    if not value or value == "0/0":
        return None
    if "/" not in value:
        try:
            return float(value)
        except ValueError:
            return None
    num_s, den_s = value.split("/", 1)
    try:
        num = float(num_s)
        den = float(den_s)
    except ValueError:
        return None
    if den == 0:
        return None
    return num / den


def _ffprobe_json(video_path: str, ffprobe_path: str) -> Dict[str, Any]:
    proc = subprocess.run(
        [
            ffprobe_path,
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            video_path,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(proc.stdout)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--ffprobe", default="ffprobe")
    args = parser.parse_args()

    try:
        data = _ffprobe_json(args.video, args.ffprobe)
        streams = data.get("streams", []) or []
        fmt = data.get("format", {}) or {}

        video = next((s for s in streams if s.get("codec_type") == "video"), None) or {}
        audio = next((s for s in streams if s.get("codec_type") == "audio"), None) or {}

        width = video.get("width")
        height = video.get("height")
        duration_s = fmt.get("duration")
        bitrate_s = fmt.get("bit_rate")

        fps = _parse_fraction(video.get("avg_frame_rate")) or _parse_fraction(
            video.get("r_frame_rate")
        )

        out = {
            "width": int(width) if width is not None else None,
            "height": int(height) if height is not None else None,
            "duration": float(duration_s) if duration_s is not None else None,
            "container": (fmt.get("format_name") or "").split(",")[0].strip() or None,
            "codec": video.get("codec_name") or None,
            "audioCodec": audio.get("codec_name") or None,
            "fps": fps,
            "bitrate": int(bitrate_s) if bitrate_s is not None else None,
        }

        print(json.dumps(out))
        return 0
    except Exception as e:
        print(json.dumps({"error": {"message": str(e)}}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

