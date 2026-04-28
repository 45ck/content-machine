# Reddit And Story Over Gameplay

Date: 2026-04-29
Archetype: Reddit/story narration over motion background
Platforms: TikTok, Instagram Reels, YouTube Shorts

## What It Is

This is the classic low-friction "story over satisfying motion" format:
Reddit post, confession, or generated story in voiceover; one-word or
word-level captions; persistent gameplay/parkour/background footage; optional
Reddit-style card opener; automated upload metadata.

## How Repos Make It

`raga70/FullyAutomatedRedditVideoMakerBot` uses the most explicit version:
source Reddit stories, synthesize narration, place the result over a prepared
background video, add attention-heavy one-word captions, then automate upload
to TikTok, Reels, and Shorts. The README calls out placing a Minecraft or
similar background video in `assets/backgrounds/video/` and renaming it to a
fixed expected filename.

`1Dengaroo/rshorts` modernizes the same lane as a web app: prompt to generated
Reddit-style story, TTS narration, word-level captions, Remotion preview, and
AWS Lambda render to 1080x1920.

This repo already has the matching production lanes:

- `skills/reddit-post-over-gameplay-short/`
- `skills/reddit-story-short/`
- `skills/gameplay-confession-short/`
- `skills/text-message-drama-short/`

## Asset Strategy

The source repos tend to treat background motion as a reusable asset bank, not
as per-video creative. That makes the format fast but risky: repeated footage,
copyright ambiguity, and "unoriginal content" detection are real concerns.

Recommended local asset policy:

- Keep gameplay/background footage in an explicit media index with provenance.
- Prefer generated gameplay placeholders or properly licensed local footage.
- Store Reddit/card UI templates as code-native components, not screenshots.
- Cache TTS, captions, and render intermediates per run for regeneration.

## Production Recipe

1. Generate or fetch story text.
2. Split into hook, setup, escalation, payoff.
3. Generate voiceover.
4. Align captions to voiceover words.
5. Select background motion from a licensed indexed pool.
6. Render opener card and active captions.
7. Export platform-safe 1080x1920 variants.

## What To Pull Into content-machine

- Keep the lane distinct from generic `story`: it needs gameplay/background
  asset rules.
- Preserve a "Reddit opener + narration + gameplay" script/visual recipe.
- Add stronger provenance fields to gameplay/media assets before scaling.
- Use existing caption gates to prevent unreadable one-word spam.
