# Short-Form Archetype Repo Synthesis

Date: 2026-04-29
Status: research report
Scope: local repos marked for short-form research under `vendor/imports-20260423-shortform-github/` and `vendor/imports-20260423-shortform-downloads-direct/direct-repos/`

## Summary

The researched repos do not converge on one universal "TikTok/Reels/Shorts"
architecture. They converge on six repeatable production archetypes:

| Archetype                   | What It Makes                                                                    | Reference Repos                                                                                                                                                  | Primary Runtime                                  |
| --------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Reddit/story over motion    | Reddit or storytime narration over gameplay/background video                     | `raga70/FullyAutomatedRedditVideoMakerBot`, `1Dengaroo/rshorts`, this repo's `reddit-*` skills                                                                   | Python or Remotion                               |
| Longform clip factory       | Podcast/talking-head clips from long media                                       | `SamurAIGPT/AI-Youtube-Shorts-Generator`, `alperensumeroglu/ai-clips-maker`, `imgly/videoclipper`, `eddieoz/reels-clips-automator`, `AgriciDaniel/claude-shorts` | FFmpeg plus CV/ASR, or browser editor            |
| Topic-to-faceless explainer | Scripted short from a prompt/topic with voice, stock/generated visuals, captions | `gyoridavid/short-video-maker`, `rushindrasinha/youtube-shorts-pipeline`, `RayVentura/ShortGPT`                                                                  | Remotion, FFmpeg, MoviePy                        |
| UGC/avatar product short    | Product or business ad with AI actor/avatar, voice, B-roll, subtitles            | `mutonby/openshorts`                                                                                                                                             | Python services plus FFmpeg/Remotion             |
| Motion-graphics lesson      | Quote, lesson, or concept visualized as programmed motion                        | `dr34ming/shorts-project`, `calesthio/OpenMontage`, `DojoCodingLabs/remotion-superpowers`                                                                        | Manim, Remotion, HyperFrames                     |
| Caption/export primitives   | Shared caption, crop, safe-zone, and platform export layer used by all formats   | `AgriciDaniel/claude-shorts`, `whisperX`, `stable-ts`, `faster-whisper`, `libass`, `SubtitleEdit`                                                                | Whisper/faster-whisper, ASS/SRT, Remotion/FFmpeg |

The strongest pattern is audio/transcript-first production. Winning pipelines
usually build a transcript, pick or write a compact segment, align captions,
then assemble visuals around those timestamps. Visuals are either source-media
derived, generated from a scene plan, fetched from stock search, or selected
from persistent reusable assets such as gameplay/background footage.

## Common Build Shape

Across the repos, the practical build order is:

1. Ingest a topic, prompt, URL, or local long video.
2. Produce or extract speech.
3. Transcribe speech to segment and word timestamps.
4. Select the short: either write a script or score transcript ranges.
5. Prepare vertical visual assets: crop, track faces, choose stock/generated
   B-roll, or pull a background/gameplay asset.
6. Add hook overlays and captions.
7. Render a 1080x1920 MP4.
8. Export platform variants for TikTok, Instagram Reels, and YouTube Shorts.

The repo should keep encoding this as skills/flows, not a monolithic CLI.
That matches both this project's direction and the better external references:
agent instructions pick the lane, runtime scripts do the mechanical work, and
reports/assets preserve the evidence.

## Copied Research Assets

Small source materials were copied into
`docs/research/archetypes/assets/20260429/` for durable analysis. These are
not product assets. Treat them as research copies and verify upstream license
terms before reusing any code or media in runtime output.

See `docs/research/archetypes/assets/20260429/MANIFEST.md`.

## Reports In This Set

- `README.md`
- `01-reddit-story-gameplay-20260429.md`
- `02-longform-clip-factory-20260429.md`
- `03-topic-to-faceless-explainer-20260429.md`
- `04-ugc-avatar-product-short-20260429.md`
- `05-motion-graphics-lesson-20260429.md`
- `06-caption-export-primitives-20260429.md`
- `07-source-repo-catalog-20260429.md`
- `08-asset-inventory-and-provenance-20260429.md`
- `09-platform-snapshot-20260429.md`
- `10-extraction-backlog-20260429.md`
