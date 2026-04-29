# Current Open-Source Tool Watchlist

Date: 2026-04-29

## Purpose

Track tools worth watching or importing later. This is not an endorsement to
copy assets or code directly. Use this watchlist to decide where to run future
license review, reference-video review, or implementation comparison.

## Watchlist

| Tool                  | Source             | Category                | Why it matters                                                               |
| --------------------- | ------------------ | ----------------------- | ---------------------------------------------------------------------------- |
| OpenReels             | Web                | Topic-to-short factory  | DirectorScore, vision-verified stock, music arc, Remotion assembly           |
| Vinci Clips           | Web/GitHub         | Longform clipper        | Gemini analysis, diarization, smart clipping, transcript sync, dashboard     |
| Podcli                | Web                | Podcast clipper         | Local-first MCP/tooling, four caption styles, crop history, duplicate checks |
| ClippedAI             | Web                | Local clipper           | OpusClip-like local flow, face crop, animated captions                       |
| OpenMontage           | Local              | Agentic studio          | Pipeline manifests, agent skills, provider decisions, self-review            |
| ArcReel               | Local              | Story/video workspace   | Versioning, provider abstraction, character continuity, CapCut export        |
| AutoClip              | Local              | Web clipper             | Task queue, content understanding, collections, progress via WebSocket       |
| r/Shorts              | Local              | Reddit story app        | Remotion preview/edit loop, Lambda render, voice choices                     |
| Dark2C Viral Faceless | Local/GitHub topic | Trend-to-short          | Trends, Gemini script, Coqui TTS, Aeneas subtitle alignment                  |
| Clip Anything         | Local              | Prompted video clipping | Natural-language clip search over visual/audio/text/sentiment cues           |
| AI Short Video Engine | Local              | Article-to-video        | Material provider abstraction and multi-role dialogue generation             |
| AI Story              | Local              | Storyboard/video engine | Camera motion planning, prompt management, retry/rollback                    |

## Import Priority

1. **OpenReels DirectorScore**: highest leverage for topic-to-short and
   explainer quality.
2. **Vinci/Podcli candidate scoring**: highest leverage for longform clip
   quality.
3. **OpenMontage pipeline/review model**: best match to content-machine's
   skill-first architecture.
4. **ArcReel asset/version model**: needed once generated video assets become
   expensive and iterative.
5. **AutoClip collections**: useful for batch candidate curation and manual
   review.
6. **Dark2C forced alignment**: useful fallback for generated scripts when ASR
   is not needed.

## Rejection Watch

These patterns appeared in the ecosystem but should not be product defaults:

- reposting third-party platform videos without rights
- watermark removal
- mirror/speed/color-shift effects to evade detection
- pretending public video links are reusable stock assets
- one-shot "viral score" with no explanation, hook, or evidence fields
- hidden cost/provider decisions with no run ledger

## Future Search Queries

- `site:github.com topic to youtube short remotion karaoke captions`
- `site:github.com podcast clips speaker diarization shorts captions`
- `site:github.com ai video clipping face tracking captions`
- `site:github.com capcut draft export ai video generator`
- `site:github.com video generation director score remotion`
