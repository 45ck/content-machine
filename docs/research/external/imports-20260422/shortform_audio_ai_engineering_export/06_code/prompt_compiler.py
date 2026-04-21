"""Prompt compiler for TTS and music generation."""

from __future__ import annotations

from typing import Dict, List


def compile_tts_prompt(
    script: str,
    persona: str = "calm technical authority",
    target_wpm: int = 182,
    keywords: List[str] | None = None,
) -> str:
    keywords = keywords or []
    emphasis = ", ".join(keywords) if keywords else "the main claim and the payoff words"
    return f"""
Generate short-form narration.

Voice identity:
Close-mic, {persona}.

Delivery:
Start immediately.
First sentence sharp and faster.
Pause 250-350 ms after the first sentence.
Lower pitch slightly during the explanation.
Emphasize: {emphasis}.

Pace:
Target {target_wpm - 7}-{target_wpm + 8} WPM.

Avoid:
Announcer voice.
Influencer hype.
Flat AI cadence.
Overacting.

Script:
\"{script}\"
""".strip()


def compile_music_prompt(
    duration_sec: int = 22,
    bpm: int = 122,
    format_type: str = "voice-led explainer",
) -> str:
    return f"""
Create a {duration_sec}-second loop for a vertical short-form {format_type}.

Function:
Support retention and pacing without competing with narration.

Tempo:
{bpm} BPM.

Structure:
0.0s: immediate clean transient, no fade-in.
0.5-4s: simple pulse.
4-10s: add light rhythmic movement.
10-15s: subtle build.
15-19s: small payoff.
19-{duration_sec}s: cleanly loop back to the start.

Instrumentation:
Tight drums, minimal bass, plucked synth motif, light texture.

Mix:
Leave space for spoken voice in the 1-4 kHz region.
No lead vocals.
No famous-song reference.
No named-artist imitation.
Commercial-use safe.
""".strip()


if __name__ == "__main__":
    print(compile_tts_prompt(
        script="Your clip is not too slow. Your audio has no job.",
        keywords=["not too slow", "audio", "no job"],
    ))
    print("\n---\n")
    print(compile_music_prompt())
