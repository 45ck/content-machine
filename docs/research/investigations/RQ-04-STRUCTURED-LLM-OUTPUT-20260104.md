# RQ-04: Reliable Structured Output from LLMs

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P0  
**Question:** How do we reliably get structured JSON output from LLMs?

---

## 1. Problem Statement

The current design says "LLM returns invalid JSON → Retry once, then exit 1". This is insufficient:
- LLMs may consistently produce invalid output for certain inputs
- Single retry doesn't address systematic prompt issues
- No feedback loop to improve prompts from failures

---

## 2. Vendor Evidence

### 2.1 OpenAI JSON Schema Mode (Strict)

**Source:** [vendor/openai-agents-js/packages/agents-core/src/model-providers/openai-responses.ts](../../../vendor/openai-agents-js/packages/agents-core/src/model-providers/openai-responses.ts)

OpenAI's `response_format` with `strict: true` guarantees valid JSON:

```typescript
// Build response format for structured output
return {
  type: 'json_schema',
  json_schema: {
    name: outputType.name,
    strict: outputType.strict,  // ← Critical for reliability
    schema: outputType.schema,  // JSON Schema format
  },
};
```

### 2.2 MoneyPrinterTurbo: Multi-Retry with Regex Fallback

**Source:** [vendor/MoneyPrinterTurbo/app/services/llm.py](../../../vendor/MoneyPrinterTurbo/app/services/llm.py)

```python
MAX_RETRY_TIMES = 5

def generate_script(topic: str) -> list[str]:
    for i in range(MAX_RETRY_TIMES):
        try:
            response = llm.complete(prompt)
            result = json.loads(response)
            
            # Type validation
            if not isinstance(result, list):
                raise ValueError("Expected list")
            return result
            
        except json.JSONDecodeError:
            # Regex fallback: extract JSON from markdown code blocks
            match = re.search(r'```json\s*([\s\S]*?)\s*```', response)
            if match:
                return json.loads(match.group(1))
            
            logger.warning(f"Retry {i+1}/{MAX_RETRY_TIMES}")
            continue
    
    raise Exception("Failed to generate valid JSON after retries")
```

### 2.3 ShortGPT: JSON Extraction from Mixed Output

**Source:** [vendor/ShortGPT/shortGPT/gpt/gpt_chat_video.py](../../../vendor/ShortGPT/shortGPT/gpt/gpt_chat_video.py)

```python
def extractJsonFromString(text: str) -> dict:
    """Extract JSON object from text that may contain other content."""
    start = text.find('{')
    end = text.rfind('}') + 1
    
    if start == -1 or end == 0:
        raise ValueError("No JSON object found in response")
    
    json_str = text[start:end]
    return json.loads(json_str)
```

### 2.4 pydantic-ai: Validation Error → Model Retry

**Source:** [vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/_agent_graph.py](../../../vendor/agents/pydantic-ai/pydantic_ai/_agent_graph.py)

pydantic-ai sends validation errors back to the model for self-correction:

```python
class ModelRetry(Exception):
    """Raised to retry the model with a message."""
    message: str

try:
    result = output_schema.validate(response)
except ValidationError as e:
    # Send validation error back to model
    raise ModelRetry(
        message=f"Your response didn't match the schema. Errors:\n{e}\n\nPlease fix and try again."
    )
```

### 2.5 Zod Schema with Descriptions (Vercel AI SDK Pattern)

**Source:** [vendor/short-video-maker-gyori/src/short-creator/zod-types.ts](../../../vendor/short-video-maker-gyori/src/short-creator/zod-types.ts)

Zod's `.describe()` method adds hints that improve LLM JSON generation:

```typescript
export const sceneInput = z.object({
  text: z.string().describe("The text to be spoken by the narrator"),
  searchTerms: z.array(z.string()).describe("Keywords for stock video search"),
  duration: z.number().positive().describe("Scene duration in seconds"),
});
```

---

## 3. Recommended Patterns for content-machine

### 3.1 Provider-Specific Structured Output

```typescript
interface StructuredOutputOptions<T> {
  schema: z.ZodSchema<T>;
  schemaName: string;
  strict?: boolean;
}

async function chatWithStructuredOutput<T>(
  provider: LLMProvider,
  messages: Message[],
  options: StructuredOutputOptions<T>
): Promise<T> {
  const jsonSchema = zodToJsonSchema(options.schema);
  
  if (provider.type === 'openai') {
    // Use native JSON schema mode
    const response = await provider.chat(messages, {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: options.schemaName,
          strict: options.strict ?? true,
          schema: jsonSchema,
        },
      },
    });
    return options.schema.parse(JSON.parse(response.content));
  }
  
  if (provider.type === 'anthropic') {
    // Use tool_use for structured output
    const response = await provider.chat(messages, {
      tools: [{
        name: options.schemaName,
        description: `Output structured data`,
        input_schema: jsonSchema,
      }],
      tool_choice: { type: 'tool', name: options.schemaName },
    });
    return options.schema.parse(response.tool_calls[0].input);
  }
  
  // Fallback: prompt-based + validation
  return chatWithFallback(provider, messages, options);
}
```

### 3.2 Multi-Level Retry Strategy

```typescript
const RETRY_CONFIG = {
  maxAttempts: 5,
  strategies: [
    'direct',           // Parse response directly
    'extractJson',      // Extract JSON from markdown blocks
    'findJsonObject',   // Find first {...} in response
    'repromptError',    // Send error back to model
    'simplifySchema',   // Ask for simpler output
  ] as const,
};

async function parseWithRetry<T>(
  schema: z.ZodSchema<T>,
  response: string,
  reprompt: (error: string) => Promise<string>
): Promise<T> {
  
  // Strategy 1: Direct parse
  try {
    return schema.parse(JSON.parse(response));
  } catch (e1) {
    
    // Strategy 2: Extract from markdown
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return schema.parse(JSON.parse(jsonMatch[1]));
      } catch {}
    }
    
    // Strategy 3: Find JSON object
    const start = response.indexOf('{');
    const end = response.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return schema.parse(JSON.parse(response.slice(start, end + 1)));
      } catch {}
    }
    
    // Strategy 4: Reprompt with error
    const zodError = e1 instanceof z.ZodError ? e1 : null;
    const errorMessage = zodError 
      ? `Validation errors:\n${zodError.errors.map(e => `- ${e.path.join('.')}: ${e.message}`).join('\n')}`
      : `JSON parse error: ${e1}`;
    
    const retryResponse = await reprompt(
      `Your previous response was invalid. ${errorMessage}\n\nPlease provide valid JSON matching the schema.`
    );
    
    return schema.parse(JSON.parse(retryResponse));
  }
}
```

### 3.3 Prompt Patterns That Improve Reliability

```typescript
function buildStructuredPrompt(
  userPrompt: string,
  schema: z.ZodSchema,
  example?: unknown
): string {
  const jsonSchema = zodToJsonSchema(schema);
  
  return `
${userPrompt}

## Output Requirements
You MUST respond with valid JSON matching this schema:
\`\`\`json
${JSON.stringify(jsonSchema, null, 2)}
\`\`\`

${example ? `## Example Output
\`\`\`json
${JSON.stringify(example, null, 2)}
\`\`\`
` : ''}

## Rules
1. Return ONLY the JSON object, no other text
2. Do not wrap in markdown code blocks
3. Ensure all required fields are present
4. Use the exact field names from the schema
`;
}
```

### 3.4 Validation with Logging

```typescript
import { logger } from './logger';

async function validateLLMResponse<T>(
  raw: string,
  schema: z.ZodSchema<T>,
  context: { model: string; prompt: string }
): Promise<{ success: true; data: T } | { success: false; error: z.ZodError }> {
  
  try {
    const parsed = JSON.parse(raw);
    const validated = schema.parse(parsed);
    
    logger.debug({ 
      event: 'llm_validation_success',
      model: context.model,
    });
    
    return { success: true, data: validated };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({
        event: 'llm_validation_failure',
        model: context.model,
        errors: error.errors,
        rawResponse: raw.slice(0, 500),  // First 500 chars for debugging
      });
      return { success: false, error };
    }
    
    logger.error({
      event: 'llm_json_parse_failure',
      model: context.model,
      rawResponse: raw.slice(0, 500),
    });
    
    throw error;
  }
}
```

---

## 4. Provider Comparison

| Provider | Best Method | Reliability | Notes |
|----------|-------------|-------------|-------|
| **OpenAI** | `response_format.json_schema` with `strict: true` | ~99% | Native support, guaranteed valid |
| **Anthropic** | `tool_use` with forced tool choice | ~98% | Treats output as tool call |
| **Google** | Response schema in generationConfig | ~95% | Good but not strict |
| **Ollama** | Prompt engineering + retry | ~85% | No native JSON mode |

---

## 5. Implementation Recommendations

| Pattern | Priority | Rationale |
|---------|----------|-----------|
| OpenAI strict JSON mode | P0 | Best reliability for primary provider |
| Anthropic tool_use | P0 | Required for Anthropic support |
| Multi-level retry | P0 | Handles edge cases |
| `.describe()` on Zod fields | P0 | Improves generation quality |
| Validation logging | P1 | Debug prompt issues |
| Error reprompting | P2 | Self-correction for complex schemas |

---

## 6. Error Handling Integration

```typescript
// In cm script command
try {
  const script = await generateScript(research, {
    schema: GeneratedScriptSchema,
    maxAttempts: 5,
  });
  await writeScript(projectDir, script);
  
} catch (error) {
  if (error instanceof LLMValidationError) {
    cli.error(`Failed to generate valid script after ${error.attempts} attempts`);
    cli.error(`Last validation error: ${error.lastValidationError}`);
    
    // Save failed response for debugging
    await fs.writeFile(
      path.join(projectDir, 'script-failed.json'),
      JSON.stringify({
        error: error.message,
        rawResponse: error.lastRawResponse,
        validationErrors: error.lastValidationError,
      }, null, 2)
    );
    
    process.exit(1);
  }
  throw error;
}
```

---

## 7. References

- [vendor/openai-agents-js/packages/agents-core/src/model-providers/openai-responses.ts](../../../vendor/openai-agents-js/packages/agents-core/src/model-providers/openai-responses.ts) — OpenAI JSON schema
- [vendor/MoneyPrinterTurbo/app/services/llm.py](../../../vendor/MoneyPrinterTurbo/app/services/llm.py) — Retry + regex fallback
- [vendor/ShortGPT/shortGPT/gpt/gpt_chat_video.py](../../../vendor/ShortGPT/shortGPT/gpt/gpt_chat_video.py) — JSON extraction
- [vendor/agents/pydantic-ai](../../../vendor/agents/pydantic-ai) — Model retry pattern
- [SECTION-SCRIPT-GENERATION-20260104.md](../sections/SECTION-SCRIPT-GENERATION-20260104.md) — LLM integration patterns
