# Research Stage Design Document

**Document ID:** RESEARCH-STAGE-DESIGN-20260106  
**Status:** DRAFT  
**Author:** AI Assistant  
**Date:** 2026-01-06  
**Version:** 2.0.0

---

## Executive Summary

This document presents a comprehensive design analysis for the **Research Stage** of content-machine — the critical component responsible for discovering trending topics, validating their suitability for short-form video, and providing high-quality input to the script generation pipeline.

**Key Insight:** Research is arguably **the most important stage** of the content pipeline. Static, rules-based approaches will always be inferior to intelligent, dynamic LLM-based research. The cost difference (~$0.001 static vs ~$0.10 agentic) is negligible compared to the value of finding genuinely trending, high-quality topics.

This document evaluates **11 distinct architectural approaches** and recommends **Design 11: Agentic Research** as the optimal solution.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Why Agentic Beats Static](#2-why-agentic-beats-static)
3. [Requirements](#3-requirements)
4. [Research Findings Summary](#4-research-findings-summary)
5. [The 11 Design Approaches](#5-the-11-design-approaches)
6. [Evaluation Matrix](#6-evaluation-matrix)
7. [Recommended Design: Agentic Research](#7-recommended-design-agentic-research)
8. [Implementation Specification](#8-implementation-specification)
9. [Appendix](#appendix)

---

## 1. Problem Statement

### 1.1 The Challenge

Content creators face a daily challenge: **What should I make a video about?**

The ideal topic must be:
- **Trending NOW**: People are actively searching for/discussing it right now
- **Suitable**: Can be covered meaningfully in 30-60 seconds
- **Engaging**: Has hook potential, curiosity gap, relatability
- **Explainable**: We understand WHY it's trending (to create relevant content)
- **Visual**: Can be represented with stock footage

### 1.2 Why Static Approaches Fail

Traditional approaches (scraping Reddit hot posts, fetching Google Trends) have fundamental limitations:

| Static Approach | Problem |
|-----------------|---------|
| Reddit Hot | Just lists posts, doesn't understand WHY they're hot |
| Google Trends | Broad trends, often not suitable for short video |
| HN Top Stories | Tech-only, often too technical |
| Keyword matching | No semantic understanding, misses context |
| Hardcoded sources | Can't adapt to new platforms or niches |

**The core issue:** Static approaches extract DATA, not INSIGHT.

### 1.3 What We Actually Need

An intelligent system that can:

1. **Reason** about what's trending and WHY
2. **Search dynamically** based on the niche (not hardcoded queries)
3. **Synthesize** information from multiple sources
4. **Validate** topics are suitable for our specific use case
5. **Explain** its reasoning so we can trust the recommendations

This is fundamentally an **agentic LLM task**, not a static data pipeline.

---

## 2. Why Agentic Beats Static

### 2.1 The Intelligence Gap

| Capability | Static Pipeline | Agentic Research |
|------------|-----------------|------------------|
| Understands context | ❌ | ✅ |
| Explains WHY trending | ❌ | ✅ |
| Adapts queries to niche | ❌ | ✅ |
| Filters irrelevant results | ❌ | ✅ |
| Suggests content angles | ❌ | ✅ |
| Validates suitability | Limited | ✅ Deep reasoning |
| Learns from new sources | ❌ | ✅ Via web search |

### 2.2 The Cost Argument

"But agentic is more expensive!"

Let's do the math:

| Approach | Cost per Research | Topics Found | Quality | Cost per GOOD Topic |
|----------|-------------------|--------------|---------|---------------------|
| Static (Reddit scrape) | ~$0.001 | 10 | 30% usable | ~$0.003 |
| Agentic (OpenAI Agents) | ~$0.10 | 5 | 90% usable | ~$0.022 |

**But consider the downstream costs:**
- Video production: ~$0.50 (LLM + TTS + API calls)
- Human time reviewing: ~$5 (10 min @ $30/hr)
- Failed video (wrong topic): $0 revenue

**A bad topic wastes $5.50+. An extra $0.10 for better research is a 50x ROI.**

### 2.3 The Dynamism Argument

Static pipelines become stale:
- Reddit API changes → Pipeline breaks
- New platform emerges (Threads, Bluesky) → Can't access
- Niche changes what's "hot" → Hardcoded queries miss it

Agentic research uses web search as the source of truth. As the web updates, the agent adapts.

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Discover trending topics dynamically based on niche | P0 |
| FR-02 | Explain WHY each topic is trending | P0 |
| FR-03 | Validate topic suitability for short-form video | P0 |
| FR-04 | Filter unsafe/inappropriate topics | P0 |
| FR-05 | Suggest content angle and archetype | P0 |
| FR-06 | Provide sources/citations for transparency | P1 |
| FR-07 | Support any niche (tech, fitness, finance, etc.) | P1 |
| FR-08 | Export research results as JSON | P1 |
| FR-09 | Integrate with `cm generate` pipeline | P1 |

### 3.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Latency | <60 seconds for full research |
| NFR-02 | Quality | ≥80% of topics rated "suitable" |
| NFR-03 | Cost | <$0.15 per research run |
| NFR-04 | Reliability | 95% success rate |

### 3.3 Updated Constraints

1. **Quality over cost**: Accept higher LLM costs for better results
2. **Dynamic over static**: Prefer web search over hardcoded APIs
3. **Reasoning required**: Must explain WHY topics are trending
4. **TypeScript-first**: Use `@openai/agents` SDK

---

## 4. Research Findings Summary

### 4.1 Agentic Patterns from OpenAI Agents SDK

Based on analysis of `@openai/agents` examples (research-bot, financial-research-agent):

**Planner-Executor-Synthesizer Pattern:**
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   PLANNER    │───▶│   EXECUTOR   │───▶│  SYNTHESIZER │
│              │    │   (Search)   │    │              │
│ Generate     │    │   Parallel   │    │ Analyze &    │
│ search plan  │    │   execution  │    │ extract      │
└──────────────┘    └──────────────┘    └──────────────┘
```

**Key SDK Features:**
- `webSearchTool()` - Built-in web search, no API keys needed
- Structured outputs with Zod schemas
- Parallel tool execution
- Tracing and observability

### 4.2 Available Tools

| Tool | Source | Cost | Best For |
|------|--------|------|----------|
| `webSearchTool()` | OpenAI Agents SDK | Included in API | Real-time web search |
| OpenAI Moderation | OpenAI API | **Free** | Safety filtering |
| Custom tools | Implement ourselves | Variable | Reddit, HN, specific APIs |

### 4.3 Anti-Hallucination Patterns

From GPT-Researcher and Open Deep Research:

1. **Think Tool**: Force agent to reflect before acting
2. **Citation Tracking**: Require sources for all claims
3. **Verification Agent**: Separate agent validates findings
4. **Hard Limits**: Max tool calls, timeout, iteration caps

---

## 5. The 11 Design Approaches

### Designs 1-10 (Static/Hybrid Approaches)

| # | Design | Approach | Score |
|---|--------|----------|-------|
| 1 | Reddit-First | Scrape hot posts | 3.55 |
| 2 | Google Trends-First | Trend API only | 3.55 |
| 3 | HN Tech-Focused | Firebase API | 3.65 |
| 4 | Multi-Source Aggregation | Combine sources | 3.95 |
| 5 | LLM-Powered Discovery | Basic LLM + search | 3.05 |
| 6 | Cascading Validation | Multi-stage filter | 3.45 |
| 7 | Hybrid Crowd+Algorithm | Reddit + Trends | 4.00 |
| 8 | Semantic Embedding | Similarity search | 3.20 |
| 9 | MCP-Based Agent | Tool protocol | 3.10 |
| 10 | Event-Driven Monitor | Background service | 3.80 |

*See Appendix A for detailed descriptions of designs 1-10.*

---

### Design 11: Agentic Research with OpenAI Agents SDK ⭐ RECOMMENDED

**Architecture:** Multi-agent pipeline with intelligent reasoning at every stage.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Agentic Research Pipeline                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      1. PLANNER AGENT                               │   │
│  │                                                                     │   │
│  │  Input:  "tech programming" (niche)                                 │   │
│  │  Output: WebSearchPlan with 5-10 intelligent queries                │   │
│  │                                                                     │   │
│  │  "Given this niche, what searches will find TRENDING topics?"       │   │
│  │  - Recent discussions (last 24-72 hours)                            │   │
│  │  - Rising controversies                                             │   │
│  │  - Pain points people are expressing                                │   │
│  │  - Breaking news in the space                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   2. SEARCH AGENTS (Parallel)                       │   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │ "React 19   │  │ "AI coding  │  │ "TypeScript │                 │   │
│  │  │  drama"     │  │  burnout"   │  │  5.0 issues"│   ...           │   │
│  │  │             │  │             │  │             │                 │   │
│  │  │ webSearch() │  │ webSearch() │  │ webSearch() │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  │                                                                     │   │
│  │  Each returns: Summary + Sources + Key insights                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   3. SYNTHESIZER AGENT                              │   │
│  │                                                                     │   │
│  │  Input: All search results                                          │   │
│  │  Task: Extract trending topics and EXPLAIN why they're trending     │   │
│  │                                                                     │   │
│  │  Output per topic:                                                  │   │
│  │  - topic: "React 19 Server Components controversy"                  │   │
│  │  - whyTrending: "Major release with breaking changes, devs angry"   │   │
│  │  - trendStrength: "peak"                                            │   │
│  │  - hookAngle: "5 things devs hate about React 19"                   │   │
│  │  - suggestedArchetype: "listicle"                                   │   │
│  │  - sources: ["reddit.com/r/react", "twitter.com/...", ...]          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   4. VALIDATOR AGENT                                │   │
│  │                                                                     │   │
│  │  For each topic, evaluate:                                          │   │
│  │  - Suitability: Can cover in 30-60 seconds?                         │   │
│  │  - Engagement: Will hook viewers in 3 seconds?                      │   │
│  │  - Safety: Brand-safe? Non-controversial?                           │   │
│  │  - Visual: Can represent with stock footage?                        │   │
│  │                                                                     │   │
│  │  + OpenAI Moderation API (free) for safety check                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│                              ▼                                             │
│                     ┌─────────────────┐                                    │
│                     │  research.json  │                                    │
│                     │                 │                                    │
│                     │ Ranked topics   │                                    │
│                     │ with reasoning  │                                    │
│                     │ and scores      │                                    │
│                     └─────────────────┘                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why This Design Wins:**

| Factor | Benefit |
|--------|---------|
| **Intelligence** | LLM reasons about trends, not just counts data |
| **Dynamism** | Web search adapts to any niche, any time |
| **Explainability** | Tells you WHY topics are trending |
| **Quality** | Multi-layer validation catches bad topics |
| **Extensibility** | Easy to add custom tools (Reddit MCP, etc.) |
| **Simplicity** | Uses OpenAI's built-in web search, minimal setup |

---

## 6. Evaluation Matrix

### 6.1 Revised Criteria (Quality-First)

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Intelligence** | 25% | Reasoning capability, context understanding |
| **Accuracy** | 25% | Quality of trending detection |
| **Explainability** | 15% | Can explain WHY topics are trending |
| **Flexibility** | 15% | Adapts to new niches/sources |
| **Reliability** | 10% | Handles failures gracefully |
| **Cost** | 5% | API costs (deprioritized) |
| **Latency** | 5% | Time to get results |

### 6.2 Scoring Matrix (1-5 scale)

| Design | Intel | Accuracy | Explain | Flex | Reliable | Cost | Latency | **Weighted** |
|--------|-------|----------|---------|------|----------|------|---------|--------------|
| 1. Reddit-First | 1 | 3 | 1 | 2 | 3 | 5 | 4 | **2.20** |
| 2. Google Trends | 1 | 4 | 1 | 2 | 3 | 5 | 3 | **2.35** |
| 3. HN Tech | 1 | 3 | 1 | 1 | 4 | 5 | 5 | **2.10** |
| 4. Multi-Source | 2 | 4 | 2 | 3 | 4 | 4 | 3 | **2.95** |
| 5. LLM Discovery | 3 | 3 | 3 | 4 | 3 | 2 | 3 | **3.10** |
| 6. Cascading | 3 | 4 | 3 | 3 | 4 | 3 | 2 | **3.35** |
| 7. Hybrid | 2 | 4 | 2 | 3 | 4 | 4 | 3 | **3.00** |
| 8. Embedding | 3 | 3 | 2 | 3 | 3 | 3 | 3 | **2.85** |
| 9. MCP Agent | 4 | 4 | 4 | 5 | 3 | 2 | 2 | **3.70** |
| 10. Event-Driven | 2 | 4 | 2 | 2 | 4 | 4 | 5 | **2.85** |
| **11. Agentic** | **5** | **5** | **5** | **5** | **4** | **2** | **3** | **4.60** |

### 6.3 Final Ranking

| Rank | Design | Score | Verdict |
|------|--------|-------|---------|
| 🥇 | **11. Agentic Research** | 4.60 | **RECOMMENDED** |
| 🥈 | 9. MCP Agent | 3.70 | Good, but more complex |
| 🥉 | 6. Cascading Validation | 3.35 | Reasonable fallback |
| 4 | 5. LLM Discovery | 3.10 | Simpler agentic |
| 5 | 7. Hybrid Crowd+Algo | 3.00 | Best static option |

---

## 7. Recommended Design: Agentic Research

### 7.1 Technology Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| **Agent SDK** | `@openai/agents` | Official, TypeScript, built-in web search |
| **LLM (Planning)** | gpt-4o | Best reasoning |
| **LLM (Search)** | gpt-4o | Web search integration |
| **LLM (Synthesis)** | gpt-4o | Complex reasoning |
| **LLM (Validation)** | gpt-4o-mini | Cheaper, simpler task |
| **Safety** | OpenAI Moderation API | Free, reliable |
| **Schemas** | Zod | Type-safe structured outputs |

### 7.2 Cost Estimate

| Stage | Model | Tokens | Cost |
|-------|-------|--------|------|
| Planner | gpt-4o | ~1,000 | ~$0.01 |
| Search (5-8 queries) | gpt-4o | ~6,000 | ~$0.06 |
| Synthesizer | gpt-4o | ~2,000 | ~$0.02 |
| Validator (5 topics) | gpt-4o-mini | ~2,500 | ~$0.005 |
| Safety (5 topics) | Moderation | - | **Free** |
| **Total** | | | **~$0.095** |

**Per-topic cost:** ~$0.02 for validated, high-quality trending topic

### 7.3 Latency Estimate

| Stage | Time |
|-------|------|
| Planning | ~3s |
| Search (parallel) | ~10-15s |
| Synthesis | ~5s |
| Validation (parallel) | ~5s |
| **Total** | **~25-30s** |

---

## 8. Implementation Specification

### 8.1 Zod Schemas

```typescript
// src/research/schemas.ts
import { z } from 'zod';

// Search plan from Planner Agent
export const WebSearchPlanSchema = z.object({
  searches: z.array(z.object({
    query: z.string().describe('Search query'),
    reason: z.string().describe('Why this search matters'),
    expectedInsight: z.string().describe('What we hope to learn'),
  })).min(5).max(10),
});

// Trending topics from Synthesizer Agent
export const TrendingTopicsSchema = z.object({
  topics: z.array(z.object({
    topic: z.string().describe('Clear, specific topic title'),
    whyTrending: z.string().describe('Explanation of WHY this is trending NOW'),
    trendStrength: z.enum(['emerging', 'growing', 'peak', 'declining']),
    hookAngle: z.string().describe('Best angle for 30-60s video'),
    suggestedArchetype: z.enum(['listicle', 'versus', 'howto', 'myth', 'story', 'hot-take']),
    sources: z.array(z.string().url()).min(1),
    keyInsights: z.array(z.string()).min(1).max(5),
  })).min(3).max(10),
});

// Validation result from Validator Agent
export const TopicValidationSchema = z.object({
  isValid: z.boolean(),
  scores: z.object({
    suitability: z.number().min(0).max(1).describe('Can cover in 30-60s'),
    engagement: z.number().min(0).max(1).describe('Hook potential'),
    safety: z.number().min(0).max(1).describe('Brand-safe'),
    visualPotential: z.number().min(0).max(1).describe('Stock footage available'),
  }),
  overallScore: z.number().min(0).max(1),
  reasoning: z.string().describe('Why this topic passes/fails'),
  suggestedImprovements: z.array(z.string()).optional(),
});

// Final research output
export const ResearchOutputSchema = z.object({
  schemaVersion: z.literal('2.0.0'),
  generatedAt: z.string().datetime(),
  niche: z.string(),
  
  topics: z.array(z.object({
    rank: z.number(),
    topic: z.string(),
    whyTrending: z.string(),
    trendStrength: z.enum(['emerging', 'growing', 'peak', 'declining']),
    hookAngle: z.string(),
    suggestedArchetype: z.enum(['listicle', 'versus', 'howto', 'myth', 'story', 'hot-take']),
    sources: z.array(z.string()),
    validation: TopicValidationSchema,
  })),
  
  stats: z.object({
    searchesPerformed: z.number(),
    topicsDiscovered: z.number(),
    topicsValidated: z.number(),
    topicsRejected: z.number(),
    processingTimeMs: z.number(),
    estimatedCostUsd: z.number(),
  }),
});

export type WebSearchPlan = z.infer<typeof WebSearchPlanSchema>;
export type TrendingTopics = z.infer<typeof TrendingTopicsSchema>;
export type TopicValidation = z.infer<typeof TopicValidationSchema>;
export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;
```

### 8.2 Agent Definitions

```typescript
// src/research/agents.ts
import { Agent, webSearchTool } from '@openai/agents';
import { WebSearchPlanSchema, TrendingTopicsSchema, TopicValidationSchema } from './schemas';

// 1. PLANNER AGENT
export const plannerAgent = new Agent({
  name: 'TrendResearchPlanner',
  model: 'gpt-4o',
  instructions: `You are a trend research strategist specializing in content discovery.

Given a niche/category, generate 5-10 intelligent web searches to discover what's TRENDING RIGHT NOW.

Your searches should find:
1. **Breaking discussions** - What are people talking about in the last 24-72 hours?
2. **Rising controversies** - What's causing debate or strong opinions?
3. **Pain points** - What problems are people complaining about?
4. **New releases/announcements** - What just launched or was announced?
5. **Unexpected events** - What surprised the community?

CRITICAL: Focus on RECENCY. We want topics that are trending NOW, not evergreen content.

For each search, explain:
- query: The exact search term
- reason: Why this search will find trending content
- expectedInsight: What kind of topics we might discover`,
  outputType: WebSearchPlanSchema,
});

// 2. SEARCH AGENT
export const searchAgent = new Agent({
  name: 'TrendSearcher',
  model: 'gpt-4o',
  instructions: `You are a research assistant finding trending topics.

Given a search query and reason, use web search to find relevant content.

For each result, extract:
- What topic is being discussed?
- Why is it trending NOW? (What triggered this?)
- What's the sentiment? (excitement, frustration, curiosity, etc.)
- What would be a good "hook" for a video about this?

Be concise - max 200 words per search result.
Always cite your sources with URLs.`,
  tools: [webSearchTool({ searchContextSize: 'medium' })],
  modelSettings: { toolChoice: 'required' },
});

// 3. SYNTHESIZER AGENT
export const synthesizerAgent = new Agent({
  name: 'TrendSynthesizer',
  model: 'gpt-4o',
  instructions: `You are a content strategist who analyzes research and extracts trending topics.

Given search results from multiple queries, synthesize them into a list of trending topics.

For each topic you identify:
1. **topic**: Clear, specific title (not vague like "AI updates")
2. **whyTrending**: Be SPECIFIC about what triggered this trend (an event, release, controversy, etc.)
3. **trendStrength**: Is it emerging, growing, at peak, or declining?
4. **hookAngle**: What's the most engaging angle for a 30-60 second video?
5. **suggestedArchetype**: Which format works best?
   - listicle: "5 things about X"
   - versus: "X vs Y"
   - howto: "How to X"
   - myth: "The myth of X"
   - story: "The story of X"
   - hot-take: "Unpopular opinion about X"
6. **sources**: Where did you find evidence of this trend?
7. **keyInsights**: 1-5 bullet points of key facts

PRIORITIZE:
- Fresh (last 24-72 hours)
- Discussable (people have opinions)
- Visual (can be shown with footage)
- Relatable (audience can connect)

AVOID:
- Evergreen content (not trending, just popular)
- Too niche (requires specialized knowledge)
- Too broad (can't cover in 60 seconds)`,
  outputType: TrendingTopicsSchema,
});

// 4. VALIDATOR AGENT
export const validatorAgent = new Agent({
  name: 'TopicValidator',
  model: 'gpt-4o-mini',
  instructions: `You validate if topics are suitable for short-form video (TikTok/Reels/Shorts).

Score each dimension 0.0-1.0:

**suitability** (Can cover in 30-60 seconds?)
- 1.0: Perfect scope, single clear point
- 0.5: Needs some trimming but doable
- 0.0: Way too broad or complex

**engagement** (Hook potential?)
- 1.0: Instant curiosity, FOMO, controversy
- 0.5: Interesting but not urgent
- 0.0: Boring, no hook

**safety** (Brand-safe?)
- 1.0: Totally safe for all audiences
- 0.5: Slightly edgy but acceptable
- 0.0: Controversial, political, NSFW

**visualPotential** (Stock footage available?)
- 1.0: Concrete objects/actions easy to film
- 0.5: Some abstract concepts but filmable
- 0.0: Pure abstraction, impossible to visualize

Overall score = weighted average (engagement weighted 2x).

isValid = overallScore >= 0.6 AND safety >= 0.7

Provide reasoning for your scores.`,
  outputType: TopicValidationSchema,
});
```

### 8.3 Research Manager

```typescript
// src/research/manager.ts
import { run, withTrace } from '@openai/agents';
import OpenAI from 'openai';
import {
  plannerAgent,
  searchAgent,
  synthesizerAgent,
  validatorAgent,
} from './agents';
import { ResearchOutput, ResearchOutputSchema, TopicValidation } from './schemas';
import { logger } from '../core/logger';

export class ResearchManager {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI();
  }

  async run(niche: string): Promise<ResearchOutput> {
    const startTime = Date.now();
    
    return await withTrace('Research Pipeline', async (trace) => {
      logger.info({ niche, traceId: trace.traceId }, 'Starting research pipeline');
      
      // 1. PLAN: Generate search queries
      logger.info('Planning searches...');
      const plan = await run(plannerAgent, `Niche: ${niche}`);
      const searchPlan = plan.finalOutput!;
      logger.info({ searches: searchPlan.searches.length }, 'Search plan created');
      
      // 2. SEARCH: Execute in parallel
      logger.info('Executing searches...');
      const searchResults = await Promise.all(
        searchPlan.searches.map(async (item) => {
          const result = await run(searchAgent, 
            `Search: ${item.query}\nReason: ${item.reason}\nExpected: ${item.expectedInsight}`
          );
          return result.finalOutput;
        })
      );
      logger.info({ results: searchResults.length }, 'Searches completed');
      
      // 3. SYNTHESIZE: Extract trending topics
      logger.info('Synthesizing topics...');
      const synthesis = await run(synthesizerAgent, 
        `Niche: ${niche}\n\nSearch Results:\n${searchResults.join('\n\n---\n\n')}`
      );
      const trendingTopics = synthesis.finalOutput!;
      logger.info({ topics: trendingTopics.topics.length }, 'Synthesis complete');
      
      // 4. VALIDATE: Check each topic
      logger.info('Validating topics...');
      const validationResults = await Promise.all(
        trendingTopics.topics.map(async (topic) => {
          // LLM validation
          const validation = await run(validatorAgent, JSON.stringify(topic));
          
          // Safety check with OpenAI Moderation (free)
          const moderation = await this.checkSafety(topic.topic + ' ' + topic.hookAngle);
          
          // Combine results
          const finalValidation = validation.finalOutput!;
          if (moderation.flagged) {
            finalValidation.isValid = false;
            finalValidation.scores.safety = 0;
            finalValidation.reasoning += ' [FLAGGED BY MODERATION]';
          }
          
          return { topic, validation: finalValidation };
        })
      );
      
      // 5. RANK: Sort by score, filter invalid
      const validTopics = validationResults
        .filter(r => r.validation.isValid)
        .sort((a, b) => b.validation.overallScore - a.validation.overallScore);
      
      const processingTimeMs = Date.now() - startTime;
      
      // 6. BUILD OUTPUT
      const output: ResearchOutput = {
        schemaVersion: '2.0.0',
        generatedAt: new Date().toISOString(),
        niche,
        topics: validTopics.map((r, i) => ({
          rank: i + 1,
          topic: r.topic.topic,
          whyTrending: r.topic.whyTrending,
          trendStrength: r.topic.trendStrength,
          hookAngle: r.topic.hookAngle,
          suggestedArchetype: r.topic.suggestedArchetype,
          sources: r.topic.sources,
          validation: r.validation,
        })),
        stats: {
          searchesPerformed: searchPlan.searches.length,
          topicsDiscovered: trendingTopics.topics.length,
          topicsValidated: validTopics.length,
          topicsRejected: trendingTopics.topics.length - validTopics.length,
          processingTimeMs,
          estimatedCostUsd: this.estimateCost(searchPlan.searches.length, trendingTopics.topics.length),
        },
      };
      
      logger.info({
        validTopics: output.stats.topicsValidated,
        rejected: output.stats.topicsRejected,
        timeMs: processingTimeMs,
        cost: output.stats.estimatedCostUsd,
      }, 'Research pipeline complete');
      
      return ResearchOutputSchema.parse(output);
    });
  }
  
  private async checkSafety(text: string): Promise<{ flagged: boolean }> {
    const result = await this.openai.moderations.create({
      model: 'omni-moderation-latest',
      input: text,
    });
    return { flagged: result.results[0].flagged };
  }
  
  private estimateCost(searches: number, topics: number): number {
    // Rough estimates based on token usage
    const plannerCost = 0.01;
    const searchCost = searches * 0.008;
    const synthesizerCost = 0.02;
    const validatorCost = topics * 0.001;
    return plannerCost + searchCost + synthesizerCost + validatorCost;
  }
}
```

### 8.4 CLI Command

```typescript
// src/cli/commands/research.ts
import { Command } from 'commander';
import { ResearchManager } from '../../research/manager';
import { logger } from '../../core/logger';
import fs from 'fs/promises';

export function createResearchCommand(): Command {
  const cmd = new Command('research')
    .description('Discover trending topics for video content using AI-powered research')
    .argument('<niche>', 'Topic niche to research (e.g., "tech programming", "fitness")')
    .option('--output <path>', 'Output file path', 'research.json')
    .option('--json', 'Output as JSON to stdout (no file)')
    .option('--top <n>', 'Show only top N topics', '5')
    .action(async (niche, options) => {
      console.log(`\n🔍 Researching trending topics in: ${niche}\n`);
      console.log('This may take 30-60 seconds...\n');
      
      const manager = new ResearchManager();
      const result = await manager.run(niche);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      // Human-readable output
      console.log('═'.repeat(70));
      console.log('📊 TRENDING TOPICS');
      console.log('═'.repeat(70));
      
      const topN = parseInt(options.top);
      const topics = result.topics.slice(0, topN);
      
      for (const topic of topics) {
        const emoji = topic.trendStrength === 'peak' ? '🔥' : 
                      topic.trendStrength === 'growing' ? '📈' :
                      topic.trendStrength === 'emerging' ? '🌱' : '📉';
        
        console.log(`\n${emoji} #${topic.rank}: ${topic.topic}`);
        console.log(`   WHY: ${topic.whyTrending}`);
        console.log(`   HOOK: ${topic.hookAngle}`);
        console.log(`   FORMAT: ${topic.suggestedArchetype} | SCORE: ${(topic.validation.overallScore * 100).toFixed(0)}%`);
        console.log(`   SOURCES: ${topic.sources.slice(0, 2).join(', ')}`);
      }
      
      console.log('\n' + '═'.repeat(70));
      console.log(`✅ Found ${result.stats.topicsValidated} valid topics (${result.stats.topicsRejected} rejected)`);
      console.log(`⏱️  Time: ${(result.stats.processingTimeMs / 1000).toFixed(1)}s | 💰 Est. cost: $${result.stats.estimatedCostUsd.toFixed(3)}`);
      console.log('═'.repeat(70));
      
      // Save to file
      await fs.writeFile(options.output, JSON.stringify(result, null, 2));
      console.log(`\n📁 Full results saved to: ${options.output}\n`);
    });
  
  return cmd;
}
```

---

## 9. Appendix

### A. Designs 1-10 (Summary)

| # | Design | Description |
|---|--------|-------------|
| 1 | Reddit-First | Scrape hot posts from subreddits, extract topics with LLM |
| 2 | Google Trends-First | Use Google Trends API for trending searches |
| 3 | HN Tech-Focused | Monitor Hacker News Firebase API for tech topics |
| 4 | Multi-Source Aggregation | Combine Reddit + HN + Trends, aggregate and dedupe |
| 5 | LLM-Powered Discovery | Basic LLM with web search, less structured |
| 6 | Cascading Validation | Multi-stage: Discover → Validate → Filter → Score |
| 7 | Hybrid Crowd+Algorithm | Combine human signals (votes) with algorithmic scoring |
| 8 | Semantic Embedding | Use embeddings to find similar topics to past winners |
| 9 | MCP-Based Agent | Model Context Protocol with tool servers |
| 10 | Event-Driven Monitor | Background service that polls continuously |

### B. Cost Comparison

| Approach | Cost/Run | Quality | Time | Verdict |
|----------|----------|---------|------|---------|
| Static (Reddit) | $0.001 | Low | 5s | ❌ Poor quality |
| Hybrid | $0.01 | Medium | 15s | ⚠️ Okay for MVP |
| **Agentic** | $0.10 | High | 30s | ✅ Best ROI |

### C. Dependencies

```json
{
  "dependencies": {
    "@openai/agents": "^0.1.0",
    "openai": "^4.0.0",
    "zod": "^3.22.0"
  }
}
```

### D. Related Documents

- [SYSTEM-DESIGN-20260104.md](SYSTEM-DESIGN-20260104.md) - Core architecture
- [IMPL-PHASE-1-SCRIPT-20260105.md](IMPL-PHASE-1-SCRIPT-20260105.md) - Script generation

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-06 | Selected Design 11 (Agentic) | Intelligence > cost for research |
| 2026-01-06 | Use `@openai/agents` SDK | Official, TypeScript, built-in web search |
| 2026-01-06 | Deprioritize cost in evaluation | Quality of research is worth the investment |
| 2026-01-06 | Include "whyTrending" in output | Reasoning is essential for content creation |
| 2026-01-06 | Use OpenAI Moderation | Free safety check |

---

**Document Status:** DRAFT v2.0 - Revised with Agentic-First Approach  
**Next Steps:**
1. Install `@openai/agents` SDK
2. Implement schemas and agents
3. Create CLI command
4. Write integration tests

---

*Last Updated: 2026-01-06*
