# Repo Card: SamurAIGPT/AI-Youtube-Shorts-Generator

## Why It Matters

It is a compact, readable longform-to-short implementation with practical crop
logic and a simple LLM highlight prompt.

## How It Makes Shorts

1. Download or load a video.
2. Extract audio.
3. Transcribe with Whisper.
4. Ask GPT for an engaging segment.
5. Let the user approve/regenerate.
6. Extract the selected range.
7. Crop to vertical using face-centered or screen-recording logic.
8. Burn subtitles.
9. Combine audio and video.

## Copied Evidence

- `assets/20260429/samurai-ai-shorts/FaceCrop.py`
- `assets/20260429/samurai-ai-shorts/LanguageTasks.py`
- `assets/20260429/samurai-ai-shorts/Subtitles.py`

## Extraction

- Store crop mode as `face-static`, `screen-motion`, or `contained-blur`.
- Use the highlight prompt as a baseline only; local scoring should be richer.
- Avoid ImageMagick/MoviePy subtitle coupling in the final local path.
