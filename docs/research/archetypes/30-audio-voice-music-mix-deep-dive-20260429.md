# Audio, Voice, Music, And Mix Deep Dive

Date: 2026-04-29

## Purpose

Audio quality carries short-form retention as much as visuals. The deeper repo
pass shows recurring patterns: TTS provider abstraction, voice assignment,
speech-rate control, exact audio duration measurement, background music,
ducking, SFX placement, and final audio spotchecks.

## Source Signals

| Source                                             | Signal                                                                                                           | Content-machine takeaway                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `chenwr727__AI-Short-Video-Engine` TTS services    | Provider-specific TTS wrappers, multiple voices, speed parameter, per-dialogue audio files, duration measurement | Store voice casting and generated audio segment metadata             |
| `chenwr727__AI-Short-Video-Engine` video utilities | Composes narration clips, background audio, and subtitles against audio duration                                 | Timing should follow actual audio, not script estimates              |
| `RayVentura__ShortGPT` audio module                | Voice modules, audio duration, speed-up to fit target duration, words/chars per second                           | Add controlled duration repair, not blind script truncation          |
| `digitalsamba__claude-code-video-toolkit`          | Voiceover generation, music generation, add-music tooling, cost notes                                            | Music and voice are provider choices with cost and review impact     |
| Current `src/audio/mix`                            | Mix plan supports music, SFX, ambience, ducking, fades, presets, LUFS target                                     | Good base; add rendered mix review and per-scene audio intent        |
| Current `publish-prep`                             | Audio-signal validation and caption sync gate                                                                    | Good final check; add mix-plan compliance and intelligibility status |

## Artifact Stack

### `voice-cast.v1.json`

Purpose: choose voice per speaker, archetype, and language.

Fields:

- `speaker_id`
- `voice_provider`
- `voice_id`
- `language`
- `tone`
- `speed`
- `reason`
- `fallback_voice`

### `audio-segments.v1.json`

Purpose: record actual generated audio units.

Fields:

- `segment_id`
- `speaker_id`
- `text`
- `audio_path`
- `duration_sec`
- `provider`
- `model`
- `cost_usd`
- `retry_count`
- `timing_source`

### `audio-mix-plan.v2.json`

Purpose: extend the existing mix plan with scene intent and review thresholds.

Additional fields:

- `scene_audio_intent`
- `music_mood`
- `music_source`
- `ducking_policy`
- `sfx_policy`
- `lufs_target`
- `peak_limit_db`
- `intelligibility_required`

### `audio-review.v1.json`

Purpose: verify the rendered mix.

Fields:

- `narration_present`
- `music_present`
- `unexpected_silence`
- `clipping_detected`
- `ducking_effective`
- `voice_intelligible`
- `caption_audio_drift_ms`
- `issues`

## Implementation Delta

Content-machine already has TTS, ASR, alignment, drift checks, and mix plans.
The missing link is a durable chain from planned voice casting to generated
segments to final mix review.

Music and SFX should be treated like editorial choices. A clean educational
short may need no SFX. A product reveal may need risers and impact hits. A
Reddit story may need quiet background music but must keep narration dominant.

## Quality Gates

- Voice duration must be measured after generation.
- Caption timing must use actual audio timing or reconciled ASR timing.
- Music must not mask narration.
- Speech-rate repair must stay within a configured comfort range.
- Final review must fail unexpected silence, clipping, or unintelligible mix.

## Bead Targets

This report supports:

- `content-machine-ar10`: caption timing and render-plan artifacts.
- `content-machine-ar17`: final review bundle and cost governance.
- `content-machine-ar20`: audio voice, music, and mix artifacts.
