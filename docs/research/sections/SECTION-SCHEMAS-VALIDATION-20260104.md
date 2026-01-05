# Section Research: Data Schemas & Validation

**Research Date:** 2026-01-04  
**Section:** System Design Section 5 - Data Schemas & Validation  
**Status:** Complete

---

## 1. Research Questions

This document investigates schema and validation patterns across vendored repositories to inform content-machine's data schema architecture.

**Key Questions:**

1. What schema libraries do video generation tools use (Pydantic, Zod, TypeBox)?
2. How do they handle LLM structured output parsing?
3. What fallback strategies exist when LLM returns malformed JSON?
4. How do schemas compose across pipeline stages?
5. What validation patterns work best for video configuration?

---

## 2. Vendor Evidence Summary

| Repo                    | Schema Library          | LLM Output Validation        | Rigidity Level |
| ----------------------- | ----------------------- | ---------------------------- | -------------- |
| MoneyPrinterTurbo       | Pydantic BaseModel      | Regex extraction             | Medium         |
| short-video-maker-gyori | Zod                     | safeParse + error formatting | High           |
| vidosy                  | Zod                     | Schema validation on config  | High           |
| openai-agents-js        | Zod + zodResponseFormat | API structured outputs       | Very High      |
| ShortGPT                | None (ad-hoc)           | Regex + try/except           | Low            |

---

## 3. Evidence: MoneyPrinterTurbo (Pydantic)

**Source:** [vendor/MoneyPrinterTurbo/app/models/schema.py](../../../vendor/MoneyPrinterTurbo/app/models/schema.py)

### 3.1 Enum Constraints

```python
class VideoConcatMode(str, Enum):
    random = "random"
    sequential = "sequential"

class VideoAspect(str, Enum):
    landscape = "16:9"
    portrait = "9:16"
    square = "1:1"

    def to_resolution(self):
        if self == VideoAspect.landscape.value:
            return 1920, 1080
        elif self == VideoAspect.portrait.value:
            return 1080, 1920
        elif self == VideoAspect.square.value:
            return 1080, 1080
        return 1080, 1920
```

**Pattern:** Enums with `str` inheritance create string-serializable constraints. The `to_resolution()` method shows domain logic attached to schema types.

### 3.2 Complex Nested Models

```python
@pydantic.dataclasses.dataclass(config=_Config)
class MaterialInfo:
    provider: str = "pexels"
    url: str = ""
    duration: int = 0

class VideoParams(BaseModel):
    video_subject: str
    video_script: str = ""
    video_terms: Optional[str | list] = None
    video_aspect: Optional[VideoAspect] = VideoAspect.portrait.value
    video_concat_mode: Optional[VideoConcatMode] = VideoConcatMode.random.value
    video_clip_duration: Optional[int] = 5
    video_count: Optional[int] = 1
    video_materials: Optional[List[MaterialInfo]] = None

    voice_name: Optional[str] = ""
    voice_volume: Optional[float] = 1.0
    voice_rate: Optional[float] = 1.0
    bgm_type: Optional[str] = "random"
    bgm_volume: Optional[float] = 0.2

    subtitle_enabled: Optional[bool] = True
    subtitle_position: Optional[str] = "bottom"
    font_name: Optional[str] = "STHeitiMedium.ttc"
    font_size: int = 60
    stroke_width: float = 1.5
```

**Pattern:**

- Heavy use of `Optional` with defaults
- Nested dataclasses for complex types (`MaterialInfo`)
- Union types (`str | list`) for flexible inputs
- Domain-specific groupings (video, voice, subtitle)

### 3.3 API Response Schemas

```python
class BaseResponse(BaseModel):
    status: int = 200
    message: Optional[str] = "success"
    data: Any = None

class TaskResponse(BaseResponse):
    class TaskResponseData(BaseModel):
        task_id: str

    data: TaskResponseData

    class Config:
        json_schema_extra = {
            "example": {
                "status": 200,
                "message": "success",
                "data": {"task_id": "6c85c8cc-a77a-42b9-bc30-947815aa0558"},
            },
        }
```

**Pattern:** Nested response classes with `json_schema_extra` for OpenAPI documentation.

---

## 4. Evidence: short-video-maker-gyori (Zod)

**Source:** [vendor/short-video-maker-gyori/src/types/shorts.ts](../../../vendor/short-video-maker-gyori/src/types/shorts.ts)

### 4.1 Zod Schema with `.describe()` for LLM Guidance

```typescript
export const sceneInput = z.object({
  text: z.string().describe('Text to be spoken in the video'),
  searchTerms: z
    .array(z.string())
    .describe(
      'Search term for video, 1 word, and at least 2-3 search terms should be provided for each scene. Make sure to match the overall context with the word - regardless what the video search result would be.'
    ),
});
export type SceneInput = z.infer<typeof sceneInput>;
```

**Pattern:** The `.describe()` method adds human-readable descriptions that serve as LLM prompt guidance when the schema is passed to structured output APIs.

### 4.2 Enum-Based Constraints

```typescript
export enum MusicMoodEnum {
  sad = 'sad',
  melancholic = 'melancholic',
  happy = 'happy',
  euphoric = 'euphoric/high',
  excited = 'excited',
  chill = 'chill',
  uneasy = 'uneasy',
  angry = 'angry',
  dark = 'dark',
  hopeful = 'hopeful',
  contemplative = 'contemplative',
  funny = 'funny/quirky',
}

export enum VoiceEnum {
  af_heart = 'af_heart',
  af_alloy = 'af_alloy',
  // ... 28 voice options
  bm_fable = 'bm_fable',
}

export const renderConfig = z.object({
  music: z
    .nativeEnum(MusicMoodEnum)
    .optional()
    .describe('Music tag to be used to find the right music for the video'),
  voice: z
    .nativeEnum(VoiceEnum)
    .optional()
    .describe('Voice to be used for the speech, default is af_heart'),
  orientation: z
    .nativeEnum(OrientationEnum)
    .optional()
    .describe('Orientation of the video, default is portrait'),
});
```

**Pattern:** Use `z.nativeEnum()` with TypeScript enums for type-safe constrained values.

### 4.3 Composable Root Schema

```typescript
export const createShortInput = z.object({
  scenes: z.array(sceneInput).describe('Each scene to be created'),
  config: renderConfig.describe('Configuration for rendering the video'),
});
export type CreateShortInput = z.infer<typeof createShortInput>;
```

**Pattern:** Compose smaller schemas into larger ones. Export both schema and inferred type.

### 4.4 Safe Parsing with Error Formatting

**Source:** [vendor/short-video-maker-gyori/src/server/validator.ts](../../../vendor/short-video-maker-gyori/src/server/validator.ts)

```typescript
export function validateCreateShortInput(input: object): CreateShortInput {
  const validated = createShortInput.safeParse(input);
  logger.info({ validated }, 'Validated input');

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

  const errorPaths = Object.keys(missingFields);
  let message = `Validation failed for ${errorPaths.length} field(s): `;
  message += errorPaths.join(', ');

  return { message, missingFields };
}
```

**Pattern:**

1. Use `safeParse()` instead of `parse()` - never throws
2. Check `validated.success` before accessing `.data`
3. Format errors into structured response for debugging
4. Convert Zod error paths to dot-notation field names

---

## 5. Evidence: vidosy (Modular Zod Schemas)

**Source:** [templates/vidosy/src/shared/zod-schema.ts](../../../templates/vidosy/src/shared/zod-schema.ts)

### 5.1 Hierarchical Schema Composition

```typescript
// Atomic schemas
export const backgroundSchema = z.object({
  type: z.enum(['color', 'image', 'video']),
  value: z.string(),
});

export const textSchema = z.object({
  content: z.string(),
  fontSize: z.number().min(12).max(200).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  position: z.enum(['top', 'center', 'bottom', 'left', 'right']).optional(),
});

// Composite schemas
export const sceneSchema = z.object({
  id: z.string(),
  duration: z.number().positive(),
  background: backgroundSchema.optional(),
  text: textSchema.optional(),
  audio: z
    .object({
      file: z.string().optional(),
      volume: z.number().min(0).max(1).optional(),
      startTime: z.number().min(0).optional(),
    })
    .optional(),
});

// Root schema
export const vidosyConfigSchema = z.object({
  video: videoSchema,
  scenes: z.array(sceneSchema).min(1),
  audio: audioSchema.optional(),
  output: outputSchema.optional(),
});
```

**Pattern:** Build schemas bottom-up: atoms → composites → root. Each level is independently testable.

### 5.2 Numeric Constraints

```typescript
export const videoSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  fps: z.number().positive(),
  duration: z.number().positive(),
});

export const audioSchema = z.object({
  volume: z.number().min(0).max(1).optional(),
  fadeIn: z.number().min(0).optional(),
  fadeOut: z.number().min(0).optional(),
});
```

**Pattern:** Use `.positive()`, `.min()`, `.max()` for numeric validation. Domain constraints (volume 0-1, positive duration) expressed in schema.

### 5.3 Type Inference Export Pattern

```typescript
export type BackgroundConfig = z.infer<typeof backgroundSchema>;
export type TextConfig = z.infer<typeof textSchema>;
export type SceneConfig = z.infer<typeof sceneSchema>;
export type VidosyConfig = z.infer<typeof vidosyConfigSchema>;
```

**Pattern:** Always export inferred types alongside schemas. This ensures TypeScript types match runtime validation.

---

## 6. Evidence: openai-agents-js (Structured Outputs)

**Source:** [vendor/openai-agents-js/examples/docs/agents/agentWithAodOutputType.ts](../../../vendor/openai-agents-js/examples/docs/agents/agentWithAodOutputType.ts)

### 6.1 Agent Output Type Definition

```typescript
import { Agent } from '@openai/agents';
import { z } from 'zod';

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

const extractor = new Agent({
  name: 'Calendar extractor',
  instructions: 'Extract calendar events from the supplied text.',
  outputType: CalendarEvent,
});
```

**Pattern:** Pass Zod schema directly to agent constructor. SDK converts to JSON Schema for API structured outputs.

### 6.2 Protocol Schema with Descriptions

**Source:** [vendor/openai-agents-js/packages/agents-core/src/types/protocol.ts](../../../vendor/openai-agents-js/packages/agents-core/src/types/protocol.ts)

```typescript
export const InputImage = SharedBase.extend({
  type: z.literal('input_image'),
  image: z
    .string()
    .or(z.object({ id: z.string().describe('OpenAI file ID') }))
    .describe('Either base64 encoded image data, a data URL, or an object with a file ID.')
    .optional(),
  detail: z.string().optional(),
});

export const InputFile = SharedBase.extend({
  type: z.literal('input_file'),
  file: z
    .string()
    .describe('Either base64 encoded file data or a publicly accessible file URL')
    .or(z.object({ id: z.string().describe('OpenAI file ID') }))
    .or(z.object({ url: z.string().describe('Publicly accessible file URL') }))
    .describe('Contents of the file or an object with a file ID.')
    .optional(),
});
```

**Pattern:**

- Use `.extend()` for schema inheritance
- Use `z.literal()` for discriminated unions
- Use `.or()` for union types with distinct shapes
- Add `.describe()` at each level for LLM context

---

## 7. Evidence: ShortGPT (Ad-hoc Parsing)

**Source:** [vendor/ShortGPT/shortGPT/gpt/gpt_utils.py](../../../vendor/ShortGPT/shortGPT/gpt/gpt_utils.py)

### 7.1 Regex-Based JSON Extraction

```python
def extract_biggest_json(string):
    json_regex = r"\{(?:[^{}]|(?R))*\}"
    json_objects = re.findall(json_regex, string)
    if json_objects:
        return max(json_objects, key=len)
    return None
```

**Pattern:** Extract largest JSON object from LLM response using regex. Handles LLMs that wrap JSON in markdown or explanation text.

### 7.2 Bracket-Matching Fallback

**Source:** [vendor/ShortGPT/shortGPT/gpt/gpt_editing.py](../../../vendor/ShortGPT/shortGPT/gpt/gpt_editing.py)

```python
def extractJsonFromString(text):
    start = text.find('{')
    end = text.rfind('}') + 1
    if start == -1 or end == 0:
        raise Exception("Error: No JSON object found in response")
    json_str = text[start:end]
    return json.loads(json_str)
```

**Pattern:** Simple bracket matching as fallback. Find first `{` and last `}`.

### 7.3 Retry with Exception Handling

```python
def getVideoSearchQueriesTimed(captions_timed):
    for _ in range(4):  # Retry up to 4 times
        try:
            res = gpt_utils.llm_completion(chat_prompt=prompt, system=system)
            data = extractJsonFromString(res)
            # Process data...
            return formatted_queries

        except json.JSONDecodeError:
            print("Error: Invalid JSON response from LLM")
            return []
        except KeyError:
            print("Error: Malformed JSON structure")
            return []
        except Exception as e:
            print(f"Error processing: {str(e)}")
            return []
```

**Pattern:**

- Retry loop for LLM flakiness
- Catch specific exceptions (JSONDecodeError, KeyError)
- Return empty list on failure (graceful degradation)

---

## 8. Synthesis: Recommended Patterns for content-machine

### 8.1 Schema Library Selection

**Recommendation:** Use **Zod** as the primary schema library.

**Rationale:**

1. TypeScript-native with excellent type inference
2. `.describe()` method enables LLM guidance in schema
3. `safeParse()` pattern never throws, enables graceful error handling
4. `zodToJsonSchema` converts to JSON Schema for API structured outputs
5. Composable with `.extend()`, `.merge()`, `.pick()`, `.omit()`
6. Validated by openai-agents-js and short-video-maker-gyori in production

### 8.2 Schema Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Pipeline Schemas                       │
├─────────────────────────────────────────────────────────┤
│  ScriptSchema ─→ AudioSchema ─→ VisualsSchema ─→ RenderSchema
│      ↓              ↓               ↓               ↓
│  cm script      cm audio        cm visuals      cm render
└─────────────────────────────────────────────────────────┘
```

**Inter-stage contracts:**

- Each command outputs JSON matching its output schema
- Next command validates input against its input schema
- Mismatch = clear error with field-level diagnostics

### 8.3 LLM Output Validation Strategy

```typescript
// Two-tier validation: flexible input → strict internal
const LLMScriptOutputFlexible = z.object({
  scenes: z
    .array(
      z.object({
        voiceover: z.string(),
        searchTerms: z.array(z.string()).optional(),
      })
    )
    .describe('Array of scene objects with voiceover text'),
});

const ScriptOutputStrict = z.object({
  scenes: z.array(
    z.object({
      voiceover: z.string().min(10).max(500),
      searchTerms: z.array(z.string().min(1)).min(1).max(5),
    })
  ),
});

// In script generation:
const parsed = LLMScriptOutputFlexible.safeParse(llmResponse);
if (!parsed.success) {
  // Fallback: extract JSON with regex
  const extracted = extractBiggestJson(llmResponse);
  // ... retry logic
}

// Apply strict validation for next stage
const validated = ScriptOutputStrict.parse(parsed.data);
```

### 8.4 Fallback JSON Extraction

```typescript
// Port from ShortGPT pattern
function extractBiggestJson(text: string): object | null {
  const jsonRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  const matches = text.match(jsonRegex);
  if (!matches) return null;

  return matches
    .map((m) => {
      try {
        return JSON.parse(m);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0];
}
```

### 8.5 Error Message Pattern

```typescript
// From short-video-maker-gyori
interface ValidationErrorResult {
  message: string;
  missingFields: Record<string, string>;
}

function formatZodError(error: ZodError): ValidationErrorResult {
  const missingFields: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    missingFields[path] = err.message;
  });

  return {
    message: `Validation failed for ${Object.keys(missingFields).length} field(s)`,
    missingFields,
  };
}
```

---

## 9. Key Takeaways

| Pattern                                 | Source                                    | Adoption Priority |
| --------------------------------------- | ----------------------------------------- | ----------------- |
| `z.infer<typeof schema>` type inference | vidosy, short-video-maker-gyori           | **Must have**     |
| `.describe()` for LLM guidance          | openai-agents-js, short-video-maker-gyori | **Must have**     |
| `safeParse()` never-throws pattern      | short-video-maker-gyori                   | **Must have**     |
| `z.nativeEnum()` for TypeScript enums   | short-video-maker-gyori                   | **Should have**   |
| Hierarchical schema composition         | vidosy                                    | **Should have**   |
| Regex JSON extraction fallback          | ShortGPT                                  | **Should have**   |
| Retry loop for LLM flakiness            | ShortGPT                                  | **Should have**   |
| `json_schema_extra` for API docs        | MoneyPrinterTurbo                         | Nice to have      |

---

## 10. References to Existing Research

- [00-SUMMARY-20260102.md](../00-SUMMARY-20260102.md) - Architecture overview
- [10-short-video-maker-gyori-20260102.md](../10-short-video-maker-gyori-20260102.md) - Zod + TypeScript patterns
- [12-vidosy-20260102.md](../12-vidosy-20260102.md) - JSON config → video system
- [01-moneyprinter-turbo-20260102.md](../01-moneyprinter-turbo-20260102.md) - Pydantic models
- [08-shortgpt-20260102.md](../08-shortgpt-20260102.md) - LLM output handling

---

## 11. Next Steps

1. Define `ScriptSchema` for `cm script` command output
2. Define `AudioSchema` for `cm audio` command output
3. Define `VisualsSchema` for `cm visuals` command output
4. Define `RenderSchema` for `cm render` command input
5. Implement `validateWithFallback()` utility combining safeParse + regex extraction
6. Create schema test suite with valid/invalid examples
