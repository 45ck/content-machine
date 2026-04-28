# Repo Card: RayVentura/ShortGPT

## Why It Matters

It shows a mature older pattern: content engines with subclass specialization
and declarative editing steps. Useful as a conceptual source, less aligned
with this repo's skill-first direction.

## How It Makes Shorts

1. Pick a content engine such as facts or Reddit.
2. Generate script through a specialized GPT helper.
3. Generate voiceover.
4. Time captions.
5. Generate image/search terms.
6. Choose background media and music.
7. Execute MoviePy editing steps.
8. Add metadata.

## Copied Evidence

- `assets/20260429/shortgpt/content_short_engine.py`
- `assets/20260429/shortgpt/facts_short_engine.py`
- `assets/20260429/shortgpt/reddit_short_engine.py`
- `assets/20260429/shortgpt/make_caption.json`
- `assets/20260429/shortgpt/crop_1920x1080_to_short.json`

## Extraction

- Keep declarative edit-step ideas.
- Do not recreate the inheritance-heavy engine structure.
- Use archetype-specific skills instead of Python subclasses.
