# Repo Card: imgly/videoclipper

## Why It Matters

It solves a common LLM weakness: asking a model for timestamps. Instead, the
model selects transcript text, then code maps that text back to word-level
timestamps.

## How It Makes Shorts

1. Load video client-side.
2. Extract audio and transcribe with word timestamps and speakers.
3. Ask Gemini for strong 30-60 second text selections.
4. Match selected text back to transcript words.
5. Preview non-destructive edits in CE.SDK.
6. Export from the browser.

## Copied Evidence

- `assets/20260429/imgly-videoclipper/README.md`
- `assets/20260429/imgly-videoclipper/transcript.ts`
- `assets/20260429/imgly-videoclipper/engine.ts`
- `assets/20260429/imgly-videoclipper/use-cesdk-editor.ts`

## Extraction

- Add a local text-selection-to-timestamps harness.
- Use text matching as a fallback when LLM timestamp JSON is low confidence.
- Keep browser editor ideas out of core runtime for now.
