# Topic To Faceless Explainer

Date: 2026-04-29
Archetype: prompt/topic to faceless short
Platforms: TikTok, Instagram Reels, YouTube Shorts

## What It Is

This archetype starts from a topic, brief, or headline and produces a complete
voice-led short. The visual layer is stock footage, generated images/video,
simple motion cards, or mixed B-roll. The creator persona is usually implied
by script tone, voice, captions, and music rather than a visible host.

## How Repos Make It

`gyoridavid/short-video-maker` uses a practical deterministic pipeline: text
to speech with Kokoro, captions with Whisper, Pexels background video search,
Remotion composition, and server/API surfaces for automation. Its key concept
is a scene containing narration text and search terms.

`rushindrasinha/youtube-shorts-pipeline` frames the same pattern as a niche
engine. A niche YAML shapes research, script tone, visual vocabulary, voice,
caption style, music mood, thumbnail, and platform metadata. This is stronger
than a flat "topic in, video out" prompt because the constraints travel
through every stage.

`RayVentura/ShortGPT` uses engine subclasses and prompt templates. Different
content modes override script generation and custom asset preparation, then
share a common voice, captions, background asset, and render path.

## Production Recipe

1. Convert topic into a short brief and audience/niche profile.
2. Generate a script with hook, 2-4 body beats, and payoff/CTA.
3. Produce voiceover.
4. Generate timestamps from the voiceover.
5. Create a visual plan with search terms or image prompts per beat.
6. Fetch/generate assets, then reject irrelevant or caption-hostile media.
7. Render active captions, B-roll, music, and final export profile.

## Asset Strategy

The useful copied assets are not stock clips; they are recipes and prompts:
niche profiles, scene plans, caption presets, search-term mapping, music mood
rules, and platform export defaults. Runtime media should be fetched/generated
per run with provenance and cached in the run directory.

## What To Pull Into content-machine

- Turn niche/profile data into a reusable style-profile library input.
- Keep `brief-to-script`, `script-to-audio`, `timestamps-to-visuals`, and
  `video-render` as separate reviewable stages.
- Prefer scene plans with explicit asset intent over generic visual keywords.
- Keep stock footage search as a fallback, not the only visual source.
