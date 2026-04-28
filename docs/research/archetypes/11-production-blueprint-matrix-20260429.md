# Production Blueprint Matrix

Date: 2026-04-29
Purpose: normalize how the researched short-form archetypes are made.

## Matrix

| Archetype                   | Input                                                 | Core Timing Source                    | Visual Source                                    | Primary Assembly                                          | Required Assets                                                             |
| --------------------------- | ----------------------------------------------------- | ------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| Reddit/story over gameplay  | Reddit URL/post, generated story, confession prompt   | TTS word timestamps                   | Gameplay loop, motion background, Reddit card UI | Remotion or FFmpeg/MoviePy                                | story JSON, voiceover, captions, gameplay/provenance, opener card props     |
| Longform clip factory       | Local video, YouTube URL, podcast/interview recording | ASR word timestamps from source media | Source media crop/reframe                        | FFmpeg extraction plus Remotion/CE.SDK/FFmpeg composition | transcript, candidate clips, approved ranges, crop plan, captions           |
| Topic-to-faceless explainer | Topic, headline, brief, niche profile                 | Generated voiceover timestamps        | Stock footage, generated images/video, cards     | Remotion or FFmpeg                                        | brief, script, voiceover, visual plan, fetched/generated media, music       |
| UGC/avatar product short    | Product URL, offer, manual product brief              | Generated voiceover timestamps        | Avatar/talking-head, product B-roll, proof shots | FFmpeg plus Remotion overlays                             | claim bank, script, actor image, voice, talking-head clip, B-roll, captions |
| Motion graphics lesson      | Script, lesson, quote, concept, timed beats           | Script/voiceover timed beats          | Programmatic scenes/cards/diagrams               | Remotion, Manim, HyperFrames                              | beat plan, scene type map, style tokens, generated frames/components        |
| Caption/export primitives   | Any audio/video plus target platform                  | Word timestamps                       | N/A; overlay layer                               | ASS/SRT, Remotion captions, FFmpeg export                 | caption JSON, font/style preset, safe-zone profile, export profile          |

## Shared Stage Contract

All six lanes can fit this contract:

1. `input`: topic, URL, video, script, product brief, or story.
2. `analysis`: research, transcript, scene detection, or product claim extraction.
3. `selection`: script beats or clip candidates.
4. `approval`: human or agent review gate before expensive render.
5. `timing`: word timestamps, beat timestamps, boundary snapping.
6. `visual_plan`: crop plan, B-roll plan, scene plan, or avatar plan.
7. `assets`: local files with provenance.
8. `compose`: render instruction set.
9. `quality`: visual review, caption readability, audio/sync validation.
10. `publish`: platform-specific export and metadata.

## Cross-Archetype Design Rules

- A short is first a timing object, then a visual object.
- Every asset should have provenance before it enters render.
- Crop/reframe should be stored as data, not only baked into a video.
- Captions should be generated once as structured data and rendered into
  platform-specific styles.
- Hook overlays should be component props, not static screenshots.
- Upload automation should stay outside core generation until auth, policy,
  and consent boundaries are defined.

## Where This Maps Locally

| Stage         | Existing Local Surface                    | Gap                                      |
| ------------- | ----------------------------------------- | ---------------------------------------- |
| `input`       | `brief-to-script`, `source-media-analyze` | product brief/claim-bank schema          |
| `analysis`    | `source-media-analyze`, `media-index`     | text-selection-to-timestamps             |
| `selection`   | `longform-highlight-select`               | shared scoring rubric artifact           |
| `approval`    | `highlight-approval`                      | visual contact sheet approval            |
| `timing`      | `boundary-snap`, `script-to-audio`        | crop-aware timing metadata               |
| `visual_plan` | `timestamps-to-visuals`                   | motion grammar and avatar plan fields    |
| `compose`     | `video-render`                            | per-archetype render presets             |
| `quality`     | `publish-prep-review`, validators         | platform safe-zone and first-frame gates |
