# Caption Timing And Rendering Deep Dive

Date: 2026-04-29

## Purpose

Caption quality is one of the clearest gaps between a basic generated video
and a platform-native short. The deeper repo pass shows that good systems do
not treat captions as a late subtitle export. They preserve word timing,
grouping, style, safe-zone placement, and render verification as durable
artifacts.

## Source Signals

| Source                                   | Signal                                                                                           | Content-machine takeaway                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `m-bain__whisperX`                       | Batched ASR, VAD, wav2vec2 alignment, speaker diarization                                        | Split transcript, word timing, confidence, and speaker labels    |
| `jianfch__stable-ts`                     | Whisper timestamp stabilization, regrouping, locating, silence suppression                       | Add a timestamp refinement pass after raw ASR                    |
| `linto-ai__whisper-timestamped`          | Word-level timestamps and confidence from Whisper attention plus VAD                             | Store word confidence and flag hallucination-prone regions       |
| `tkarabela__pysubs2`                     | Subtitle manipulation across ASS, SRT, WebVTT, TTML, and Whisper exports                         | Make subtitle retiming and format export a utility stage         |
| `1Dengaroo__rshorts`                     | Word-caption render schema with font, placement, stroke, highlight, offsets, linger, transitions | Promote caption style from props to `caption-recipe.v1.json`     |
| `remotion-dev__template-prompt-to-video` | Timeline text and audio blocks assembled by Remotion                                             | Treat captions as timeline elements, not only subtitle files     |
| CapCut/Aegisub/libass patterns           | ASS styling, karaoke timing, and mobile-first burned-in captions                                 | Keep export captions and burned-in captions as separate products |

## Caption Stack

1. `audio-analysis.v1.json`
   - Stores source audio identity, loudness, speech/music regions, silence
     regions, diarization, and language hints.
   - Should be produced before captions, clip scoring, and audio ducking.

2. `word-timestamps.v2.json`
   - Stores normalized words with `start_sec`, `end_sec`, `confidence`,
     `speaker_id`, `source_engine`, and alignment warnings.
   - Raw ASR words and refined words should be distinguishable.

3. `caption-groups.v1.json`
   - Converts words into visual caption chunks.
   - Stores max words, max lines, reading speed, punctuation grouping, and
     forced line breaks.

4. `caption-recipe.v1.json`
   - Stores the archetype-specific visual treatment.
   - Includes font, case, active-word highlight, stroke/shadow, placement,
     safe-zone, animation, linger, and jitter policy.

5. `caption-render-plan.v1.json`
   - Joins groups and recipe into actual timeline cues.
   - Stores frame numbers, CSS/ASS/render props, platform target, and collision
     checks.

6. `caption-export-report.v1.json`
   - Records burned-in render status plus optional sidecar exports.
   - Stores SRT/VTT/ASS paths, OCR or pixel validation, overlap warnings, and
     readability score.

## Implementation Notes

The strongest repo pattern is a two-layer model: timing artifacts are factual,
while caption recipes are creative. This lets a user change caption styling
without rerunning ASR, and lets publish review fail a render for poor caption
placement without claiming the transcript is wrong.

`rshorts` is the most directly transferable schema reference. It keeps
caption words separate from the Remotion composition props and exposes
placement, font, highlight, stroke, transition, offset, and linger. That maps
cleanly to the existing content-machine render pipeline.

WhisperX, stable-ts, and whisper-timestamped all reinforce that raw ASR timing
is not enough for high-quality shorts. A production path should mark which
words were raw, aligned, stabilized, or low-confidence.

## Quality Gates

- Captions must not collide with platform chrome or faces unless intentionally
  approved.
- Active-word highlights must stay aligned within an allowed frame tolerance.
- No caption group should exceed the archetype recipe's max words, max lines,
  or reading-speed limit.
- Low-confidence ASR regions should be reviewed before publish.
- Burned-in captions and sidecar subtitles must be traceable to the same word
  timing source.
- Render review should catch black gutters, boxed source media, and text
  outside safe zones in the same report.

## Bead Targets

This report supports:

- `content-machine-ar4`: platform export and safe-zone validators.
- `content-machine-ar9`: caption recipe and related artifact targets.
- `content-machine-ar10`: caption timing and render plan artifacts.
