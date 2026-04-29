# YouTube Reference Corpus

Date: 2026-04-29
Method: metadata-only YouTube search with `yt-dlp --flat-playlist --dump-json`
plus web search for current open-source short-form tools. No videos were
downloaded or copied.

## Use This Corpus For

- Finding reference videos to reverse-engineer with explicit permission,
  licensed media, or user-supplied source files.
- Comparing searched YouTube tutorial claims against local repo patterns.
- Expanding the archetype quality rubric with real packaging examples:
  titles, promises, thumbnails, duration, caption style, crop style, and
  production workflow.

## Asset Policy

The corpus is link metadata, not a reusable asset pack. Do not copy frames,
audio, footage, subtitles, thumbnails, or creator scripts into generated
content unless the video is user-supplied, clearly licensed for reuse, or
separately cleared.

Allowed immediately:

- store URLs, titles, channels, durations, view counts, and search queries
- use videos as viewing references for analysis notes
- use public repo documentation to design original implementations

Not allowed without clearance:

- downloading and bundling YouTube videos as stock footage
- cloning creator scripts, titles, voices, thumbnails, or visual identity
- using thumbnails as production assets

## Corpus Shape

Machine-readable corpus:
`manifests/youtube-reference-corpus.json`.

Each entry records:

- archetype
- reference kind: tutorial, format example, or tool demo
- title, channel, URL, duration, and view count at collection time
- why it is useful
- asset policy

## Strong Signals Found

### Longform Clip Factory

The strongest current signal is convergence around the same pipeline:

1. ingest YouTube/local video
2. transcribe to word-level timestamps
3. score clips for hook, emotion, conflict, practical value, or surprise
4. reframe to 9:16 with face/speaker tracking
5. burn word-level captions
6. export titles/descriptions and platform-ready MP4s

This is reinforced by the local SamurAIGPT repo, Podcli, ClippedAI, and
multiple creator tutorials about podcast clipping.

### Reddit Story Gameplay

YouTube search surfaces many long compilation videos rather than clean Shorts.
For production research, treat these as evidence of format grammar:
narrated story, simple emotional hook, loop gameplay or satisfying footage,
large captions, and multi-part or compilation packaging. For actual assets,
prefer licensed gameplay loops or generated/synthetic background footage.

### Faceless Explainer

Search results skew toward "how to make faceless channels" tutorials. The
reusable implementation signal is not any specific video, but the production
stack: prompt/script, generated or stock visuals, quick captioned narration,
and a strict stance against copying other creators' content.

### UGC Avatar Product Short

The useful public references are mostly tutorials from avatar vendors and
AI-ad creators. Content-machine should model the workflow contract:
product claim, avatar or presenter asset, product proof/demo b-roll, brand
safe zones, captions, and CTA. Do not treat vendor demo footage as reusable.

### Motion Graphics Lesson

The strongest YouTube signal is creator education around typography motion,
CapCut/Premiere/DaVinci text animation, and compact visual lessons. For
content-machine, this maps to code-native motion primitives: text cards,
timed emphasis, icon/diagram beats, and caption-safe layout.

### Caption Export Primitives

CapCut caption tutorials dominate the searched surface. This validates the
need for explicit caption recipes rather than generic subtitles: animated
word emphasis, uppercase hook words, stroke/shadow contrast, line-height
control, safe-zone placement, and platform export checks.

## Recommended Next Corpus Pass

1. Use the corpus JSON to pick 2 to 3 references per archetype.
2. Prefer videos where the creator explains their workflow or where the video
   is a tool demo, not just a finished piece.
3. Download only if licensed, user-supplied, or used under a documented
   research exception outside production assets.
4. Run `reverse-engineer-winner` on local files or URLs to produce structural
   notes, not copied media.
5. Convert winning observations into new eval fixtures and skill examples.

## Source Links

- Podcli: <https://podcli.com/>
- SamurAIGPT AI YouTube Shorts Generator:
  <https://github.com/SamurAIGPT/AI-Youtube-Shorts-Generator>
- ClippedAI: <https://clippedai.shaarav.xyz/>
- Openshorts Reddit release note:
  <https://www.reddit.com/r/vibecoding/comments/1pt7rrg/update_i_added_ai_subtitles_auto_edits/>
