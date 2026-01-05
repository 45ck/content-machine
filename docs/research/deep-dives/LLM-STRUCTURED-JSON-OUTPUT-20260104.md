# Reliable Structured JSON Output from LLMs

**Date:** 2026-01-04  
**Status:** Research Complete  
**Purpose:** Patterns for getting reliable structured JSON from LLMs across providers

---

## Summary

This research examines patterns for reliably getting structured JSON output from LLMs by analyzing vendored repositories. Key findings:

1. **OpenAI JSON Mode** - Native `response_format: { type: "json_schema" }` with strict mode
2. **Anthropic tool_use** - Using tool definitions to force structured output
3. **Zod Schema Integration** - TypeScript schema → JSON Schema conversion for validation
4. **Retry Logic** - Multiple strategies for handling parse failures
5. **Schema Validation** - Pydantic/Zod validation after LLM response
6. **Fallback Extraction** - Regex-based JSON extraction when native parsing fails

---

## 1. OpenAI JSON Mode (response_format)

### openai-agents-js: Native JSON Schema Support

**File:** [vendor/openai-agents-js/packages/agents-openai/src/openaiChatCompletionsModel.ts](../../../vendor/openai-agents-js/packages/agents-openai/src/openaiChatCompletionsModel.ts#L376-L393)

```typescript
function getResponseFormat(
  outputType: SerializedOutputType
): ResponseFormatText | ResponseFormatJSONSchema | ResponseFormatJSONObject {
  if (outputType === 'text') {
    return { type: 'text' };
  }

  if (outputType.type === 'json_schema') {
    return {
      type: 'json_schema',
      json_schema: {
        name: outputType.name,
        strict: outputType.strict, // ← Key: strict mode for reliable output
        schema: outputType.schema,
      },
    };
  }

  return { type: 'json_object' };
}
```

**Key Pattern:** Use `type: 'json_schema'` with `strict: true` for reliable structured output. The strict mode ensures the model output conforms exactly to the schema.

### pydantic-ai: OpenAI JSON Schema Mapping

**File:** [vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/models/openai.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/models/openai.py#L928-L938)

```python
def _map_json_schema(self, o: OutputObjectDefinition) -> chat.completion_create_params.ResponseFormat:
    response_format_param: chat.completion_create_params.ResponseFormatJSONSchema = {
        'type': 'json_schema',
        'json_schema': {'name': o.name or DEFAULT_OUTPUT_TOOL_NAME, 'schema': o.json_schema},
    }
    if o.description:
        response_format_param['json_schema']['description'] = o.description
    if OpenAIModelProfile.from_profile(self.profile).openai_supports_strict_tool_definition:
        response_format_param['json_schema']['strict'] = o.strict
    return response_format_param
```

---

## 2. Anthropic tool_use for Structured Output

### pydantic-ai: Anthropic Native Output Format

**File:** [vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/models/anthropic.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/models/anthropic.py#L347-L350)

```python
# Anthropic structured output mode selection
output_mode = 'native' if self.profile.supports_json_schema_output else 'prompted'
```

**File:** [vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/models/anthropic.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/models/anthropic.py#L765-L772)

```python
# Tool use block for structured output
tool_use_block_param = BetaToolUseBlockParam(
    id=_guard_tool_call_id(t=response_part),
    type='tool_use',
    name=response_part.tool_name,
    input=response_part.args_as_dict(),
)
```

**Key Pattern:** Anthropic uses `tool_use` blocks to force structured output. The model returns structured data by "calling" a tool with the required schema.

---

## 3. Zod Schema Integration

### short-video-maker-gyori: Zod for Input Validation

**File:** [vendor/short-video-maker-gyori/src/types/shorts.ts](../../../vendor/short-video-maker-gyori/src/types/shorts.ts#L1-L40)

```typescript
import z from 'zod';

export const sceneInput = z.object({
  text: z.string().describe('Text to be spoken in the video'),
  searchTerms: z
    .array(z.string())
    .describe(
      'Search term for video, 1 word, and at least 2-3 search terms should be provided for each scene.'
    ),
});
export type SceneInput = z.infer<typeof sceneInput>;

export const createShortInput = z.object({
  scenes: z.array(sceneInput).describe('Each scene to be created'),
  config: renderConfig.describe('Configuration for rendering the video'),
});
export type CreateShortInput = z.infer<typeof createShortInput>;
```

**File:** [vendor/short-video-maker-gyori/src/server/validator.ts](../../../vendor/short-video-maker-gyori/src/server/validator.ts#L1-L27)

```typescript
import { createShortInput, CreateShortInput } from '../types/shorts';
import { ZodError } from 'zod';

export function validateCreateShortInput(input: object): CreateShortInput {
  const validated = createShortInput.safeParse(input);

  if (validated.success) {
    return validated.data;
  }

  // Process the validation errors
  const errorResult = formatZodError(validated.error);
  throw new Error(
    JSON.stringify({
      message: errorResult.message,
      missingFields: errorResult.missingFields,
    })
  );
}

function formatZodError(error: ZodError): ValidationErrorResult {
  const missingFields: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    missingFields[path] = err.message;
  });
  return { message, missingFields };
}
```

### openai-agents-js: Zod to JSON Schema Conversion

**File:** [vendor/openai-agents-js/packages/agents-core/test/agent.test.ts](../../../vendor/openai-agents-js/packages/agents-core/test/agent.test.ts#L141-L165)

```typescript
// Output type using Zod schema
const schema: SerializedOutputType = {
  type: 'json_schema',
  name: 'output',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      foo: { type: 'string' },
    },
    required: ['foo'],
    additionalProperties: false, // ← Required for strict mode
  },
};
```

**Key Pattern:** Use `zod-to-json-schema` package to convert Zod schemas to JSON Schema format for LLM calls.

---

## 4. Retry Logic for Parsing Failures

### MoneyPrinterTurbo: Retry with Regex Fallback

**File:** [vendor/MoneyPrinterTurbo/app/services/llm.py](../../../vendor/MoneyPrinterTurbo/app/services/llm.py#L430-L470)

```python
_max_retries = 5

def generate_terms(video_subject: str, video_script: str, amount: int = 5) -> List[str]:
    prompt = f"""
# Role: Video Search Terms Generator

## Constrains:
1. the search terms are to be returned as a json-array of strings.
2. you must only return the json-array of strings.

## Output Example:
["search term 1", "search term 2", "search term 3"]
"""

    search_terms = []
    response = ""
    for i in range(_max_retries):
        try:
            response = _generate_response(prompt)
            search_terms = json.loads(response)

            # Validate type after parsing
            if not isinstance(search_terms, list) or not all(
                isinstance(term, str) for term in search_terms
            ):
                logger.error("response is not a list of strings.")
                continue

        except Exception as e:
            logger.warning(f"failed to generate video terms: {str(e)}")
            # Fallback: Extract JSON array using regex
            if response:
                match = re.search(r"\[.*]", response)
                if match:
                    try:
                        search_terms = json.loads(match.group())
                    except Exception as e:
                        pass

        if search_terms and len(search_terms) > 0:
            break

    return search_terms
```

**Key Patterns:**

1. **Max retries** - Loop up to N times on failure
2. **Type validation** - Check parsed result matches expected type
3. **Regex fallback** - Extract JSON from messy response using `r"\[.*]"` pattern

### ShortGPT: JSON Extraction from String

**File:** [vendor/ShortGPT/shortGPT/gpt/gpt_utils.py](../../../vendor/ShortGPT/shortGPT/gpt/gpt_utils.py#L31-L36)

```python
def extract_biggest_json(string):
    """Extract the largest JSON object from a string using regex."""
    json_regex = r"\{(?:[^{}]|(?R))*\}"
    json_objects = re.findall(json_regex, string)
    if json_objects:
        return max(json_objects, key=len)
    return None
```

**File:** [vendor/ShortGPT/shortGPT/gpt/gpt_editing.py](../../../vendor/ShortGPT/shortGPT/gpt/gpt_editing.py#L1-L50)

```python
def extractJsonFromString(text):
    """Extract JSON from LLM response by finding { } boundaries."""
    start = text.find('{')
    end = text.rfind('}') + 1
    if start == -1 or end == 0:
        raise Exception("Error: No JSON object found in response")
    json_str = text[start:end]
    return json.loads(json_str)


def getVideoSearchQueriesTimed(captions_timed):
    """Retry loop with JSON extraction."""
    err = ""

    for _ in range(4):  # 4 retries
        try:
            res = gpt_utils.llm_completion(chat_prompt=prompt, system=system)
            data = extractJsonFromString(res)

            # Validate structure
            formatted_queries = []
            for segment in data["video_segments"]:
                # ... process ...

            if not formatted_queries:
                raise ValueError("Generated segments don't cover full video duration")

            return formatted_queries
        except Exception as e:
            err = str(e)
            print(f"Error generating video search queries {err}")

    raise Exception(f"Failed to generate video search queries {err}")
```

---

## 5. Schema Validation After LLM Response

### pydantic-ai: Output Validation with ModelRetry

**File:** [vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/exceptions.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/exceptions.py#L34-L65)

```python
class ModelRetry(Exception):
    """Exception to raise when a tool function should be retried.

    The agent will return the message to the model and ask it to try calling
    the function/tool again.
    """
    message: str

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)
```

**File:** [vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/\_output.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/_output.py#L514-L545)

```python
async def process(
    self,
    data: str | dict[str, Any] | None,
    *,
    run_context: RunContext[AgentDepsT],
    allow_partial: bool = False,
    wrap_validation_errors: bool = True,
) -> OutputDataT:
    """Process an output message, performing validation."""
    if isinstance(data, str):
        data = _utils.strip_markdown_fences(data)

    try:
        output = self.validate(data, allow_partial=allow_partial,
                               validation_context=run_context.validation_context)
    except ValidationError as e:
        if wrap_validation_errors:
            m = _messages.RetryPromptPart(
                content=e.errors(include_url=False),
            )
            raise ToolRetryError(m) from e
        else:
            raise

    return output

def validate(self, data: str | dict[str, Any] | None, ...) -> dict[str, Any]:
    pyd_allow_partial = 'trailing-strings' if allow_partial else 'off'
    if isinstance(data, str):
        return self.validator.validate_json(data or '{}', allow_partial=pyd_allow_partial)
    else:
        return self.validator.validate_python(data or {}, allow_partial=pyd_allow_partial)
```

**Key Pattern:** Wrap `ValidationError` in `ToolRetryError` which sends the error back to the model for a retry attempt.

### pydantic-ai: Output Validators

**File:** [vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/\_output.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/_output.py#L170-L210)

```python
@dataclass
class OutputValidator(Generic[AgentDepsT, OutputDataT_inv]):
    function: OutputValidatorFunc[AgentDepsT, OutputDataT_inv]

    async def validate(
        self,
        result: T,
        run_context: RunContext[AgentDepsT],
        wrap_validation_errors: bool = True,
    ) -> T:
        """Validate a result by calling the function."""
        if self._takes_ctx:
            args = run_context, result
        else:
            args = (result,)

        try:
            if self._is_async:
                result_data = await function(*args)
            else:
                result_data = await _utils.run_in_executor(function, *args)
        except ModelRetry as r:
            if wrap_validation_errors:
                m = _messages.RetryPromptPart(content=r.message, tool_name=run_context.tool_name)
                raise ToolRetryError(m) from r
            else:
                raise r

        return result_data
```

---

## 6. Vercel AI SDK Integration

### openai-agents-js: AI SDK Response Format Mapping

**File:** [vendor/openai-agents-js/packages/agents-extensions/src/aiSdk.ts](../../../vendor/openai-agents-js/packages/agents-extensions/src/aiSdk.ts#L551-L566)

```typescript
export function getResponseFormat(
  outputType: SerializedOutputType
): LanguageModelV2CallOptions['responseFormat'] {
  if (outputType === 'text') {
    return { type: 'text' };
  }

  return {
    type: 'json',
    name: outputType.name,
    schema: outputType.schema,
  };
}
```

**Key Pattern:** The Vercel AI SDK uses `type: 'json'` with a schema for structured output across providers.

---

## 7. Prompt Patterns That Improve JSON Reliability

### MoneyPrinterTurbo: Explicit Output Format in Prompt

**File:** [vendor/MoneyPrinterTurbo/app/services/llm.py](../../../vendor/MoneyPrinterTurbo/app/services/llm.py#L391-L415)

```python
prompt = f"""
# Role: Video Search Terms Generator

## Constrains:
1. the search terms are to be returned as a json-array of strings.
2. each search term should consist of 1-3 words
3. you must only return the json-array of strings. you must not return anything else.
4. the search terms must be related to the subject of the video.
5. reply with english search terms only.

## Output Example:
["search term 1", "search term 2", "search term 3","search term 4","search term 5"]

## Context:
### Video Subject
{video_subject}
"""
```

**Best Practices from Prompts:**

1. **Explicit constraints** - "you must only return the json-array"
2. **Output example** - Show exact format expected
3. **Type specification** - "json-array of strings"
4. **Negative constraints** - "you must not return anything else"

### LangChain: with_structured_output Pattern

**File:** [vendor/agents/langchain/libs/langchain/langchain_classic/chains/structured_output/base.py](../../../vendor/agents/langchain/libs/langchain/langchain_classic/chains/structured_output/base.py#L34-L65)

```python
# Recommended pattern using with_structured_output
"""
from pydantic import BaseModel, Field
from langchain_anthropic import ChatAnthropic

class Joke(BaseModel):
    setup: str = Field(description="The setup of the joke")
    punchline: str = Field(description="The punchline to the joke")

# Use model's native structured output capability
model = ChatAnthropic(model="claude-opus-4-1-20250805", temperature=0)
structured_model = model.with_structured_output(Joke)
result = structured_model.invoke("Tell me a joke about cats.")
"""
```

---

## 8. Multi-Provider Strategy

### pydantic-ai: Provider-Specific Output Mode Detection

**File:** [vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/models/anthropic.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/models/anthropic.py#L345-L370)

```python
def prepare_request(self, model_settings, model_request_parameters):
    # Auto-select output mode based on provider capability
    if model_request_parameters.output_mode == 'auto':
        output_mode = 'native' if self.profile.supports_json_schema_output else 'prompted'
        model_request_parameters = replace(model_request_parameters, output_mode=output_mode)

    # Anthropic requires strict=True for native output
    if model_request_parameters.output_mode == 'native':
        if model_request_parameters.output_object.strict is False:
            raise UserError(
                'Setting `strict=False` on `output_type=NativeOutput(...)` is not allowed for Anthropic models.'
            )
        model_request_parameters = replace(
            model_request_parameters,
            output_object=replace(model_request_parameters.output_object, strict=True)
        )

    return super().prepare_request(model_settings, model_request_parameters)
```

**Key Pattern:** Use `ModelProfile` to check provider capabilities and select appropriate output mode:

- `supports_json_schema_output` → Native structured output
- Otherwise → Prompted output (schema in prompt) or Tool output

---

## Recommendations for content-machine

### 1. Use Native JSON Schema When Available

```typescript
// For OpenAI (GPT-4+)
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [...],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "video_script",
      strict: true,
      schema: zodToJsonSchema(VideoScriptSchema),
    },
  },
});
```

### 2. Implement Retry with Fallback Extraction

```typescript
async function getStructuredOutput<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await llm.complete(prompt);

      // Try native parsing first
      const parsed = schema.safeParse(JSON.parse(response));
      if (parsed.success) return parsed.data;

      // Fallback: Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = schema.safeParse(JSON.parse(jsonMatch[0]));
        if (extracted.success) return extracted.data;
      }

      lastError = new Error(`Validation failed: ${parsed.error}`);
    } catch (e) {
      lastError = e as Error;
    }
  }

  throw lastError;
}
```

### 3. Use Zod for Schema Definition

```typescript
// Define schemas with descriptions for better LLM understanding
const SceneSchema = z.object({
  text: z.string().describe('Voiceover text for this scene'),
  duration: z.number().describe('Duration in seconds (5-30)'),
  searchTerms: z.array(z.string()).describe('1-3 word search terms for B-roll'),
});

const VideoScriptSchema = z.object({
  title: z.string().describe('Catchy title under 60 chars'),
  scenes: z.array(SceneSchema).min(1).max(10),
  hook: z.string().describe('Opening hook to grab attention'),
});
```

### 4. Include Schema in Prompt as Fallback

```typescript
const promptWithSchema = `
You are a video script generator. Return your response as valid JSON matching this schema:

${JSON.stringify(zodToJsonSchema(VideoScriptSchema), null, 2)}

Topic: ${topic}

IMPORTANT: Return ONLY the JSON object, no markdown fences or explanation.
`;
```

---

## Summary Table

| Provider  | Method                                     | Strict Mode       | Retry Strategy                  |
| --------- | ------------------------------------------ | ----------------- | ------------------------------- |
| OpenAI    | `response_format: { type: "json_schema" }` | ✅ `strict: true` | Validation → Retry              |
| Anthropic | `tool_use` blocks                          | ✅ Always strict  | `is_error: true` in tool result |
| Other     | Prompted + Validation                      | N/A               | Regex extraction → Retry        |

---

## References

- [vendor/MoneyPrinterTurbo/app/services/llm.py](../../../vendor/MoneyPrinterTurbo/app/services/llm.py) - Multi-provider LLM with retry
- [vendor/ShortGPT/shortGPT/gpt/gpt_editing.py](../../../vendor/ShortGPT/shortGPT/gpt/gpt_editing.py) - JSON extraction patterns
- [vendor/openai-agents-js/packages/agents-openai/src/openaiChatCompletionsModel.ts](../../../vendor/openai-agents-js/packages/agents-openai/src/openaiChatCompletionsModel.ts) - OpenAI JSON schema
- [vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/\_output.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/_output.py) - Pydantic validation
- [vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/models/anthropic.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/models/anthropic.py) - Anthropic tool_use
- [vendor/short-video-maker-gyori/src/types/shorts.ts](../../../vendor/short-video-maker-gyori/src/types/shorts.ts) - Zod schema patterns
