import argparse
import json
import subprocess
import re
from typing import Any, Dict


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _loudness_via_ffmpeg(
    media_path: str, ffmpeg_path: str = "ffmpeg"
) -> Dict[str, float] | None:
    """Measure loudness using ffmpeg loudnorm filter (EBU R128)."""
    try:
        result = subprocess.run(
            [
                ffmpeg_path,
                "-i", media_path,
                "-af", "loudnorm=print_format=json",
                "-f", "null", "-",
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None

    # The loudnorm filter prints JSON to stderr after processing
    # Find the JSON block in stderr
    stderr = result.stderr
    json_start = stderr.rfind("{")
    json_end = stderr.rfind("}") + 1
    if json_start == -1 or json_end == 0:
        return None

    try:
        data = json.loads(stderr[json_start:json_end])
    except json.JSONDecodeError:
        return None

    loudness = {}
    if "input_i" in data:
        loudness["integratedLUFS"] = float(data["input_i"])
    if "input_tp" in data:
        loudness["truePeakDBFS"] = float(data["input_tp"])
    if "input_lra" in data:
        loudness["loudnessRange"] = float(data["input_lra"])
    if "input_thresh" in data:
        loudness["threshold"] = float(data["input_thresh"])

    return loudness if loudness else None


def _detect_clipping(
    media_path: str, ffmpeg_path: str = "ffmpeg"
) -> Dict[str, float] | None:
    """Detect clipping using ffmpeg astats filter."""
    try:
        result = subprocess.run(
            [
                ffmpeg_path,
                "-i", media_path,
                "-af", "astats=metadata=1:reset=0",
                "-f", "null", "-",
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None

    stderr = result.stderr

    # Parse overall stats from astats output
    stats: Dict[str, float] = {}

    # Number of clipped samples
    match = re.search(r"Number of samples:\s*(\d+)", stderr)
    total_samples = int(match.group(1)) if match else 0

    match = re.search(r"Number of NaNs:\s*(\d+)", stderr)
    # Not relevant for clipping, skip

    # Peak level
    match = re.search(r"Peak level dB:\s*([-\d.]+)", stderr)
    if match:
        stats["peakLevelDB"] = float(match.group(1))

    # Flat factor (consecutive identical samples — indicates clipping)
    match = re.search(r"Flat factor:\s*([\d.]+)", stderr)
    if match:
        stats["flatFactor"] = float(match.group(1))

    # Clipping ratio from peak count
    # Samples at or above 0 dBFS indicate clipping
    match = re.search(r"Number of Infs:\s*(\d+)", stderr)
    infs = int(match.group(1)) if match else 0

    if total_samples > 0:
        stats["clippingRatio"] = infs / total_samples
    else:
        stats["clippingRatio"] = 0.0

    return stats if stats else None


def _snr_estimate(
    media_path: str, ffmpeg_path: str = "ffmpeg"
) -> float | None:
    """Estimate SNR using ffmpeg silencedetect + overall RMS."""
    try:
        # Get overall RMS
        result = subprocess.run(
            [
                ffmpeg_path,
                "-i", media_path,
                "-af", "astats=metadata=1:reset=0",
                "-f", "null", "-",
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None

    stderr = result.stderr

    rms_match = re.search(r"RMS level dB:\s*([-\d.]+)", stderr)
    noise_match = re.search(r"Noise floor dB:\s*([-\d.]+)", stderr)

    if rms_match and noise_match:
        try:
            rms_db = float(rms_match.group(1))
            noise_db = float(noise_match.group(1))
            return rms_db - noise_db
        except ValueError:
            return None

    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--media", required=True, help="Path to video or audio file")
    parser.add_argument("--ffmpeg-path", default="ffmpeg")
    args = parser.parse_args()

    out: Dict[str, Any] = {}

    # Loudness (LUFS)
    loudness = _loudness_via_ffmpeg(args.media, ffmpeg_path=args.ffmpeg_path)
    if loudness:
        out["loudnessLUFS"] = loudness.get("integratedLUFS", 0.0)
        out["truePeakDBFS"] = loudness.get("truePeakDBFS", 0.0)
        out["loudnessRange"] = loudness.get("loudnessRange", 0.0)
    else:
        _fail("failed to measure loudness", {"media": args.media})

    # Clipping detection
    clipping = _detect_clipping(args.media, ffmpeg_path=args.ffmpeg_path)
    if clipping:
        out["clippingRatio"] = clipping.get("clippingRatio", 0.0)
        out["peakLevelDB"] = clipping.get("peakLevelDB", 0.0)
    else:
        out["clippingRatio"] = 0.0
        out["peakLevelDB"] = 0.0

    # SNR estimate
    snr = _snr_estimate(args.media, ffmpeg_path=args.ffmpeg_path)
    if snr is not None:
        out["snrDB"] = snr
    else:
        out["snrDB"] = 0.0

    print(json.dumps(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
