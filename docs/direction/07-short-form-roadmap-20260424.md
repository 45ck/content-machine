# Short-Form Roadmap 20260424

## Project Snapshot

Content Machine is a local-first short-form video skill pack and
runtime for coding-agent CLIs. Its job is to help agents produce
TikTok, Instagram Reels, and YouTube Shorts by calling deterministic
repo-local skills and JSON-stdio harnesses.

The project is not trying to be a monolithic video agent. The durable
parts are:

- typed artifacts that can be inspected and reused
- deterministic media execution
- source-media analysis before editing decisions
- highlight selection and approval before render spend
- Remotion rendering with strong captions
- local quality gates and review artifacts
- reusable style/profile memory

## Current Workflow

For longform-to-short work, the target workflow is:

```text
source-media-analyze
  -> longform-highlight-select
  -> boundary-snap
  -> highlight-approval
  -> preview clip
  -> style-profile-driven render
  -> quality-gated final MP4
```

For topic-to-video work, the current path remains:

```text
brief-to-script
  -> script-to-audio
  -> timestamps-to-visuals
  -> video-render
  -> publish-prep-review
```

## Implemented Now

- Skill and harness catalog for agent discovery.
- Topic-to-short harness flow.
- Script, audio, visuals, render, and publish-prep harnesses.
- Longform highlight candidate selection from word-level timestamps.
- Highlight approval artifacts.
- Boundary snap artifacts.
- Source media analysis with ffprobe metadata.
- Source media analysis with measured ffmpeg scene changes, silence
  gaps, audio RMS/peak, and normalized source scores.
- Media index and style profile library seed contracts.
- Caption sidecar export and caption quality checks.
- Local quality gate via `npm run quality`.
- Local-first docs and generated repo facts aligned away from hosted
  automation.

## Next Build Order

### 1. Previewable Highlight Approval

Add a practical preview artifact for each selected candidate:

- candidate id, source path, start/end/duration
- transcript excerpt
- score breakdown
- source signals
- preview clip path or command
- approve/reject/regenerate decision fields

Why: the strongest reference repos separate highlight discovery from
processing. It keeps expensive render work behind a human or agent
approval gate.

### 2. Better Multi-Signal Ranking

Improve `longform-highlight-select` so media signals affect ranking
more directly:

- per-span scene-change density
- per-span measured silence overlap
- audio energy by time window
- optional LLM narrative score over exact transcript text
- explicit score contribution breakdown

Why: choosing the right moment matters more than polishing a weak clip.

### 3. Text Selection To Timestamps

Let an LLM choose exact transcript text, then recover timestamps
locally from word timelines.

Why: models are useful at narrative selection but unreliable at exact
timestamp invention.

### 4. Pixel-Fit Captions

Add measured caption layout based on actual font, stroke width, viewport,
and safe zones:

- prevent long-token overflow
- choose line/page/chunk breaks from measured width
- preserve emphasis metadata through render
- add visual tests for large caption presets

Why: current caption logic is strong, but high-quality short-form
captions need pixel-fit safety, not only character-count heuristics.

### 5. Quality-Gated Render

Make render quality more operational:

- expose render output controls such as CRF, bitrate, audio bitrate,
  and pixel format
- add still-frame QA before full render
- summarize post-render OCR, sync, and visual scores
- allow render/generate to fail or retry on configured quality gates

Why: a successful MP4 is not enough. The output should pass local
acceptance checks.

### 6. Profile-Driven Generation

Expand style profiles so they drive:

- hook templates
- caption density and style
- visual language
- crop rules
- music and energy defaults
- first-frame and thumbnail rules
- platform metadata
- avoid lists

Why: repeatable quality depends on reusable style memory, not
rediscovering taste on every run.

## Non-Goals For Now

- Upload automation is not next. Publish prep and quality gates come
  first.
- YOLO or dynamic smart crop is not next. Scene boundaries and approved
  spans should stabilize first.
- LLM-only highlight scoring is not acceptable. Deterministic signals
  remain the fallback and audit trail.
- More prose-only skills should not outrun executable contracts.

## Reference Docs

- [Short-form vendor synthesis](../research/external/short-form-vendor-synthesis-20260424.md)
- [Repo deep dive priorities](../research/external/repo-deep-dive-implementation-priorities-20260424.md)
- [Skill gap analysis](../research/external/skill-gap-analysis-20260424.md)
- [Direction overview](00-overview.md)
