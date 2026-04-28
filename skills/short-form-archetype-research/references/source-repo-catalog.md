# Source Repo Catalog

Date: 2026-04-29
Scope: local short-form research repos in `vendor/`

## Highest-Signal Repos

| Repo                                       | Archetype Signal             | Useful Assets / Patterns                                                                                |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `AgriciDaniel/claude-shorts`               | Longform clip factory        | 10-step agent pipeline, transcript scoring, caption presets, platform exports, Remotion render patterns |
| `SamurAIGPT/AI-Youtube-Shorts-Generator`   | Longform clip factory        | Whisper plus GPT highlight selection, static face crop, screen-recording crop, subtitle burn-in         |
| `imgly/videoclipper`                       | Browser clip factory         | Text-selection-to-timestamps, client-side non-destructive editing, CE.SDK preview/export                |
| `alperensumeroglu/ai-clips-maker`          | Longform analysis primitives | WhisperX, Pyannote diarization, scene detection, active speaker crop                                    |
| `gyoridavid/short-video-maker`             | Topic-to-faceless explainer  | Scene planning, Kokoro TTS, Whisper captions, Pexels search, Remotion render, REST/MCP surface          |
| `rushindrasinha/youtube-shorts-pipeline`   | Niche-driven faceless engine | Niche profiles that shape research, script, visuals, voice, captions, music, metadata                   |
| `RayVentura/ShortGPT`                      | Prompt/template engine       | Engine subclasses, editing-step JSON, asset DB, prompt templates, MoviePy pipeline                      |
| `mutonby/openshorts`                       | UGC/avatar and clip platform | Clip generator, AI Shorts, actor/avatar generation, hook overlays, subtitles, publishing flow           |
| `raga70/FullyAutomatedRedditVideoMakerBot` | Reddit over gameplay         | Background video pools, one-word captions, multi-platform upload automation                             |
| `1Dengaroo/rshorts`                        | Reddit web app               | Next.js/Remotion Lambda preview and render workflow                                                     |
| `dr34ming/shorts-project`                  | Motion graphics lesson       | Manim transcript format, demographic profiles, template evolution, viral title animations               |
| `calesthio/OpenMontage`                    | Agent-first architecture     | Pipeline manifests, stage skills, style playbooks, canonical artifacts                                  |
| `DojoCodingLabs/remotion-superpowers`      | Agent command pack           | Short creation command, video director/media scout/review roles                                         |

## Repo Pattern Groups

### Agent-Led Pipelines

These repos encode process in Markdown/YAML instructions and leave the agent
to orchestrate stages:

- `AgriciDaniel/claude-shorts`
- `calesthio/OpenMontage`
- `DojoCodingLabs/remotion-superpowers`
- `rushindrasinha/youtube-shorts-pipeline`

This matches this repo's skill-first direction. The important extraction is
not "copy the runtime"; it is "turn the useful stage checklists into local
skills, flows, recipes, and optional runtime scripts."

### Deterministic Runtime Pipelines

These repos are useful for mechanical operations:

- `SamurAIGPT/AI-Youtube-Shorts-Generator`
- `gyoridavid/short-video-maker`
- `RayVentura/ShortGPT`
- `raga70/FullyAutomatedRedditVideoMakerBot`

They show how to implement crop, caption, TTS, B-roll, and export operations
with FFmpeg, MoviePy, Remotion, Whisper, and provider SDKs.

### Product/Platform Repos

These repos show complete user workflows:

- `mutonby/openshorts`
- `imgly/videoclipper`
- `1Dengaroo/rshorts`

They are useful for preview/approval flows, galleries, batch jobs, and public
output management.

## What Not To Import Blindly

- Unofficial upload automation that relies on cookies or browser login tokens.
- Background footage with unclear source or reuse rights.
- API key rotation patterns.
- Large UI apps that duplicate this repo's skill/harness direction.
- Burned-in text styles that ignore platform safe zones.
