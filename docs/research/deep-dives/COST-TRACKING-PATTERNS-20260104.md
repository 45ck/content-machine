# LLM Cost Tracking Patterns Research

**Date:** 2026-01-04  
**Status:** Research Complete  
**Sources:** `vendor/observability/langfuse`, `vendor/openai-agents-js`, `vendor/agents/langchain`

---

## Executive Summary

This research documents patterns for implementing LLM cost tracking across API calls. The key patterns found are:

1. **Token Usage Tracking** - Input/output tokens per request with detailed breakdowns
2. **Cost Calculation** - Per-request calculation using model pricing tiers
3. **Pipeline Aggregation** - Hierarchical cost rollup across traces/spans
4. **Budget Limits** - Usage threshold enforcement with alerts
5. **Cost Logging** - Standard schemas for cost data export

---

## 1. Token Usage Tracking

### OpenAI Agents JS - Usage Class

The `@openai/agents-core` package provides a comprehensive `Usage` class:

**File:** [vendor/openai-agents-js/packages/agents-core/src/usage.ts](../../vendor/openai-agents-js/packages/agents-core/src/usage.ts)

```typescript
/**
 * Usage details for a single API request.
 */
export class RequestUsage {
  public inputTokens: number;
  public outputTokens: number;
  public totalTokens: number;
  public inputTokensDetails: Record<string, number>;  // { cached_tokens: 2, audio: 10 }
  public outputTokensDetails: Record<string, number>; // { reasoning_tokens: 3 }
  public endpoint?: 'responses.create' | 'responses.compact' | (string & {});

  constructor(input?: RequestUsageInput) {
    this.inputTokens = input?.inputTokens ?? input?.input_tokens ?? 0;
    this.outputTokens = input?.outputTokens ?? input?.output_tokens ?? 0;
    this.totalTokens =
      input?.totalTokens ??
      input?.total_tokens ??
      this.inputTokens + this.outputTokens;
    // ... details handling
  }
}

/**
 * Tracks token usage and request counts for an agent run.
 */
export class Usage {
  public requests: number;
  public inputTokens: number;
  public outputTokens: number;
  public totalTokens: number;
  public inputTokensDetails: Array<Record<string, number>> = [];
  public outputTokensDetails: Array<Record<string, number>> = [];
  public requestUsageEntries: RequestUsage[] | undefined;

  add(newUsage: Usage) {
    this.requests += newUsage.requests ?? 0;
    this.inputTokens += newUsage.inputTokens ?? 0;
    this.outputTokens += newUsage.outputTokens ?? 0;
    this.totalTokens += newUsage.totalTokens ?? 0;
    // ... aggregate per-request entries
  }
}
```

**Key Pattern:** Maintain per-request breakdown in `requestUsageEntries` for detailed cost attribution, with aggregate totals for quick access.

### LangChain - UsageMetadata TypedDict

**File:** [vendor/agents/langchain/libs/core/langchain_core/messages/ai.py](../../vendor/agents/langchain/libs/core/langchain_core/messages/ai.py#L103)

```python
class InputTokenDetails(TypedDict, total=False):
    audio: int
    cache_creation: int  # Cache miss - created from these tokens
    cache_read: int      # Cache hit - read from cache

class OutputTokenDetails(TypedDict, total=False):
    audio: int
    reasoning: int  # Chain of thought tokens (o1 models)

class UsageMetadata(TypedDict):
    """Usage metadata for a message - consistent across models."""
    input_tokens: int      # Count of input tokens
    output_tokens: int     # Count of output tokens
    total_tokens: int      # Sum of input + output
    input_token_details: NotRequired[InputTokenDetails]
    output_token_details: NotRequired[OutputTokenDetails]
```

**Key Pattern:** TypedDict for type safety with optional detail breakdowns per token type.

---

## 2. Cost Calculation Per Request

### Langfuse - Model Pricing & Cost Calculation

**File:** [vendor/observability/langfuse/worker/src/services/IngestionService/index.ts](../../vendor/observability/langfuse/worker/src/services/IngestionService/index.ts#L1332)

```typescript
static calculateUsageCosts(
  modelPrices:
    | Array<{ usageType: string; price: Decimal }>
    | null
    | undefined,
  observationRecord: Pick<
    ObservationRecordInsertType,
    "provided_cost_details"
  >,
  usageUnits: UsageCostType,
): Pick<ObservationRecordInsertType, "cost_details" | "total_cost"> {
  const { provided_cost_details } = observationRecord;

  const providedCostKeys = Object.entries(provided_cost_details ?? {})
    .filter(([_, value]) => value != null)
    .map(([key]) => key);

  // If user has provided any cost point, do not calculate - use theirs
  if (providedCostKeys.length) {
    const cost_details = { ...provided_cost_details };
    const finalTotalCost =
      (provided_cost_details ?? {})["total"] ??
      (providedCostKeys.every((key) => ["input", "output"].includes(key))
        ? ((provided_cost_details ?? {})["input"] ?? 0) +
          ((provided_cost_details ?? {})["output"] ?? 0)
        : undefined);

    return {
      cost_details,
      total_cost: finalTotalCost,
    };
  }

  // Calculate costs from model prices
  const finalCostEntries: [string, number][] = [];

  for (const [key, units] of Object.entries(usageUnits)) {
    const price = modelPrices?.find((price) => price.usageType === key);
    if (units != null && price) {
      finalCostEntries.push([key, price.price.mul(units).toNumber()]);
    }
  }

  const finalCostDetails = Object.fromEntries(finalCostEntries);
  let finalTotalCost;

  if (finalCostDetails.total != null) {
    finalTotalCost = finalCostDetails.total;
  } else if (finalCostEntries.length > 0) {
    finalTotalCost = finalCostEntries.reduce(
      (acc, [_, cost]) => acc + cost,
      0
    );
    finalCostDetails.total = finalTotalCost;
  }

  return {
    cost_details: finalCostDetails,
    total_cost: finalTotalCost,
  };
}
```

**Key Patterns:**
1. **User-provided costs take precedence** - Never override explicit costs
2. **Fallback calculation** from model pricing when no cost provided
3. **Cost details object** with per-usage-type breakdown (input, output, total)
4. Use `Decimal` for precise currency calculations

### Langfuse - Default Model Prices Database

**File:** [vendor/observability/langfuse/worker/src/constants/default-model-prices.json](../../vendor/observability/langfuse/worker/src/constants/default-model-prices.json)

```json
[
  {
    "id": "b9854a5c92dc496b997d99d20",
    "modelName": "gpt-4o",
    "matchPattern": "(?i)^(openai\/)?(gpt-4o)$",
    "tokenizerConfig": {
      "tokensPerName": 1,
      "tokenizerModel": "gpt-4o",
      "tokensPerMessage": 3
    },
    "tokenizerId": "openai",
    "pricingTiers": [
      {
        "id": "..._tier_default",
        "name": "Standard",
        "isDefault": true,
        "priority": 0,
        "conditions": [],
        "prices": {
          "input": 0.0000025,
          "input_cached_tokens": 0.00000125,
          "input_cache_read": 0.00000125,
          "output": 0.00001
        }
      }
    ]
  }
]
```

**Key Pattern:** 
- Model matching via regex patterns (handles variations like `openai/gpt-4o`)
- Pricing tiers for different rates (standard, cached, etc.)
- Prices in USD per token

### Langfuse - Prisma Schema for Cost Storage

**File:** [vendor/observability/langfuse/packages/shared/prisma/schema.prisma](../../vendor/observability/langfuse/packages/shared/prisma/schema.prisma#L389)

```prisma
model Observation {
  // Token counts
  promptTokens         Int      @default(0) @map("prompt_tokens")
  completionTokens     Int      @default(0) @map("completion_tokens")
  totalTokens          Int      @default(0) @map("total_tokens")
  
  // User provided cost at ingestion
  inputCost            Decimal? @map("input_cost")
  outputCost           Decimal? @map("output_cost")
  totalCost            Decimal? @map("total_cost")
  
  // Calculated cost (from model pricing)
  calculatedInputCost  Decimal? @map("calculated_input_cost")
  calculatedOutputCost Decimal? @map("calculated_output_cost")
  calculatedTotalCost  Decimal? @map("calculated_total_cost")
}

model Price {
  id           String  @id @default(cuid())
  modelId      String  @map("model_id")
  usageType    String  @map("usage_type")  // "input", "output", "total"
  price        Decimal
}
```

**Key Pattern:** Separate fields for user-provided vs. calculated costs for audit trail.

---

## 3. Aggregation Across Pipeline Stages

### Langfuse - Hierarchical Cost Rollup

**File:** [vendor/observability/langfuse/web/src/features/datasets/lib/costCalculations.ts](../../vendor/observability/langfuse/web/src/features/datasets/lib/costCalculations.ts)

```typescript
export type ObservationCostData = {
  id: string;
  parentObservationId?: string | null;
  totalCost?: number | string | Decimal | null;
  inputCost?: number | string | Decimal | null;
  outputCost?: number | string | Decimal | null;
};

/**
 * Find all descendants of a root observation using BFS traversal
 */
export const findObservationDescendants = <T extends ObservationCostData>(
  rootObsId: string,
  allObservations: T[],
): T[] => {
  // Build lookup structures for efficient traversal
  const childrenByParentId = new Map<string, T[]>();
  const observationById = new Map<string, T>();

  for (const obs of allObservations) {
    observationById.set(obs.id, obs);
    if (obs.parentObservationId) {
      if (!childrenByParentId.has(obs.parentObservationId)) {
        childrenByParentId.set(obs.parentObservationId, []);
      }
      childrenByParentId.get(obs.parentObservationId)!.push(obs);
    }
  }

  // BFS traversal starting from root
  const result: T[] = [];
  const visited = new Set<string>();
  const queue = [rootObsId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;

    visited.add(currentId);
    const currentObs = observationById.get(currentId);
    if (currentObs) {
      result.push(currentObs);
    }

    const children = childrenByParentId.get(currentId) ?? [];
    for (const child of children) {
      if (!visited.has(child.id)) {
        queue.push(child.id);
      }
    }
  }

  return result;
};

/**
 * Sum costs for a list of observations
 */
export const sumObservationCosts = (
  observations: ObservationCostData[],
): Decimal | undefined => {
  return observations.reduce<Decimal | undefined>((prev, curr) => {
    const totalCost = curr.totalCost ? new Decimal(curr.totalCost) : undefined;
    const inputCost = curr.inputCost ? new Decimal(curr.inputCost) : undefined;
    const outputCost = curr.outputCost ? new Decimal(curr.outputCost) : undefined;

    // No cost data - skip
    if (!totalCost && !inputCost && !outputCost) return prev;

    // Prefer total cost
    if (totalCost && !totalCost.isZero()) {
      return prev ? prev.plus(totalCost) : totalCost;
    }

    // Fallback to input + output
    if (inputCost || outputCost) {
      const input = inputCost || new Decimal(0);
      const output = outputCost || new Decimal(0);
      const combinedCost = input.plus(output);

      if (combinedCost.isZero()) return prev;
      return prev ? prev.plus(combinedCost) : combinedCost;
    }

    return prev;
  }, undefined);
};

/**
 * Calculate recursive total cost for an observation and all its children
 */
export const calculateRecursiveCost = (
  rootObsId: string,
  allObservations: ObservationCostData[],
): Decimal | undefined => {
  const descendants = findObservationDescendants(rootObsId, allObservations);
  return sumObservationCosts(descendants);
};
```

**Key Patterns:**
1. **Trace → Span hierarchy** for cost attribution to pipeline stages
2. **BFS traversal** to find all descendants 
3. **Prefer totalCost**, fallback to input+output sum
4. **Use Decimal.js** for precise currency math

### OpenAI Agents JS - Usage Aggregation in Runs

**File:** [vendor/openai-agents-js/packages/agents-core/src/usage.ts](../../vendor/openai-agents-js/packages/agents-core/src/usage.ts#L170)

```typescript
add(newUsage: Usage) {
  this.requests += newUsage.requests ?? 0;
  this.inputTokens += newUsage.inputTokens ?? 0;
  this.outputTokens += newUsage.outputTokens ?? 0;
  this.totalTokens += newUsage.totalTokens ?? 0;
  
  if (newUsage.inputTokensDetails) {
    this.inputTokensDetails.push(...newUsage.inputTokensDetails);
  }
  if (newUsage.outputTokensDetails) {
    this.outputTokensDetails.push(...newUsage.outputTokensDetails);
  }

  if (
    Array.isArray(newUsage.requestUsageEntries) &&
    newUsage.requestUsageEntries.length > 0
  ) {
    this.requestUsageEntries ??= [];
    this.requestUsageEntries.push(
      ...newUsage.requestUsageEntries.map((entry) =>
        entry instanceof RequestUsage ? entry : new RequestUsage(entry),
      ),
    );
  } else if (newUsage.requests === 1 && newUsage.totalTokens > 0) {
    // Create entry from aggregates if no detailed entries
    this.requestUsageEntries ??= [];
    this.requestUsageEntries.push(
      new RequestUsage({
        inputTokens: newUsage.inputTokens,
        outputTokens: newUsage.outputTokens,
        totalTokens: newUsage.totalTokens,
        inputTokensDetails: newUsage.inputTokensDetails?.[0],
        outputTokensDetails: newUsage.outputTokensDetails?.[0],
      }),
    );
  }
}
```

**Key Pattern:** Maintain both aggregate totals AND per-request entries for granular cost analysis.

---

## 4. Budget Limits and Alerts

### Langfuse - Free Tier Usage Threshold Queue

**File:** [vendor/observability/langfuse/worker/src/queues/cloudFreeTierUsageThresholdQueue.ts](../../vendor/observability/langfuse/worker/src/queues/cloudFreeTierUsageThresholdQueue.ts)

```typescript
import { Processor } from "bullmq";
import { logger, QueueJobs } from "@langfuse/shared/src/server";
import { handleCloudFreeTierUsageThresholdJob } from "../ee/usageThresholds/handleCloudFreeTierUsageThresholdJob";

export const cloudFreeTierUsageThresholdQueueProcessor: Processor = async (
  job,
) => {
  if (job.name === QueueJobs.CloudFreeTierUsageThresholdJob) {
    logger.info(
      "[CloudFreeTierUsageThresholdJob] Executing Free Tier Usage Threshold Job",
      {
        jobId: job.id,
        jobName: job.name,
        jobData: job.data,
        timestamp: new Date().toISOString(),
        opts: {
          repeat: job.opts.repeat,
          jobId: job.opts.jobId,
        },
      },
    );
    try {
      return await handleCloudFreeTierUsageThresholdJob(job);
    } catch (error) {
      logger.error(
        "[CloudFreeTierUsageThresholdJob] Error executing Free Tier Usage Threshold Job",
        error
      );
      throw error;
    }
  }
};
```

**Environment Configuration:**

```bash
# vendor/observability/langfuse/.env.prod.example
QUEUE_CONSUMER_FREE_TIER_USAGE_THRESHOLD_QUEUE_IS_ENABLED=true
LANGFUSE_FREE_TIER_USAGE_THRESHOLD_ENFORCEMENT_ENABLED=false
CLOUD_CRM_EMAIL=""  # BCC address for usage threshold emails
```

**Key Pattern:** Background job queue (BullMQ) for periodic threshold checks with email alerts.

---

## 5. Cost Logging/Export Patterns

### Langfuse - Metrics API Response Format

From the API documentation, the standard metrics format includes:

```json
{
  "metrics": [
    {
      "measure": "totalCost",
      "aggregation": "sum"
    },
    {
      "measure": "inputTokens", 
      "aggregation": "sum"
    },
    {
      "measure": "outputTokens",
      "aggregation": "sum"
    }
  ],
  "dimensions": [
    { "field": "name" },
    { "field": "providedModelName" }
  ]
}
```

**Available measures for observations:**
- `count` - Total number of observations
- `inputTokens` - Sum of input tokens consumed
- `outputTokens` - Sum of output tokens produced
- `totalTokens` - Sum of all tokens consumed
- `inputCost` - Input cost (USD)
- `outputCost` - Output cost (USD)
- `totalCost` - Total cost (USD)

### OpenAI Agents JS - Model Response with Usage

**File:** [vendor/openai-agents-js/packages/agents-core/src/model.ts](../../vendor/openai-agents-js/packages/agents-core/src/model.ts#L314)

```typescript
export type ModelResponse = {
  /**
   * The usage information for response.
   */
  usage: Usage;

  /**
   * A list of outputs (messages, tool calls, etc.) generated by the model.
   */
  output: AgentOutputItem[];

  /**
   * An ID for the response which can be used to refer to the response 
   * in subsequent calls to the model.
   */
  responseId?: string;

  /**
   * Raw response data from the underlying model provider.
   */
  providerData?: Record<string, any>;
};
```

---

## Standard Format Recommendation

Based on the research, here's the recommended standard format for cost tracking:

### Usage Record Schema

```typescript
interface UsageRecord {
  // Identification
  id: string;
  traceId: string;
  spanId?: string;
  parentSpanId?: string;
  
  // Timestamps
  timestamp: Date;
  
  // Model Info
  model: string;
  modelId?: string;  // Internal ID after matching
  provider: string;
  
  // Token Counts
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputTokenDetails?: {
      cached?: number;
      audio?: number;
    };
    outputTokenDetails?: {
      reasoning?: number;
      audio?: number;
    };
  };
  
  // Costs (USD)
  cost: {
    input?: number;
    output?: number;
    total: number;
    isUserProvided: boolean;
  };
  
  // Attribution
  operation?: string;  // e.g., "script_generation", "capture"
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}
```

### Aggregated Cost Report Schema

```typescript
interface CostReport {
  period: {
    start: Date;
    end: Date;
  };
  
  totals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCost: number;
  };
  
  byModel: Array<{
    model: string;
    requests: number;
    totalCost: number;
    avgCostPerRequest: number;
  }>;
  
  byOperation: Array<{
    operation: string;
    requests: number;
    totalCost: number;
  }>;
}
```

---

## Implementation Recommendations

1. **Use Decimal.js** for all cost calculations to avoid floating-point precision issues

2. **Track at the request level** with per-request entries, then aggregate up

3. **Support user-provided costs** that take precedence over calculated costs

4. **Store model pricing in a database** with regex patterns for model name matching

5. **Implement hierarchical cost rollup** for trace → span → generation relationships

6. **Use background jobs** for threshold monitoring and alerts

7. **Log usage to observability platform** (Langfuse, OpenTelemetry) for dashboards

8. **Include operation/stage attribution** for understanding where costs occur in pipeline

---

## References

- [Langfuse Cost Tracking Docs](https://langfuse.com/docs/model-usage-and-cost)
- [OpenAI Usage API](https://platform.openai.com/docs/api-reference/completions/object#usage)
- [LangChain Callbacks](https://python.langchain.com/docs/modules/callbacks/)
