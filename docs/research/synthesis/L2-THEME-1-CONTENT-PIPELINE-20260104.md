# Layer 2 Theme 1: Content Pipeline

**Date:** 2026-01-04  
**Synthesized From:** Categories A, B, J  
**Layer:** 2 (Theme Synthesis)  
**Feeds Into:** Layer 1 Master Architecture

---

## Theme Summary

The **Content Pipeline** theme covers how content flows from **trend discovery** through **topic selection** to **video generation**. This synthesizes findings from video generators (A), blueprint repos (B), and connectors (J).

---

## Universal Pipeline Pattern

Every video generator follows a 5-stage pipeline:

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  INPUT  │───▶│ SCRIPT  │───▶│  AUDIO  │───▶│ VISUALS │───▶│ RENDER  │
│         │    │         │    │         │    │         │    │         │
│ Topic   │    │ LLM     │    │ TTS     │    │ Stock/  │    │ FFmpeg/ │
│ Reddit  │    │ Generate│    │ Voices  │    │ Capture │    │ Remotion│
│ Trends  │    │ Script  │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

---

## Stage 1: Input & Trend Discovery

### Sources Ranked by Quality

| Source | Content Type | Automation | Quality |
|--------|--------------|------------|---------|
| **Reddit** | Stories, discussions | High | ★★★★☆ |
| **Hacker News** | Tech news | High | ★★★★★ |
| **YouTube Transcripts** | Video research | High | ★★★★☆ |
| **Manual Topics** | Curated ideas | Low | ★★★★★ |

### Implementation Pattern

```typescript
interface TrendSource {
  name: string;
  fetch(query?: string): Promise<TrendItem[]>;
  score(item: TrendItem): number;
}

class TrendAggregator {
  constructor(private sources: TrendSource[]) {}
  
  async discover(topic?: string): Promise<TrendItem[]> {
    // Parallel fetch from all sources
    const results = await Promise.all(
      this.sources.map(s => s.fetch(topic))
    );
    
    // Flatten and deduplicate
    const all = results.flat();
    const unique = this.deduplicate(all);
    
    // Score and rank
    return unique
      .map(item => ({
        ...item,
        score: this.calculateScore(item)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
  
  private calculateScore(item: TrendItem): number {
    // Engagement + recency + uniqueness
    const engagement = Math.log10(item.upvotes + 1) * 0.4;
    const recency = Math.max(0, 1 - item.ageHours / 168) * 0.3;
    const uniqueness = item.isOriginal ? 0.3 : 0;
    return engagement + recency + uniqueness;
  }
}
```

### MCP Integration

```python
# research-mcp server
@mcp.tool()
async def discover_trends(
    topic: str,
    sources: list[str] = ["reddit", "hackernews", "youtube"]
) -> list[dict]:
    """Discover trending topics from multiple sources."""
    aggregator = TrendAggregator(sources)
    return await aggregator.discover(topic)

@mcp.tool()
async def research_topic(topic: str) -> dict:
    """Deep research on a specific topic."""
    # Aggregate from multiple sources
    reddit = await reddit_client.search(topic)
    youtube = await youtube_client.search(topic)
    web = await tavily_client.search(topic)
    
    return {
        "reddit_discussions": reddit[:5],
        "youtube_videos": youtube[:5],
        "web_articles": web[:5],
        "summary": await llm.summarize(topic, reddit + youtube + web)
    }
```

---

## Stage 2: Script Generation

### Prompt Engineering Patterns

From analyzing 30+ generators, these patterns produce the best scripts:

```typescript
const SCRIPT_SYSTEM_PROMPT = `
You are a viral short-form video scriptwriter. Your scripts are:
- Hook-first: First 3 seconds grab attention
- Concise: 60 words per 30 seconds max
- Conversational: Natural speech patterns
- Action-oriented: Clear value proposition

Structure every script as:
1. HOOK (0-3s): Question, statement, or surprising fact
2. SETUP (3-15s): Context and problem
3. CONTENT (15-50s): Value delivery
4. CTA (50-60s): Clear next step
`;

const SCRIPT_USER_PROMPT = (topic: string, research: Research) => `
Create a 60-second TikTok script about: ${topic}

Research context:
${JSON.stringify(research, null, 2)}

Requirements:
- Target audience: ${research.audience || 'tech-savvy 18-35'}
- Tone: ${research.tone || 'educational but entertaining'}
- Include 2-3 specific examples or stats
- End with engagement question

Output as JSON:
{
  "title": "Video title",
  "hook": "First 3 seconds",
  "scenes": [
    {"text": "Scene text", "duration": 5, "visual": "Visual description"}
  ],
  "cta": "Call to action"
}
`;
```

### Structured Output

```typescript
import { z } from 'zod';

const SceneSchema = z.object({
  text: z.string().describe('Voiceover text for this scene'),
  duration: z.number().min(2).max(15),
  visual: z.string().describe('Visual description or search terms'),
  searchTerms: z.array(z.string()).optional()
});

const ScriptSchema = z.object({
  title: z.string().max(100),
  hook: z.string().max(50),
  scenes: z.array(SceneSchema).min(3).max(10),
  cta: z.string().max(100),
  totalDuration: z.number()
});

async function generateScript(topic: string, research: Research): Promise<Script> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SCRIPT_SYSTEM_PROMPT },
      { role: 'user', content: SCRIPT_USER_PROMPT(topic, research) }
    ],
    response_format: { type: 'json_object' }
  });
  
  const parsed = JSON.parse(response.choices[0].message.content!);
  return ScriptSchema.parse(parsed);
}
```

---

## Stage 3: Content Flow

### From Trend to Script

```typescript
class ContentPipeline {
  constructor(
    private trendService: TrendAggregator,
    private researchService: ResearchService,
    private scriptService: ScriptService
  ) {}
  
  async createContent(params: ContentParams): Promise<Script> {
    // Step 1: Discover trends
    const trends = await this.trendService.discover(params.topic);
    
    // Step 2: Select best trend
    const selected = await this.selectTrend(trends, params);
    
    // Step 3: Deep research
    const research = await this.researchService.research(selected.title);
    
    // Step 4: Generate script
    const script = await this.scriptService.generate(selected.title, research);
    
    // Step 5: Validate
    await this.validate(script);
    
    return script;
  }
  
  private async selectTrend(
    trends: TrendItem[],
    params: ContentParams
  ): Promise<TrendItem> {
    // Use LLM to select best trend for our audience
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Select the best trend for a ${params.audience} video:
        ${JSON.stringify(trends.slice(0, 10))}
        
        Return the index (0-9) of the best trend.`
      }]
    });
    
    const index = parseInt(response.choices[0].message.content!);
    return trends[index];
  }
}
```

---

## Blueprint Integration

### short-video-maker-gyori Pattern

```typescript
// Vidosy-style configuration
interface VideoConfig {
  topic: string;
  template: string;
  scenes: Scene[];
  audio: AudioConfig;
  captions: CaptionConfig;
  output: OutputConfig;
}

// Pipeline orchestration
async function createVideo(topic: string): Promise<string> {
  // Research phase
  const research = await mcp.call('research/discover_trends', { topic });
  
  // Script phase
  const script = await mcp.call('script/generate', {
    topic,
    research,
    length: 60
  });
  
  // Audio phase
  const audio = await mcp.call('tts/generate', {
    script: script.scenes.map(s => s.text).join(' '),
    voice: 'af_heart'
  });
  
  // Render phase
  const video = await mcp.call('render/create', {
    config: {
      scenes: script.scenes,
      audioPath: audio.path,
      template: 'modern-captions'
    }
  });
  
  return video.path;
}
```

---

## Key Decisions

### 1. Multi-Source Aggregation

**Decision:** Aggregate from Reddit, HN, YouTube, and web search
**Rationale:** No single source has complete trend coverage
**Trade-off:** More complexity but better content diversity

### 2. LLM-Based Selection

**Decision:** Use LLM to select and prioritize trends
**Rationale:** Better context understanding than keyword matching
**Trade-off:** API costs but higher quality selections

### 3. Structured Script Output

**Decision:** Enforce Zod schema validation on all scripts
**Rationale:** Downstream pipeline requires consistent structure
**Trade-off:** May reject creative outputs that don't fit schema

### 4. Research Depth

**Decision:** Deep research before script generation
**Rationale:** Better scripts come from better context
**Trade-off:** Slower pipeline but higher quality

---

## Integration Points

```
┌────────────────────────────────────────────────────────────────┐
│                     CONTENT PIPELINE                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│  │   Reddit    │     │  Research   │     │   Script    │      │
│  │  HN, YT     │────▶│   Agent     │────▶│  Generator  │─────▶│
│  │  Connectors │     │   (LLM)     │     │   (LLM)     │      │
│  └─────────────┘     └─────────────┘     └─────────────┘      │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│     MCP Tools          Langfuse           Zod Schema          │
│                        Tracing            Validation          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ VIDEO PRODUCTION │
                    │    (Theme 2)     │
                    └─────────────────┘
```

---

## Source Categories

- **Category A:** 15 video generator deep-dives
- **Category B:** 4 blueprint repo deep-dives
- **Category J:** 5 connector deep-dives

---

## Key Takeaway

> **Content pipeline follows INPUT → RESEARCH → SCRIPT flow. Aggregate trends from multiple sources (Reddit, HN, YouTube), use LLM for selection and research, generate structured scripts with Zod validation. This feeds into the Video Production pipeline.**
