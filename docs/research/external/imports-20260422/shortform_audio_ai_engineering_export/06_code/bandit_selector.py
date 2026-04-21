"""Simple Thompson-sampling selector for audio strategies."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Dict


@dataclass
class BetaArm:
    alpha: float = 1.0
    beta: float = 1.0

    def sample(self) -> float:
        return random.betavariate(self.alpha, self.beta)

    def update(self, reward: int) -> None:
        if reward:
            self.alpha += 1
        else:
            self.beta += 1


class AudioBandit:
    def __init__(self, strategies: list[str]):
        self.arms: Dict[str, BetaArm] = {s: BetaArm() for s in strategies}

    def select(self) -> str:
        return max(self.arms, key=lambda s: self.arms[s].sample())

    def update(self, strategy: str, audio_lift_positive: bool) -> None:
        self.arms[strategy].update(1 if audio_lift_positive else 0)


if __name__ == "__main__":
    bandit = AudioBandit(["voice", "trend", "music", "foley", "comedy", "brand"])
    chosen = bandit.select()
    print({"chosen_strategy": chosen})
    bandit.update(chosen, audio_lift_positive=True)
