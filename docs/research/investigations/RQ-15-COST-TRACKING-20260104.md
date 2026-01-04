# RQ-15: Cost Tracking Patterns

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P2  
**Question:** How do we track and report API/compute costs per video?

---

## 1. Problem Statement

Video generation involves multiple paid services:
- LLM calls (OpenAI, Anthropic)
- TTS generation (optional paid services)
- Stock asset APIs (Pexels, Unsplash)
- Compute (local or cloud)

Cost visibility enables:
- Budget management
- Cost optimization
- Usage-based pricing (if applicable)
- Resource allocation decisions

---

## 2. Vendor Evidence

### 2.1 Langfuse Cost Tracking

**Source:** [vendor/observability/langfuse](../../../vendor/observability/langfuse)

Langfuse provides automatic cost tracking for LLM calls:

```typescript
// Langfuse trace with cost tracking
import { Langfuse } from "langfuse";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

// Create trace for video generation
const trace = langfuse.trace({
  name: "video-generation",
  metadata: { videoId: "vid-123" },
});

// Generation automatically tracks tokens
const generation = trace.generation({
  name: "script-generation",
  model: "gpt-4o-mini",
  input: prompt,
  output: response,
  usage: {
    promptTokens: 1500,
    completionTokens: 800,
    totalTokens: 2300,
  },
  // Cost calculated from model pricing
});
```

### 2.2 Token Counting

**Source:** [vendor/agents/langchain](../../../vendor/agents/langchain)

```python
# Tiktoken for accurate token counting
import tiktoken

def count_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

def estimate_cost(prompt_tokens: int, completion_tokens: int, model: str) -> float:
    PRICING = {
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},      # per 1M tokens
        "gpt-4o": {"input": 5.00, "output": 15.00},
        "gpt-4-turbo": {"input": 10.00, "output": 30.00},
        "claude-3-5-sonnet": {"input": 3.00, "output": 15.00},
    }
    
    if model not in PRICING:
        return 0.0
    
    rates = PRICING[model]
    input_cost = (prompt_tokens / 1_000_000) * rates["input"]
    output_cost = (completion_tokens / 1_000_000) * rates["output"]
    
    return input_cost + output_cost
```

### 2.3 BullMQ Budget Alerts

**Source:** [vendor/job-queue/bullmq](../../../vendor/job-queue/bullmq)

```typescript
// Track costs in job metadata
const videoQueue = new Queue("video-generation");

await videoQueue.add("generate", videoSpec, {
  jobId: `video-${videoId}`,
  meta: {
    budgetLimit: 1.00,  // $1 max per video
    currentCost: 0,
  },
});

// Job processor updates cost
const worker = new Worker("video-generation", async (job) => {
  const costTracker = new CostTracker(job);
  
  // Track LLM cost
  const scriptResult = await generateScript(job.data);
  costTracker.addCost("llm", scriptResult.cost);
  
  // Check budget
  if (costTracker.total > job.meta.budgetLimit) {
    throw new BudgetExceededError(costTracker.total, job.meta.budgetLimit);
  }
  
  // Continue pipeline...
});
```

---

## 3. Cost Components

### 3.1 LLM Costs

| Model | Input ($/1M tokens) | Output ($/1M tokens) | Typical Video Cost |
|-------|---------------------|----------------------|-------------------|
| gpt-4o-mini | $0.15 | $0.60 | $0.001-0.005 |
| gpt-4o | $5.00 | $15.00 | $0.02-0.10 |
| claude-3-5-sonnet | $3.00 | $15.00 | $0.01-0.05 |

### 3.2 TTS Costs

| Service | Pricing | Typical Video Cost |
|---------|---------|-------------------|
| Edge TTS | Free | $0.00 |
| OpenAI TTS | $15/1M chars | $0.02-0.05 |
| ElevenLabs | $0.30/1K chars | $0.10-0.50 |

### 3.3 Asset API Costs

| Service | Pricing | Typical Video Cost |
|---------|---------|-------------------|
| Pexels | Free | $0.00 |
| Unsplash | Free | $0.00 |
| Shutterstock | $0.22-2.00/asset | $0.50-5.00 |

### 3.4 Compute Costs

| Environment | Pricing | Typical Video Cost |
|-------------|---------|-------------------|
| Local | $0 (electricity) | ~$0.01 |
| AWS Lambda | $0.0000166/GB-s | $0.05-0.20 |
| Remotion Cloud | Variable | $0.10-0.50 |

---

## 4. Recommended Implementation

### 4.1 Cost Tracker Class

```typescript
// src/common/cost-tracker.ts
interface CostEntry {
  category: string;
  service: string;
  amount: number;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export class CostTracker {
  private entries: CostEntry[] = [];
  private budgetLimit?: number;
  
  constructor(options?: { budgetLimit?: number }) {
    this.budgetLimit = options?.budgetLimit;
  }
  
  addCost(
    category: string,
    service: string,
    amount: number,
    metadata: Record<string, unknown> = {}
  ): void {
    this.entries.push({
      category,
      service,
      amount,
      metadata,
      timestamp: new Date(),
    });
    
    if (this.budgetLimit && this.total > this.budgetLimit) {
      throw new BudgetExceededError(this.total, this.budgetLimit);
    }
  }
  
  get total(): number {
    return this.entries.reduce((sum, e) => sum + e.amount, 0);
  }
  
  byCategory(): Record<string, number> {
    return this.entries.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);
  }
  
  toJSON(): object {
    return {
      total: this.total,
      byCategory: this.byCategory(),
      entries: this.entries,
    };
  }
}
```

### 4.2 LLM Cost Calculator

```typescript
// src/llm/cost.ts
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 5.00, output: 15.00 },
  "gpt-4-turbo": { input: 10.00, output: 30.00 },
  "claude-3-5-sonnet-20241022": { input: 3.00, output: 15.00 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
};

export function calculateLLMCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  
  if (!pricing) {
    console.warn(`Unknown model pricing: ${model}`);
    return 0;
  }
  
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
}
```

### 4.3 Pipeline Integration

```typescript
// src/pipeline/generate.ts
import { CostTracker } from "../common/cost-tracker";

interface GenerationResult {
  videoPath: string;
  costs: ReturnType<CostTracker["toJSON"]>;
}

export async function generateVideo(
  spec: VideoSpec,
  options?: { budgetLimit?: number }
): Promise<GenerationResult> {
  const costs = new CostTracker({ budgetLimit: options?.budgetLimit });
  
  // Script generation
  const scriptResult = await generateScript(spec.topic);
  costs.addCost("llm", "openai", scriptResult.cost, {
    model: scriptResult.model,
    tokens: scriptResult.totalTokens,
  });
  
  // Audio generation
  const audioResult = await generateAudio(scriptResult.script);
  costs.addCost("tts", audioResult.service, audioResult.cost, {
    characters: audioResult.characterCount,
  });
  
  // Visual assets
  const visualsResult = await gatherVisuals(scriptResult.scenes);
  costs.addCost("assets", "pexels", 0, {
    assetCount: visualsResult.assets.length,
  });
  
  // Rendering
  const renderStart = Date.now();
  const videoPath = await renderVideo({
    script: scriptResult,
    audio: audioResult,
    visuals: visualsResult,
  });
  const renderDurationMs = Date.now() - renderStart;
  
  // Estimate compute cost (if cloud)
  const computeCost = estimateComputeCost(renderDurationMs);
  if (computeCost > 0) {
    costs.addCost("compute", "render", computeCost, {
      durationMs: renderDurationMs,
    });
  }
  
  return {
    videoPath,
    costs: costs.toJSON(),
  };
}
```

### 4.4 Cost Report Output

```typescript
// CLI output example
function printCostReport(costs: ReturnType<CostTracker["toJSON"]>): void {
  console.log("\n📊 Cost Summary");
  console.log("─".repeat(40));
  
  for (const [category, amount] of Object.entries(costs.byCategory)) {
    console.log(`  ${category.padEnd(15)} $${amount.toFixed(4)}`);
  }
  
  console.log("─".repeat(40));
  console.log(`  ${"TOTAL".padEnd(15)} $${costs.total.toFixed(4)}`);
  console.log("");
}
```

Example output:

```
📊 Cost Summary
────────────────────────────────────────
  llm             $0.0032
  tts             $0.0000
  assets          $0.0000
  compute         $0.0100
────────────────────────────────────────
  TOTAL           $0.0132
```

---

## 5. Langfuse Integration

### 5.1 Full Tracing

```typescript
// src/observability/langfuse.ts
import { Langfuse } from "langfuse";

const langfuse = new Langfuse();

export async function traceVideoGeneration(
  spec: VideoSpec
): Promise<GenerationResult> {
  const trace = langfuse.trace({
    name: "video-generation",
    input: spec,
    metadata: {
      topic: spec.topic,
      duration: spec.duration,
    },
  });
  
  const costs = new CostTracker();
  
  // Script generation span
  const scriptSpan = trace.span({ name: "script-generation" });
  const scriptResult = await generateScript(spec.topic);
  scriptSpan.end({ output: scriptResult });
  
  // LLM generation with automatic cost tracking
  trace.generation({
    name: "llm-call",
    model: scriptResult.model,
    input: scriptResult.prompt,
    output: scriptResult.script,
    usage: {
      promptTokens: scriptResult.promptTokens,
      completionTokens: scriptResult.completionTokens,
    },
  });
  
  // ... rest of pipeline
  
  trace.update({
    output: { videoPath },
    metadata: { costs: costs.toJSON() },
  });
  
  await langfuse.flush();
  
  return { videoPath, costs: costs.toJSON() };
}
```

---

## 6. Budget Management

### 6.1 Budget Configuration

```typescript
// content-machine.config.ts
export const config = {
  costs: {
    // Maximum cost per video
    budgetPerVideo: 0.50,
    
    // Maximum daily spend
    dailyBudget: 10.00,
    
    // Alert thresholds
    alerts: {
      videoThreshold: 0.30,  // Alert if single video > $0.30
      dailyThreshold: 8.00,  // Alert at 80% of daily budget
    },
  },
};
```

### 6.2 Daily Budget Tracking

```typescript
// src/common/budget-manager.ts
import { readFile, writeFile } from "fs/promises";

interface DailySpend {
  date: string;
  total: number;
  entries: Array<{ videoId: string; cost: number; timestamp: string }>;
}

export class BudgetManager {
  private spendFile = "./data/daily-spend.json";
  
  async getTodaySpend(): Promise<number> {
    const today = new Date().toISOString().split("T")[0];
    const data = await this.loadSpendData();
    return data.date === today ? data.total : 0;
  }
  
  async recordCost(videoId: string, cost: number): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const data = await this.loadSpendData();
    
    if (data.date !== today) {
      data.date = today;
      data.total = 0;
      data.entries = [];
    }
    
    data.total += cost;
    data.entries.push({
      videoId,
      cost,
      timestamp: new Date().toISOString(),
    });
    
    await this.saveSpendData(data);
    
    // Check alerts
    if (data.total > config.costs.alerts.dailyThreshold) {
      this.alertDailyBudget(data.total);
    }
  }
  
  private alertDailyBudget(total: number): void {
    console.warn(`⚠️  Daily budget alert: $${total.toFixed(2)} spent today`);
    // Could also send webhook, email, etc.
  }
}
```

---

## 7. Implementation Recommendations

| Component | Priority | Location |
|-----------|----------|----------|
| CostTracker class | P1 | src/common/cost-tracker.ts |
| LLM cost calculator | P1 | src/llm/cost.ts |
| CLI cost report | P1 | src/cli/report.ts |
| Langfuse integration | P2 | src/observability/langfuse.ts |
| Budget management | P2 | src/common/budget-manager.ts |
| Daily spend tracking | P3 | src/common/daily-spend.ts |

---

## 8. References

- [vendor/observability/langfuse](../../../vendor/observability/langfuse) — Tracing and cost tracking
- [vendor/job-queue/bullmq](../../../vendor/job-queue/bullmq) — Job metadata pattern
- [OpenAI Pricing](https://openai.com/pricing) — LLM token pricing
- [Tiktoken](https://github.com/openai/tiktoken) — Token counting
- [SECTION-CLI-ARCHITECTURE-20260104.md](../sections/SECTION-CLI-ARCHITECTURE-20260104.md) — CLI design
