"""Audio feature extraction scaffold for short-form audio experiments.

Usage:
    python extract_audio_features.py path/to/audio.wav
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict

import librosa
import numpy as np


def _safe_mean(x: np.ndarray) -> float:
    return float(np.mean(x)) if x.size else 0.0


def extract_audio_features(path: str, sr: int = 22050) -> Dict[str, Any]:
    """Extract baseline interpretable audio features."""
    y, sample_rate = librosa.load(path, sr=sr, mono=True)
    duration = librosa.get_duration(y=y, sr=sample_rate)

    rms = librosa.feature.rms(y=y)[0]
    centroid = librosa.feature.spectral_centroid(y=y, sr=sample_rate)[0]
    zcr = librosa.feature.zero_crossing_rate(y)[0]
    mfcc = librosa.feature.mfcc(y=y, sr=sample_rate, n_mfcc=20)
    onset_env = librosa.onset.onset_strength(y=y, sr=sample_rate)

    try:
        tempo_arr = librosa.feature.tempo(onset_envelope=onset_env, sr=sample_rate)
        tempo = float(tempo_arr[0])
    except Exception:
        tempo = 0.0

    first_500 = y[: int(0.5 * sample_rate)]
    rms_first_500 = float(np.sqrt(np.mean(first_500 ** 2))) if first_500.size else 0.0

    if first_500.size:
        centroid_first = librosa.feature.spectral_centroid(y=first_500, sr=sample_rate)[0]
        centroid_first_mean = _safe_mean(centroid_first)
    else:
        centroid_first_mean = 0.0

    silence_threshold = 0.01
    silence_ratio = float(np.mean(np.abs(y) < silence_threshold)) if y.size else 1.0

    return {
        "path": str(path),
        "duration_sec": float(duration),
        "mean_rms": _safe_mean(rms),
        "rms_first_500ms": rms_first_500,
        "dynamic_range": float(np.max(rms) - np.min(rms)) if rms.size else 0.0,
        "spectral_centroid_mean": _safe_mean(centroid),
        "spectral_centroid_first_500ms": centroid_first_mean,
        "zero_crossing_rate": _safe_mean(zcr),
        "tempo_bpm": tempo,
        "onset_density": _safe_mean(onset_env),
        "silence_ratio": silence_ratio,
        "mfcc_mean": np.mean(mfcc, axis=1).tolist(),
        "mfcc_std": np.std(mfcc, axis=1).tolist(),
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python extract_audio_features.py path/to/audio.wav")
    features = extract_audio_features(sys.argv[1])
    print(json.dumps(features, indent=2))
