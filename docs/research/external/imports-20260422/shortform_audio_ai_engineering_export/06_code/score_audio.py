"""Viral Audio Score scaffold."""

from __future__ import annotations

from typing import Dict


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def viral_audio_score(f: Dict[str, float]) -> float:
    """Calculate a 0-100 Viral Audio Score from normalized feature values.

    Expected keys are *_score or *_norm values in [0, 1].
    Missing optional keys default to conservative values.
    """
    sonic_event = 1.0 if f.get("first_sound_ms", 9999) <= 500 else 0.0
    voice_start = 1.0 if f.get("first_voice_ms", 9999) <= 1000 else 0.0

    transient_strength = clamp01(
        0.4 * f.get("rms_first_500ms_norm", 0.0)
        + 0.3 * f.get("onset_density_norm", 0.0)
        + 0.3 * f.get("spectral_centroid_first_500ms_norm", 0.0)
    )

    hook = (
        0.35 * sonic_event
        + 0.25 * voice_start
        + 0.20 * transient_strength
        + 0.20 * f.get("semantic_hook_score", 0.0)
    )

    clarity = (
        0.45 * f.get("voice_music_separation_score", 0.5)
        + 0.25 * f.get("speech_intelligibility_score", 0.5)
        + 0.20 * f.get("caption_alignment_score", 0.5)
        + 0.10 * (1 - f.get("noise_score", 0.2))
    )

    arousal_fit = 1 - abs(f.get("arousal", 0.5) - f.get("target_arousal", 0.6))

    score = (
        0.18 * hook
        + 0.16 * clarity
        + 0.15 * clamp01(arousal_fit)
        + 0.13 * f.get("beat_cut_alignment", 0.5)
        + 0.13 * f.get("audiovisual_congruence", 0.5)
        + 0.10 * f.get("loop_score", 0.5)
        + 0.08 * f.get("template_score", 0.5)
        + 0.04 * f.get("brand_memory_score", 0.5)
        - 0.03 * f.get("risk_score", 0.2)
    )

    return round(100 * clamp01(score), 2)


if __name__ == "__main__":
    example = {
        "first_sound_ms": 0,
        "first_voice_ms": 240,
        "rms_first_500ms_norm": 0.8,
        "onset_density_norm": 0.6,
        "spectral_centroid_first_500ms_norm": 0.7,
        "semantic_hook_score": 0.9,
        "voice_music_separation_score": 0.8,
        "speech_intelligibility_score": 0.85,
        "caption_alignment_score": 0.75,
        "noise_score": 0.1,
        "arousal": 0.65,
        "target_arousal": 0.6,
        "beat_cut_alignment": 0.7,
        "audiovisual_congruence": 0.75,
        "loop_score": 0.6,
        "template_score": 0.5,
        "brand_memory_score": 0.4,
        "risk_score": 0.1,
    }
    print(viral_audio_score(example))
