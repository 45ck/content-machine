# Broad Research Plan: Vendored Repos Exploration

**Date:** 2026-01-02  
**Purpose:** Systematic exploration of 139 vendored repos to understand landscape before committing to architecture  
**Philosophy:** Current architecture is a hypothesis, not a plan. Validate with evidence.

---

## Current State

- **139 vendored submodules** across multiple categories
- **17 research reports** written (reports 00-16)
- **~50+ repos unexplored** or only briefly surveyed
- Architecture assumptions based on incomplete information

---

## Research Goals

### Primary Questions to Answer

1. **What pipelines actually work?** (Not just what sounds good on paper)
2. **What are the common failure modes?** (Issues, PRs, discussions)
3. **What do users complain about?** (DX, performance, reliability)
4. **What's the real complexity?** (Not README complexity, actual code)
5. **What patterns emerge across 10+ implementations?**
6. **Where do projects struggle or abandon features?**
7. **What would we regret not knowing later?**

### Architecture Hypotheses to Validate

| Hypothesis | Current Assumption | Evidence Needed |
|------------|-------------------|-----------------|
| Remotion is best for rendering | Yes (from AGENTS.md) | Compare to FFmpeg-only, MoviePy, others |
| MCP is right integration pattern | Yes | Compare to REST-only, gRPC, queues |
| LangGraph for orchestration | Yes | Compare to temporal, n8n, custom |
| Whisper for captions | Yes | Compare to cloud ASR, other local |
| EdgeTTS/Kokoro for TTS | Yes | Evaluate quality, latency, languages |
| JSON config for video spec | Yes (vidosy) | Study alternatives, schema evolution |

---

## Research Categories

### Category 1: End-to-End Short Video Generators (~35 repos)
**Goal:** Understand complete pipelines, what works, what breaks

| Repo | Location | Status | Priority |
|------|----------|--------|----------|
| short-video-maker-gyori | `vendor/short-video-maker-gyori/` | Researched | ⭐ Deep dive |
| short-video-maker-leke | `vendor/short-video-maker-leke/` | Not researched | Compare fork |
| MoneyPrinterTurbo | `vendor/MoneyPrinterTurbo/` | Researched | ⭐ Prompts study |
| MoneyPrinter | `vendor/MoneyPrinter/` | Researched | Reference |
| MoneyPrinterV2 | `vendor/MoneyPrinterV2/` | Brief | Compare |
| ShortGPT | `vendor/ShortGPT/` | Researched | ⭐ TTS patterns |
| viralfactory | `vendor/viralfactory/` | Researched | ⭐ Upload patterns |
| shortrocity | `vendor/shortrocity/` | Researched | DALL-E reference |
| AI-Youtube-Shorts-Generator | `vendor/AI-Youtube-Shorts-Generator/` | Researched | Whisper patterns |
| AI-Youtube-Shorts-Generator-fork | `vendor/AI-Youtube-Shorts-Generator-fork/` | Not researched | Check improvements |
| AI-Youtube-Shorts-Generator-SaarD00 | `vendor/AI-Youtube-Shorts-Generator-SaarD00/` | Not researched | Check improvements |
| RedditShortVideoMaker | `vendor/RedditShortVideoMaker/` | Brief | Reddit pipeline |
| Autotube | `vendor/Autotube/` | Not researched | Explore |
| AutoShortsAI | `vendor/AutoShortsAI/` | Brief | Explore |
| Auto-YouTube-Shorts-Maker | `vendor/Auto-YouTube-Shorts-Maker/` | Brief | Explore |
| Auto-YT-Shorts | `vendor/Auto-YT-Shorts/` | Not researched | Explore |
| AI-short-creator | `vendor/AI-short-creator/` | Brief | Long→shorts |
| AI-reels | `vendor/AI-reels/` | Not researched | Explore |
| AI-Content-Studio | `vendor/AI-Content-Studio/` | Brief | Explore |
| ShortFormGenerator | `vendor/ShortFormGenerator/` | Not researched | Explore |
| ShortReelX | `vendor/ShortReelX/` | Brief | Explore |
| shorts_maker | `vendor/shorts_maker/` | Brief | Explore |
| short-video-creator | `vendor/short-video-creator/` | Brief | Explore |
| Faceless-short | `vendor/Faceless-short/` | Brief | Explore |
| YASGU | `vendor/YASGU/` | Brief | Explore |
| videoGenerator | `vendor/videoGenerator/` | Brief | Explore |
| VideoGraphAI | `vendor/VideoGraphAI/` | Not researched | Explore |
| VideoShortsCreator-Gemini | `vendor/VideoShortsCreator-Gemini/` | Not researched | Gemini patterns |
| gemini-youtube-automation | `vendor/gemini-youtube-automation/` | Not researched | Gemini patterns |
| TikTokAIVideoGenerator | `vendor/TikTokAIVideoGenerator/` | Brief | Explore |
| tiktok-automatic-videos | `vendor/tiktok-automatic-videos/` | Brief | Explore |
| TikTok-Compilation-Video-Generator | `vendor/TikTok-Compilation-Video-Generator/` | Brief | Compilations |
| OBrainRot | `vendor/OBrainRot/` | Brief | Explore |
| Viral-Faceless-Shorts-Generator | `vendor/Viral-Faceless-Shorts-Generator/` | Not researched | Explore |
| youtube-auto-shorts-generator | `vendor/youtube-auto-shorts-generator/` | Brief | Explore |
| YouTube-shorts-generator | `vendor/YouTube-shorts-generator/` | Brief | Explore |
| youtube-shorts-reddit-scraper | `vendor/youtube-shorts-reddit-scraper/` | Brief | Reddit patterns |
| automated-short-generator | `vendor/automated-short-generator/` | Not researched | Explore |
| postcrest-ai-content-creation-platform | `vendor/postcrest-ai-content-creation-platform/` | Not researched | Platform patterns |

**Research Questions for Category 1:**
- [ ] What's the actual pipeline flow? (Not just README claims)
- [ ] What rendering approach? (Remotion, FFmpeg, MoviePy, other)
- [ ] How do they handle TTS? (Provider, caching, quality)
- [ ] How do they generate captions? (Whisper, cloud, other)
- [ ] What's the config format? (JSON, YAML, code, hardcoded)
- [ ] What's the error handling like? (Recovery, retries, logging)
- [ ] What do issues/PRs reveal about pain points?
- [ ] What's the actual code quality? (Tests, types, docs)

---

### Category 2: Rendering & Composition (~8 repos)
**Goal:** Understand video assembly approaches

| Repo | Location | Status | Priority |
|------|----------|--------|----------|
| remotion | `vendor/remotion/` | Not deep | ⭐ Core framework |
| template-tiktok-base | `templates/template-tiktok-base/` | Researched | ⭐ Caption patterns |
| template-audiogram | `templates/template-audiogram/` | Researched | Audio patterns |
| vidosy | `templates/vidosy/` | Researched | ⭐ JSON config |
| Short-Video-Creator | `templates/Short-Video-Creator/` | Brief | Explore |
| chuk-mcp-remotion | `vendor/render/chuk-mcp-remotion/` | Not researched | MCP + Remotion! |
| Crank | `vendor/Crank/` | Not researched | Explore |
| Cassette | `vendor/Cassette/` | Brief | Music focus |

**Research Questions for Category 2:**
- [ ] Remotion vs pure FFmpeg: when to use which?
- [ ] How do compositions handle dynamic content?
- [ ] What's the scene/segment abstraction pattern?
- [ ] How do they handle aspect ratio (9:16 vs 16:9)?
- [ ] What animation patterns are common?
- [ ] How do they handle audio layering?

---

### Category 3: Clipping & Highlight Detection (~8 repos)
**Goal:** Understand how to extract "interesting" segments

| Repo | Location | Status | Priority |
|------|----------|--------|----------|
| Clip-Anything | `vendor/Clip-Anything/` | Researched | ⭐ Virality scoring |
| ai-clips-maker | `vendor/ai-clips-maker/` | Brief | Explore |
| ai-highlight-clip | `vendor/clipping/ai-highlight-clip/` | Not researched | Highlight detection |
| ai-highlight-clip-arielitotupai | `vendor/clipping/ai-highlight-clip-arielitotupai/` | Not researched | Fork comparison |
| autoclipper | `vendor/clipping/autoclipper/` | Not researched | ⭐ Auto clipping |
| FunClip | `vendor/clipping/FunClip/` | Not researched | Explore |
| pyscenedetect | `vendor/clipping/pyscenedetect/` | Not researched | Scene boundaries |
| Video-AutoClip | `vendor/clipping/Video-AutoClip/` | Not researched | Auto clipping |
| reels-clips-automator | `vendor/reels-clips-automator/` | Brief | Reels patterns |
| awesome-free-opusclip-alternatives | `vendor/clipping/awesome-free-opusclip-alternatives/` | Not researched | ⭐ Alternatives list |

**Research Questions for Category 3:**
- [ ] How do they detect "interesting" moments?
- [ ] What's the virality/engagement scoring approach?
- [ ] How do they handle scene boundaries?
- [ ] What's the hook/climax/resolution pattern?
- [ ] LLM-based vs rule-based detection?

---

### Category 4: Captions & Subtitles (~8 repos)
**Goal:** Understand transcription + styling

| Repo | Location | Status | Priority |
|------|----------|--------|----------|
| captacity | `vendor/captacity/` | Researched | ⭐ Word highlighting |
| whisper | `vendor/captions/whisper/` | Not deep | ⭐ Core ASR |
| whisperx | `vendor/captions/whisperx/` | Not researched | Word-level timestamps |
| auto-subtitle | `vendor/auto-subtitle/` | Researched | Translation |
| auto-subtitle-generator | `vendor/captions/auto-subtitle-generator/` | Brief | Explore |
| video-subtitles-generator | `vendor/captions/video-subtitles-generator/` | Brief | Explore |

**Research Questions for Category 4:**
- [ ] Whisper vs WhisperX: when to use which?
- [ ] Word-level vs sentence-level timing accuracy?
- [ ] How do they handle styling (fonts, colors, animations)?
- [ ] What's the SRT/VTT/JSON intermediate format?
- [ ] How do they handle multi-language?

---

### Category 5: TTS & Audio (~4 repos)
**Goal:** Understand voice synthesis options

| Repo | Location | Status | Priority |
|------|----------|--------|----------|
| kokoro | `vendor/audio/kokoro/` | Brief | ⭐ Local English TTS |
| kokoro-fastapi | `vendor/audio/kokoro-fastapi/` | Not researched | API wrapper |
| ShortGPT (EdgeTTS) | `vendor/ShortGPT/` | Researched | ⭐ Free 30+ languages |

**Research Questions for Category 5:**
- [ ] Quality comparison: Kokoro vs EdgeTTS vs others
- [ ] Latency and throughput benchmarks?
- [ ] Voice variety and customization?
- [ ] How do they handle SSML/prosody?
- [ ] Cost implications (local vs cloud)?

---

### Category 6: Agent & Orchestration (~12 repos)
**Goal:** Understand LLM integration patterns

| Repo | Location | Status | Priority |
|------|----------|--------|----------|
| openai-agents-js | `vendor/openai-agents-js/` | Researched | ⭐ Official SDK |
| langchain | `vendor/agents/langchain/` | Not deep | Reference |
| langgraph | `vendor/agents/langgraph/` | Not deep | ⭐ Orchestration |
| llama-index | `vendor/agents/llama-index/` | Not researched | RAG patterns |
| crewai | `vendor/agents/crewai/` | Not researched | Multi-agent |
| pydantic-ai | `vendor/agents/pydantic-ai/` | Not researched | Type-safe agents |
| temporal | `vendor/orchestration/temporal/` | Not researched | Workflow engine |
| n8n | `vendor/orchestration/n8n/` | Not researched | Visual workflows |
| airflow | `vendor/orchestration/airflow/` | Not researched | DAG orchestration |
| ai-video-workflow | `vendor/orchestration/ai-video-workflow/` | Not researched | ⭐ Video-specific |
| ai-video-workflow-envergadcr | `vendor/orchestration/ai-video-workflow-envergadcr/` | Not researched | Fork |

**Research Questions for Category 6:**
- [ ] OpenAI Agents SDK vs LangGraph: pros/cons?
- [ ] When is Temporal worth the complexity?
- [ ] How do video projects handle retry/recovery?
- [ ] What's the state management pattern?
- [ ] How do they handle long-running jobs?

---

### Category 7: MCP & Integration (~12 repos)
**Goal:** Understand Model Context Protocol patterns

| Repo | Location | Status | Priority |
|------|----------|--------|----------|
| mcp-python-sdk | `vendor/mcp/mcp-python-sdk/` | Not deep | ⭐ Official SDK |
| fastmcp-python | `vendor/mcp/fastmcp-python/` | Not researched | ⭐ Python patterns |
| fastmcp-typescript | `vendor/mcp/fastmcp-typescript/` | Not researched | ⭐ TS patterns |
| mcp-quickstart | `vendor/mcp/mcp-quickstart/` | Not researched | Getting started |
| mcp-servers | `vendor/mcp/mcp-servers/` | Not deep | Reference servers |
| mcp-reddit (connector) | `connectors/mcp-reddit/` | Researched | ⭐ Reddit MCP |
| reddit-mcp-buddy | `vendor/connectors/reddit/reddit-mcp-buddy/` | Not researched | Compare |
| reddit-mcp-geli | `vendor/connectors/reddit/reddit-mcp-geli/` | Not researched | Compare |
| reddit-mcp-ts | `vendor/connectors/reddit/reddit-mcp-ts/` | Not researched | TS version |
| postgres-mcp | `vendor/mcp-servers/postgres-mcp/` | Not researched | DB patterns |
| postgres-mcp-server | `vendor/mcp-servers/postgres-mcp-server/` | Not researched | Compare |
| qdrant-mcp-server | `vendor/mcp-servers/qdrant-mcp-server/` | Not researched | Vector search |
| upstash-mcp-server | `vendor/mcp-servers/upstash-mcp-server/` | Not researched | Redis patterns |
| chuk-mcp-remotion | `vendor/render/chuk-mcp-remotion/` | Not researched | ⭐ MCP + Remotion |

**Research Questions for Category 7:**
- [ ] MCP vs REST: what's the real benefit?
- [ ] How do MCP servers handle auth?
- [ ] What's the tool schema pattern?
- [ ] How do they handle streaming?
- [ ] Error handling and retry patterns?

---

### Category 8: Content Sources (~15 repos)
**Goal:** Understand content acquisition

| Repo | Location | Status | Priority |
|------|----------|--------|----------|
| mcp-reddit | `connectors/mcp-reddit/` | Researched | ⭐ Trends |
| asyncpraw | `vendor/connectors/reddit/asyncpraw/` | Not researched | Reddit async |
| praw | `vendor/connectors/reddit/praw/` | Not researched | Reddit sync |
| yt-dlp | `vendor/connectors/youtube/yt-dlp/` | Not researched | ⭐ Video download |
| youtube-transcript-api | `vendor/connectors/youtube/youtube-transcript-api/` | Not researched | Transcripts |
| google-api-python | `vendor/connectors/youtube/google-api-python/` | Not researched | Official API |
| google-api-nodejs | `vendor/connectors/youtube/google-api-nodejs/` | Not researched | Node version |
| (hackernews connectors) | `vendor/connectors/hackernews/` | Not researched | HN trends |
| (web scrapers) | `vendor/connectors/scrapers/` | Not researched | General scraping |
| (trends) | `vendor/connectors/trends/` | Not researched | Trend detection |

**Research Questions for Category 8:**
- [ ] What's the rate limiting strategy?
- [ ] How do they handle API changes/breakage?
- [ ] What content metadata is captured?
- [ ] How do they filter for relevance?

---

### Category 9: Video Processing (~8 repos)
**Goal:** Understand low-level video manipulation

| Repo | Location | Status | Priority |
|------|----------|--------|----------|
| ffmpeg | `vendor/video-processing/ffmpeg/` | Not deep | ⭐ Core tool |
| moviepy | `vendor/video-processing/moviepy/` | Not researched | Python wrapper |
| pyav | `vendor/video-processing/pyav/` | Not researched | FFmpeg bindings |
| capcut-mate | `vendor/video-processing/capcut-mate/` | Not researched | CapCut patterns |
| capcut-mate-electron | `vendor/video-processing/capcut-mate-electron/` | Not researched | Desktop app |
| jianying-protocol-service | `vendor/video-processing/jianying-protocol-service/` | Not researched | CapCut protocol |

**Research Questions for Category 9:**
- [ ] When is FFmpeg direct better than wrappers?
- [ ] What's the codec/quality tradeoff?
- [ ] How do they handle hardware acceleration?
- [ ] What's the memory/disk usage pattern?

---

### Category 10: Publishing & Distribution (~4 repos)
**Goal:** Understand platform upload

| Repo | Location | Status | Priority |
|------|----------|--------|----------|
| viralfactory | `vendor/viralfactory/` | Researched | ⭐ Multi-platform |
| mixpost | `vendor/publish/mixpost/` | Not researched | Scheduling |
| youtube-upload | `vendor/publish/youtube-upload/` | Not researched | YT specific |
| silent_autopost | `vendor/silent_autopost/` | Brief | Auto-posting |

**Research Questions for Category 10:**
- [ ] How do they handle platform API changes?
- [ ] What metadata is required/optional?
- [ ] Rate limiting and scheduling patterns?
- [ ] How do they handle failures?

---

### Category 11: Storage & Data (~5 repos)
**Goal:** Understand data persistence

| Repo | Location | Status | Priority |
|------|----------|--------|----------|
| minio | `vendor/storage/minio/` | Not researched | Object storage |
| qdrant | `vendor/storage/qdrant/` | Not researched | Vector DB |
| weaviate | `vendor/storage/weaviate/` | Not researched | Vector DB |

**Research Questions for Category 11:**
- [ ] When is vector storage useful for video?
- [ ] What's the metadata schema pattern?
- [ ] How do they handle large files?

---

## Research Approach

### Phase 1: Quick Survey (Width-First)
**Goal:** Get broad understanding of all 139 repos  
**Time:** 1-2 days  
**Output:** Updated inventory with status/priority

For each repo, quickly assess:
1. **What is it?** (1-sentence purpose)
2. **Tech stack?** (Languages, frameworks)
3. **Activity?** (Last commit, stars, issues)
4. **Quality signals?** (Tests, types, docs)
5. **Priority?** (Critical/High/Medium/Low/Skip)

### Phase 2: Deep Dives (Depth-First)
**Goal:** Thorough understanding of top 15-20 repos  
**Time:** 3-5 days  
**Output:** Detailed research reports

For priority repos:
1. Read the actual code (not just README)
2. Understand the architecture decisions
3. Note patterns, anti-patterns, pain points
4. Document what we'd adopt vs. avoid
5. Extract reusable components/patterns

### Phase 3: Pattern Synthesis
**Goal:** Identify cross-repo patterns and best practices  
**Time:** 1-2 days  
**Output:** Pattern catalog + architecture recommendations

Synthesize:
1. Common pipeline stages
2. Common failure modes
3. Best practices by category
4. Technology recommendations
5. Architecture decision inputs

### Phase 4: Architecture Validation
**Goal:** Update architecture with evidence  
**Time:** 1 day  
**Output:** Revised AGENTS.md + ADRs

Update:
1. Validate or revise current assumptions
2. Write ADRs for key decisions
3. Update architecture diagrams
4. Define component contracts

---

## Research Output Structure

```
docs/research/
├── RESEARCH-PLAN-20260102.md          # This file
├── INVENTORY-20260102.md               # Quick survey results
├── PATTERNS-20260102.md                # Cross-repo patterns
│
├── deep-dives/                         # Detailed analysis
│   ├── short-video-maker-gyori-DEEP-20260102.md
│   ├── vidosy-DEEP-20260102.md
│   ├── remotion-DEEP-20260102.md
│   └── ...
│
├── comparisons/                        # Side-by-side analysis
│   ├── rendering-approaches-20260102.md
│   ├── tts-providers-20260102.md
│   ├── orchestration-patterns-20260102.md
│   └── ...
│
└── existing/                           # Current reports (00-16)
    ├── 00-SUMMARY-20260102.md
    ├── 01-moneyprinter-turbo-20260102.md
    └── ...
```

---

## Priority Order

### Must Research (Blocking Decisions)
1. **short-video-maker-gyori** - Blueprint validation
2. **vidosy** - Config pattern validation
3. **chuk-mcp-remotion** - MCP + Remotion integration!
4. **remotion core** - Rendering foundation
5. **openai-agents-js vs langgraph** - Orchestration decision
6. **whisper vs whisperx** - Caption approach

### Should Research (Architecture Inputs)
7. **MoneyPrinterTurbo** - Production patterns
8. **ShortGPT** - TTS patterns
9. **Clip-Anything** - Virality scoring
10. **fastmcp (python & ts)** - MCP patterns
11. **captacity** - Caption styling

### Could Research (Nice to Know)
12. **viralfactory** - Distribution patterns
13. **temporal** - Workflow patterns
14. **yt-dlp** - Content acquisition
15. **pyscenedetect** - Scene detection

---

## Success Criteria

- [ ] All 139 repos surveyed (at least 1-sentence summary)
- [ ] Top 20 repos deeply researched
- [ ] Pattern catalog created
- [ ] Architecture hypotheses validated or revised
- [ ] ADRs written for major decisions
- [ ] Clear "what we're building" vs "what we're using"
- [ ] Identified components to fork/modify vs use as-is

---

## Next Action

**Start with Phase 1: Quick Survey**

Run through all repos systematically, categorize, and update inventory.

Begin with unexplored repos in the "End-to-End Generators" category since that's our target output.
