# Longform Clip Factory

Date: 2026-04-29
Archetype: long video to vertical clips
Platforms: TikTok, Instagram Reels, YouTube Shorts

## What It Is

This archetype turns podcasts, interviews, webinars, streams, and YouTube
videos into short vertical clips. It is not a topic generator. The source
media provides the value; the system finds a strong moment, reframes it, adds
hook text and captions, then exports a shareable clip.

## How Repos Make It

`SamurAIGPT/AI-Youtube-Shorts-Generator` is a compact Python pipeline:
download or load a video, extract audio, transcribe with Whisper, ask GPT for
the most engaging segment, crop the selected range, reframe to 9:16, burn
subtitles, and combine audio. Its crop code distinguishes face-centered clips
from screen-recording style clips.

`alperensumeroglu/ai-clips-maker` decomposes the same problem into reusable
modules: WhisperX transcription, Pyannote speaker diarization, scene
detection, active-speaker crop planning, and export to 9:16/1:1/16:9.

`imgly/videoclipper` shows a browser-native variant. It uses client-side video
editing via CE.SDK, sends audio for transcription, asks Gemini for strong text
selections, then maps the selected text back to word timestamps instead of
trusting an LLM to invent precise timestamps.

`AgriciDaniel/claude-shorts` is the closest agent-skill pattern. It makes the
agent read the transcript, score candidates, ask for approval, snap boundaries
to word/sentence/silence points, then render approved vertical clips with
Remotion.

## Critical Decisions

The researched repos agree on four hard problems:

- Clip selection must score hooks, standalone coherence, emotion, value
  density, and payoff.
- Timestamp boundaries need audio-aware snapping; transcript-only ranges cut
  mid-word too often.
- Reframing must understand content type: talking head, screen recording,
  podcast, or general footage.
- Caption rendering is part of the product, not a final optional subtitle pass.

## Asset Strategy

The main "assets" are the original long video, extracted clips, transcript,
face/speaker maps, crop plans, captions, hook overlays, and export profiles.
These should be stored as run artifacts, not hidden temp files, because they
are exactly what makes regeneration and review possible.

## What To Pull Into content-machine

- Keep `source-media-analyze -> longform-highlight-select -> boundary-snap`
  as the canonical path.
- Add a text-selection-to-timestamps mode inspired by `imgly/videoclipper`.
- Treat crop plans as first-class JSON artifacts.
- Require human approval before final render for batch clipping.
