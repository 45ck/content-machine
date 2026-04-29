# Deep Repo Extraction

Date: 2026-04-29
Scope: deeper pass over local vendor repos plus current public open-source
short-form references surfaced by web search.

## New Repos Promoted

| Repo or tool                              | Archetype impact                          | What content-machine should extract                                                                                                  |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `SamurAIGPT__AI-Youtube-Shorts-Generator` | Longform clip factory                     | YouTube/local ingest, Whisper transcription, LLM highlight selection, approval loop, vertical crop, subtitle burn-in, temp cleanup   |
| `cangeorgecode__content_creation`         | UGC/avatar and faceless volume production | Script JSON input, HeyGen/avatar dependency, user-provided b-roll folders, batch output contract                                     |
| `brolyroly007__Videos_downloader`         | Platform ingestion and reposting workflow | Multi-platform download, subtitle generation, viral metadata, queueing, upload automation; treat anti-copyright effects as non-goals |
| `hikg4593__vizard`                        | Productized longform repurposing grammar  | Transcript editing, emotional peak selection, captions, platform scheduling, viral score language                                    |
| Podcli                                    | Local-first podcast clipper               | Word timestamps, speaker diarization, face crop, four caption styles, MCP/tools, knowledge base, duplicate clip checks               |
| ClippedAI                                 | Local open-source clipper                 | Local highlight detection, face-tracking 9:16 crop, animated subtitles, viral title generation                                       |
| Openshorts Reddit release note            | Agentic auto-edit direction               | YouTube ingest fragility, subtitle-first retention, AI extra edits, scheduled publishing                                             |

## Implementation Patterns

### 1. Highlight Selection Is Moving From One Clip To Many

The older local pattern selects one best segment. The stronger current pattern
returns multiple candidates with scores, reasons, hooks, and dedupe:

- transcript chunking for long videos
- candidate windows with overlap collapse
- explicit dimensions: hook, conflict, emotion, surprise, utility, quotability
- human or automatic approval
- JSON output for downstream render stages

Content-machine gap: `longform-highlight-select` should preserve score
dimensions and reject near-duplicate moments before boundary snapping.

### 2. Crop Plan Must Be A First-Class Artifact

Every serious longform clipper now treats 9:16 reframing as a core feature,
not a render afterthought:

- face or speaker tracking
- screen-recording branch
- center crop fallback
- snap/cooldown to avoid crop flashing
- split-screen handling for podcasts

Content-machine gap: render artifacts should include `crop-plan.v1.json`
with target subject, crop mode, safe-zone assumptions, and fallback reason.

### 3. Captions Are Product Design, Not Just SRT

Repos and tutorial videos converge on burned-in, word-timed captions:

- bold uppercase hook words
- active-word highlight
- karaoke mode for story clips
- branded/subtle variants for podcasts
- stroke/shadow for phone readability

Content-machine gap: caption presets should be tied to archetypes and
validated for safe zones, line count, contrast, and jitter.

### 4. Asset Provenance Needs To Block Repost Slop

Some repos automate reposting, anti-copyright effects, and platform uploads.
Those tactics are useful as cautionary evidence, not as product direction.
Content-machine should support legitimate source review and licensed asset
reuse, but should not build a pipeline around stealing, mirroring, or
obfuscating other creators' footage.

Content-machine gap: publish prep should fail outputs with unknown source
assets, copied creator footage without permission, or intentional evasion
effects.

### 5. Avatar/Product Shorts Need A Folder Contract

The cangeorgecode repo is valuable because it names the production contract:

- scripts/swipe files
- b-roll folder
- media work folder
- output folder
- optional avatar input
- sample approval before full batch

Content-machine gap: UGC/avatar skills should require product proof assets,
brand-safe b-roll, avatar consent/source notes, and a sample approval gate.

## Repo-Specific Extraction Notes

### SamurAIGPT AI YouTube Shorts Generator

Pipeline order from local code:

1. accept YouTube URL or local file
2. download or load video
3. extract WAV
4. transcribe audio
5. build timestamped transcript text
6. ask LLM for highlight start/stop
7. approve or regenerate
8. extract clip
9. crop to vertical
10. add subtitles with source-time offset
11. merge audio and cleanup temp files

Immediate extraction target: use the approval loop and subtitle time-offset
logic as implementation requirements for content-machine's longform path.

### Podcli

Public docs show a more mature product architecture:

- all-local processing by default
- word-level timestamps and speaker labels
- face-tracking crop with split-screen handling
- branded, Hormozi, karaoke, and subtle caption styles
- Web UI and MCP tools
- clip history to avoid duplicate topics
- knowledge base for voice, title formulas, and banned words

Immediate extraction target: add duplicate clip memory and knowledge-base
context to future highlight scoring.

### ClippedAI

Public docs emphasize local OpusClip-like behavior:

- input YouTube link or local file
- transcribe, detect highlights, crop, subtitle
- word-by-word captions
- title and description generation

Immediate extraction target: keep title/description generation attached to
the clip candidate, not only publish prep.

### cangeorgecode Content Creation

Local README frames short-form production as a factory:

- user supplies topics/scripts and b-roll
- optional avatar from selfies
- HeyGen animates presenter
- batch output of many videos
- explicit sample approval before batch

Immediate extraction target: add an `ugc-avatar-product-short.request.json`
variant that includes `approval_sample_required`.

### brolyroly007 Videos Downloader

This repo is a broad automation system:

- download from TikTok, Reels, Shorts, Facebook
- process video to 9:16 with background modes
- generate subtitles with Whisper
- compute viral metadata
- upload to TikTok through browser automation

Immediate extraction target: platform ingest and validation ideas are useful;
anti-copyright effects and repost automation should be rejected by policy.

## Source Links

- Podcli: <https://podcli.com/>
- SamurAIGPT AI YouTube Shorts Generator:
  <https://github.com/SamurAIGPT/AI-Youtube-Shorts-Generator>
- ClippedAI: <https://clippedai.shaarav.xyz/>
- Openshorts Reddit release note:
  <https://www.reddit.com/r/vibecoding/comments/1pt7rrg/update_i_added_ai_subtitles_auto_edits/>
