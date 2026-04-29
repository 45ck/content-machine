# OpenReels

Source:
<https://dev.to/tsensei/i-open-sourced-an-ai-pipeline-that-turns-any-topic-into-a-youtube-short-e77>

## Archetype

`topic-faceless-explainer`

## Production Pattern

Topic to vertical MP4 through research, script, voiceover, visuals, music,
captions, and Remotion assembly.

## Useful Extraction

- `DirectorScore` as shared production plan
- per-scene visual type, description, motion, voiceover, and transition
- word-level timestamps for karaoke captions
- vision-language verification for stock footage
- music prompt synced to emotional arc
- archetype configs controlling pacing, palette, captions, and transitions
- cost ledger by provider/stage

## Content-Machine Implication

Add `director-score.v1.json` before `visuals.json`; downstream stages should
execute the score instead of each inventing their own interpretation.
