"""End-to-end pipeline skeleton.

This is a scaffold, not a complete production system.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class ContentBrief:
    topic: str
    format_type: str
    objective: str
    platform: str
    duration_sec: float
    script: str


@dataclass
class AudioCandidate:
    candidate_id: str
    voice_prompt: str
    music_prompt: str
    sfx_plan: List[str]
    features: Dict[str, float]
    risk_score: float
    predicted_reward: float = 0.0


def choose_audio_role(brief: ContentBrief) -> str:
    if brief.objective in {"teach", "explain", "save_rate", "persuade"}:
        return "voice_authority"
    if brief.objective in {"reach", "relatable", "meme", "share_rate"}:
        return "trend_template"
    if brief.format_type in {"before_after", "build_log", "workout", "montage"}:
        return "music_montage"
    if brief.format_type in {"product_demo", "cooking", "repair", "unboxing"}:
        return "foley_sensory"
    return "voice_authority"


def score_candidate(candidate: AudioCandidate) -> float:
    from score_audio import viral_audio_score

    vas = viral_audio_score(candidate.features)
    reward = vas / 100.0 - 0.5 * candidate.risk_score
    return reward


def select_candidate(candidates: List[AudioCandidate]) -> AudioCandidate:
    for c in candidates:
        c.predicted_reward = score_candidate(c)
    return max(candidates, key=lambda c: c.predicted_reward)


def main() -> None:
    brief = ContentBrief(
        topic="short-form audio",
        format_type="dev_explainer",
        objective="save_rate",
        platform="TikTok",
        duration_sec=22,
        script="Your clip is not too slow. Your audio has no job.",
    )
    role = choose_audio_role(brief)
    print({"recommended_role": role})


if __name__ == "__main__":
    main()
