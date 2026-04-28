# Archetype Asset Pack Spec

Date: 2026-04-29
Purpose: define what "assets" means for each archetype so future runs can
produce durable, reviewable folders.

## Folder Shape

Each produced short should be able to emit this shape:

```text
run/
  input/
  analysis/
  selection/
  timing/
  visual-plan/
  assets/
  render/
  review/
  publish/
  provenance.json
```

## Required Files By Archetype

### Reddit/story over gameplay

- `input/story.json`
- `timing/voiceover-words.json`
- `assets/voiceover.wav`
- `assets/background-video.json`
- `assets/background-video.mp4`
- `visual-plan/reddit-card.json`
- `render/captions.ass`
- `review/contact-sheet.jpg`
- `provenance.json`

### Longform clip factory

- `input/source-media.json`
- `analysis/transcript.json`
- `analysis/scenes.json`
- `selection/candidates.json`
- `selection/approved.json`
- `timing/snapped-segments.json`
- `visual-plan/crop-plan.json`
- `assets/clip-*.mp4`
- `render/clip-*.mp4`
- `review/contact-sheet-*.jpg`

### Topic-to-faceless explainer

- `input/brief.json`
- `analysis/research-notes.json`
- `selection/script.json`
- `timing/timestamps.json`
- `visual-plan/visuals.json`
- `assets/voiceover.wav`
- `assets/music.wav`
- `assets/media-index.json`
- `render/final.mp4`
- `publish/metadata.json`

### UGC/avatar product short

- `input/product-brief.json`
- `analysis/claim-bank.json`
- `analysis/product-proof.json`
- `selection/script.json`
- `assets/avatar-source.json`
- `assets/avatar.png`
- `assets/voiceover.wav`
- `assets/talking-head.mp4`
- `assets/broll-manifest.json`
- `render/final.mp4`
- `provenance.json`

### Motion graphics lesson

- `input/lesson-brief.json`
- `selection/beat-plan.json`
- `visual-plan/scene-types.json`
- `visual-plan/style-tokens.json`
- `assets/generated-frames/`
- `render/final.mp4`
- `review/contact-sheet.jpg`

### Caption/export primitives

- `timing/words.json`
- `render/captions.ass`
- `render/captions.srt`
- `publish/export-profile.json`
- `publish/platform-metadata.json`

## Provenance Object

```json
{
  "runId": "string",
  "createdAt": "ISO-8601",
  "archetypeId": "string",
  "sourceRepos": ["owner/repo"],
  "inputs": [
    {
      "path": "input/source-media.json",
      "sourceUrl": "optional URL",
      "license": "unknown|owned|public-domain|stock-license|generated",
      "notes": "string"
    }
  ],
  "generatedAssets": [
    {
      "path": "assets/voiceover.wav",
      "provider": "kokoro|edge|elevenlabs|openai|local|unknown",
      "promptOrTextPath": "selection/script.json",
      "reuseAllowed": false
    }
  ],
  "review": {
    "humanApproved": false,
    "captionReadable": false,
    "safeZonesClear": false
  }
}
```
