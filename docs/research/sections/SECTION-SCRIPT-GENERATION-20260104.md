# Section Research: Script Generation (LLM)

**Research Date:** 2026-01-04  
**Section:** System Design Section 6.1 - `cm script` Command  
**Status:** Complete

---

## 1. Research Questions

This document investigates LLM-based script generation patterns across vendored repositories to inform content-machine's `cm script` command design.

**Key Questions:**

1. How are prompt templates structured and stored?
2. How do repos abstract multiple LLM providers?
3. How is LLM output parsed into structured data?
4. How are scenes/segments generated from scripts?
5. How are search terms generated for video/image matching?

---

## 2. Vendor Evidence Summary

| Repo                    | Prompt Format         | LLM Abstraction                      | Output Parsing        | Scene Generation         |
| ----------------------- | --------------------- | ------------------------------------ | --------------------- | ------------------------ |
| MoneyPrinterTurbo       | Inline f-strings      | Config-driven factory (13 providers) | JSON + regex fallback | Paragraph-based          |
| ShortGPT                | YAML files            | Gemini/OpenAI dual                   | JSON + regex fallback | Timed from captions      |
| short-video-maker-gyori | External (no prompts) | None (validation only)               | Zod safeParse         | Input already structured |

---

## 3. Evidence: MoneyPrinterTurbo (Inline Prompts + Multi-Provider)

**Source:** [vendor/MoneyPrinterTurbo/app/services/llm.py](../../../vendor/MoneyPrinterTurbo/app/services/llm.py)

### 3.1 Inline Prompt Template (f-string)

```python
def generate_script(
    video_subject: str, language: str = "", paragraph_number: int = 1
) -> str:
    prompt = f"""
# Role: Video Script Generator

## Goals:
Generate a script for a video, depending on the subject of the video.

## Constrains:
1. the script is to be returned as a string with the specified number of paragraphs.
2. do not under any circumstance reference this prompt in your response.
3. get straight to the point, don't start with unnecessary things like, "welcome to this video".
4. you must not include any type of markdown or formatting in the script, never use a title.
5. only return the raw content of the script.
6. do not include "voiceover", "narrator" or similar indicators of what should be spoken at the beginning of each paragraph or line.
7. you must not mention the prompt, or anything about the script itself. also, never talk about the amount of paragraphs or lines. just write the script.
8. respond in the same language as the video subject.

# Initialization:
- video subject: {video_subject}
- number of paragraphs: {paragraph_number}
""".strip()
    if language:
        prompt += f"\n- language: {language}"
```

**Pattern:**

- Markdown-structured prompt with clear sections (Role, Goals, Constraints)
- Numbered constraints list for instruction clarity
- Variable injection via f-string placeholders
- Conditional language append

### 3.2 Search Terms Generation Prompt

```python
def generate_terms(video_subject: str, video_script: str, amount: int = 5) -> List[str]:
    prompt = f"""
# Role: Video Search Terms Generator

## Goals:
Generate {amount} search terms for stock videos, depending on the subject of a video.

## Constrains:
1. the search terms are to be returned as a json-array of strings.
2. each search term should consist of 1-3 words, always add the main subject of the video.
3. you must only return the json-array of strings. you must not return anything else. you must not return the script.
4. the search terms must be related to the subject of the video.
5. reply with english search terms only.

## Output Example:
["search term 1", "search term 2", "search term 3","search term 4","search term 5"]

## Context:
### Video Subject
{video_subject}

### Video Script
{video_script}

Please note that you must use English for generating video search terms; Chinese is not accepted.
""".strip()
```

**Pattern:**

- Explicit JSON output format in prompt
- Example output provided for LLM guidance
- Context section with all inputs
- Language constraint explicit

### 3.3 Multi-Provider LLM Abstraction

```python
def _generate_response(prompt: str) -> str:
    llm_provider = config.app.get("llm_provider", "openai")

    if llm_provider == "g4f":
        model_name = config.app.get("g4f_model_name", "gpt-3.5-turbo-16k-0613")
        content = g4f.ChatCompletion.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
        )
    elif llm_provider == "moonshot":
        api_key = config.app.get("moonshot_api_key")
        model_name = config.app.get("moonshot_model_name")
        base_url = "https://api.moonshot.cn/v1"
    elif llm_provider == "ollama":
        api_key = "ollama"  # any string works
        model_name = config.app.get("ollama_model_name")
        base_url = config.app.get("ollama_base_url", "http://localhost:11434/v1")
    elif llm_provider == "openai":
        api_key = config.app.get("openai_api_key")
        model_name = config.app.get("openai_model_name")
        base_url = config.app.get("openai_base_url", "https://api.openai.com/v1")
    # ... 10+ more providers: azure, gemini, qwen, cloudflare, deepseek, etc.

    client = OpenAI(api_key=api_key, base_url=base_url)
    response = client.chat.completions.create(
        model=model_name,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content
```

**Pattern:**

- Config-driven provider selection
- Each provider has its own config keys (`{provider}_api_key`, `{provider}_model_name`, `{provider}_base_url`)
- Fallback to OpenAI SDK for most providers (via base_url)
- Special handling for non-OpenAI-compatible APIs (Gemini, Qwen)

**Supported Providers (13):**

1. OpenAI
2. Azure OpenAI
3. Ollama (local)
4. Moonshot
5. Qwen (Alibaba)
6. Cloudflare Workers AI
7. DeepSeek
8. Gemini
9. ModelScope
10. Ernie (Baidu)
11. Pollinations (free)
12. g4f (free multi-provider)
13. OneAPI (proxy)

### 3.4 JSON Parsing with Regex Fallback

```python
def generate_terms(...) -> List[str]:
    for i in range(_max_retries):  # _max_retries = 5
        try:
            response = _generate_response(prompt)
            search_terms = json.loads(response)

            if not isinstance(search_terms, list) or not all(
                isinstance(term, str) for term in search_terms
            ):
                logger.error("response is not a list of strings.")
                continue

        except Exception as e:
            logger.warning(f"failed to generate video terms: {str(e)}")
            if response:
                # Regex fallback: extract JSON array from text
                match = re.search(r"\[.*]", response)
                if match:
                    try:
                        search_terms = json.loads(match.group())
                    except Exception as e:
                        logger.warning(f"failed to parse extracted JSON: {str(e)}")

        if search_terms and len(search_terms) > 0:
            break
```

**Pattern:**

1. Try `json.loads()` first
2. Validate structure (list of strings)
3. Fallback: regex extract `\[.*\]`
4. Retry loop (5 attempts)
5. Break on success

### 3.5 Response Formatting (Markdown Stripping)

```python
def format_response(response):
    # Remove asterisks, hashes
    response = response.replace("*", "")
    response = response.replace("#", "")

    # Remove markdown syntax
    response = re.sub(r"\[.*\]", "", response)
    response = re.sub(r"\(.*\)", "", response)

    # Split into paragraphs
    paragraphs = response.split("\n\n")
    return "\n\n".join(paragraphs)
```

**Pattern:** Strip markdown artifacts that LLMs often add despite instructions.

---

## 4. Evidence: ShortGPT (YAML Prompts)

**Source:** [vendor/ShortGPT/shortGPT/prompt_templates/](../../../vendor/ShortGPT/shortGPT/prompt_templates/)

### 4.1 YAML Prompt Template Structure

**File:** `chat_video_script.yaml`

```yaml
system_prompt: |
  You are an expert video writer. You ONLY produce text that is read. You only produce the script.
  that will be read by a voice actor for a video. The user will give you the description of the video
  they want you to make and from that, you will write the script.

  Make sure the text is not longer than 200 words (keep the video pretty short and neat).

  # Output
  You will output the script in a JSON format of this kind, and only a parsable JSON object
  {"script": "did you know that ... ?"}

chat_prompt: |
  Language: <<LANGUAGE>>
  Video description:
  <<DESCRIPTION>>
```

**Pattern:**

- Separate `system_prompt` and `chat_prompt` fields
- `<<PLACEHOLDER>>` syntax for variable injection
- JSON output format specified in system prompt
- Word count constraint explicit

### 4.2 Video Search Query Prompt

**File:** `editing_generate_videos.yaml`

```yaml
system_prompt: |
  You are an AI specialized in generating precise video search queries for video editing.
  You must output ONLY valid JSON in the specified format, with no additional text.

chat_prompt: |
  You are a video editor specializing in creating engaging visual content. Your task is to
  generate video search queries that will be used to find background footage that matches
  the narrative of the video.

  For each time segment (4-5 seconds long), you need to suggest 3 alternative search queries
  that could be used to find appropriate video footage. Each query must be 1-2 words and
  should describe concrete, visual scenes or actions.

  Guidelines for queries:
  1. Use ONLY English words
  2. Keep queries between 1-2 words
  3. Focus on visual, concrete objects or actions
  4. Avoid abstract concepts
  5. Include both static and dynamic scenes
  6. Ensure queries are family-friendly and safe for monetization

  Good examples:
  - "ocean waves"
  - "typing keyboard"
  - "city traffic"

  Bad examples:
  - "feeling sad" (abstract)
  - "beautiful nature landscape morning sun" (too many words)
  - "confused thoughts" (not visual)

  The output must be valid JSON in this format:
  {
    "video_segments": [
      {
        "time_range": [0.0, 4.324],
        "queries": ["coffee steam", "hot drink", "morning breakfast"]
      }
    ]
  }

  Timed captions:
  <<TIMED_CAPTIONS>>
```

**Pattern:**

- Detailed guidelines with numbered list
- Good/bad examples for disambiguation
- Exact JSON schema in prompt
- Timestamps from timed captions

### 4.3 Facts Generator Prompt

**File:** `facts_generator.yaml`

```yaml
system_prompt: >
  You are an expert content writer of a YouTube shorts channel. You specialize in `facts` shorts.
  Your facts shorts are less than 50 seconds verbally (around 140 words maximum).
  They are extremely captivating, and original.

  The user will ask you a type of facts short and you will produce it.
  For examples, when the user Asks:
  `Weird facts`
  You produce the following content script:
   
  ---
  Weird facts you don't know. 
  A swarm of 20,000 bees followed a car for two days because their queen was stuck inside.
  [... more examples ...]
  ---
   
  Only give the first `hook`, like "Weird facts you don't know. " in the example. Then the facts.
  Keep it short, extremely interesting and original.

chat_prompt: >
  <<FACTS_TYPE>>
```

**Pattern:**

- Few-shot example embedded in system prompt
- Word/time duration constraint
- Hook pattern guidance
- Single placeholder for user input

### 4.4 YAML Prompt Loading

**Source:** [vendor/ShortGPT/shortGPT/gpt/gpt_utils.py](../../../vendor/ShortGPT/shortGPT/gpt/gpt_utils.py)

```python
def load_local_yaml_prompt(file_path):
    _here = Path(__file__).parent
    full_path = _here / file_path
    content = yaml.safe_load(open(full_path, 'r', encoding='utf-8'))
    return content.get('chat_prompt', ''), content.get('system_prompt', '')
```

**Pattern:** Load YAML, return tuple of (chat_prompt, system_prompt).

---

## 5. Evidence: short-video-maker-gyori (Validation-Only)

**Source:** [vendor/short-video-maker-gyori/src/server/routers/rest.ts](../../../vendor/short-video-maker-gyori/src/server/routers/rest.ts)

### 5.1 External LLM → Validation Pattern

```typescript
this.router.post('/short-video', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    // Validate incoming JSON against Zod schema
    const input = validateCreateShortInput(req.body);

    logger.info({ input }, 'Creating short video');

    const videoId = this.shortCreator.addToQueue(input.scenes, input.config);

    res.status(201).json({ videoId });
  } catch (error: unknown) {
    // Handle validation errors
    if (error instanceof Error && error.message.startsWith('{')) {
      const errorData = JSON.parse(error.message);
      res.status(400).json({
        error: 'Validation failed',
        message: errorData.message,
        missingFields: errorData.missingFields,
      });
      return;
    }
    res.status(400).json({
      error: 'Invalid input',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

**Pattern:**

- No script generation - receives pre-generated content
- Validates against Zod schema (from [SECTION-SCHEMAS-VALIDATION](SECTION-SCHEMAS-VALIDATION-20260104.md))
- Returns structured error on validation failure
- LLM interaction is external (via MCP or direct API)

### 5.2 MCP Tool for LLM Integration

The MCP router allows LLMs (like Claude) to call the video creation tool directly:

```typescript
// From src/server/routers/mcp.ts
// LLM uses create-short-video tool with structured input
// Tool validates via same Zod schema
```

**Pattern:** Delegate script generation to external LLM, validate on receipt.

---

## 6. Synthesis: Recommended Patterns for content-machine

### 6.1 Prompt Storage Strategy

**Recommendation:** Use **YAML files with `<<PLACEHOLDER>>` syntax**.

**Rationale:**

1. Version-controllable (git diff-friendly)
2. Separate system/chat prompts
3. Easy to test prompt variations
4. Decoupled from code changes

**File structure:**

```
src/script/prompts/
├── generate-script.yaml
├── generate-search-terms.yaml
├── split-scenes.yaml
└── validate-script.yaml
```

### 6.2 LLM Provider Abstraction

**Recommendation:** Use **Vercel AI SDK** (ai package) for provider abstraction.

```typescript
// src/script/llm.ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { ollama } from 'ollama-ai-provider';

type Provider = 'openai' | 'anthropic' | 'ollama' | 'google';

async function generateScript(prompt: string, provider: Provider = 'openai'): Promise<string> {
  const model = getModel(provider);
  const { text } = await generateText({ model, prompt });
  return text;
}

function getModel(provider: Provider) {
  switch (provider) {
    case 'openai':
      return openai('gpt-4o');
    case 'anthropic':
      return anthropic('claude-sonnet-4-20250514');
    case 'ollama':
      return ollama('llama3.2');
    case 'google':
      return google('gemini-2.0-flash');
  }
}
```

**Rationale:**

1. Unified API across providers
2. Structured outputs via `generateObject()`
3. Streaming support
4. TypeScript-native
5. Actively maintained

### 6.3 Structured Output Strategy

**Recommendation:** Use **Zod schemas with Vercel AI SDK's `generateObject()`**.

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const ScriptOutputSchema = z.object({
  scenes: z
    .array(
      z.object({
        voiceover: z.string().describe('Text to be spoken'),
        searchTerms: z.array(z.string()).describe('1-2 word visual search terms'),
        duration: z.number().optional().describe('Estimated duration in seconds'),
      })
    )
    .describe('Array of scenes for the video'),
});

async function generateScript(topic: string) {
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    schema: ScriptOutputSchema,
    prompt: `Generate a short video script about: ${topic}`,
  });

  return object; // Type-safe, validated
}
```

**Fallback for non-structured-output models:**

```typescript
async function generateScriptWithFallback(topic: string) {
  try {
    // Try structured output first
    return await generateObject({ model, schema, prompt });
  } catch (e) {
    // Fallback: generate text + parse
    const { text } = await generateText({ model, prompt });
    return parseJsonWithFallback(text, ScriptOutputSchema);
  }
}

function parseJsonWithFallback<T>(text: string, schema: z.ZodSchema<T>): T {
  // Try direct parse
  try {
    const json = JSON.parse(text);
    return schema.parse(json);
  } catch {
    // Regex extraction (from MoneyPrinterTurbo/ShortGPT pattern)
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const json = JSON.parse(match[0]);
      return schema.parse(json);
    }
    throw new Error('Could not extract JSON from LLM response');
  }
}
```

### 6.4 Prompt Template Loading

```typescript
// src/script/prompts/loader.ts
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { join } from 'path';

interface PromptTemplate {
  system_prompt: string;
  chat_prompt: string;
}

export function loadPrompt(name: string, variables: Record<string, string>): PromptTemplate {
  const path = join(__dirname, 'prompts', `${name}.yaml`);
  const content = load(readFileSync(path, 'utf-8')) as PromptTemplate;

  // Replace <<PLACEHOLDER>> with values
  const interpolate = (text: string) => {
    return Object.entries(variables).reduce(
      (acc, [key, value]) => acc.replace(new RegExp(`<<${key}>>`, 'g'), value),
      text
    );
  };

  return {
    system_prompt: interpolate(content.system_prompt),
    chat_prompt: interpolate(content.chat_prompt),
  };
}
```

### 6.5 Command Output Schema

```typescript
// src/script/schema.ts
import { z } from 'zod';

export const SceneSchema = z.object({
  voiceover: z.string().min(10).max(500).describe('The narration text for this scene'),
  searchTerms: z
    .array(z.string().min(1).max(30))
    .min(1)
    .max(5)
    .describe('1-2 word visual search terms for finding footage'),
  estimatedDurationSec: z
    .number()
    .positive()
    .optional()
    .describe('Estimated speaking duration in seconds'),
});

export const ScriptOutputSchema = z.object({
  title: z.string().max(100).describe('Video title for metadata'),
  scenes: z.array(SceneSchema).min(1).max(20).describe('Ordered list of scenes'),
  totalEstimatedDurationSec: z
    .number()
    .positive()
    .optional()
    .describe('Total video duration estimate'),
});

export type ScriptOutput = z.infer<typeof ScriptOutputSchema>;
```

---

## 7. Key Takeaways

| Pattern                         | Source                      | Adoption Priority |
| ------------------------------- | --------------------------- | ----------------- |
| YAML prompt templates           | ShortGPT                    | **Must have**     |
| `<<PLACEHOLDER>>` interpolation | ShortGPT                    | **Must have**     |
| Provider abstraction via config | MoneyPrinterTurbo           | **Must have**     |
| JSON output in prompt + schema  | ShortGPT, MoneyPrinterTurbo | **Must have**     |
| Regex fallback extraction       | MoneyPrinterTurbo, ShortGPT | **Should have**   |
| Retry loop (3-5 attempts)       | MoneyPrinterTurbo           | **Should have**   |
| Good/bad examples in prompt     | ShortGPT                    | **Should have**   |
| Markdown stripping              | MoneyPrinterTurbo           | Nice to have      |

---

## 8. References to Existing Research

- [00-SUMMARY-20260102.md](../00-SUMMARY-20260102.md) - Architecture overview
- [01-moneyprinter-turbo-20260102.md](../01-moneyprinter-turbo-20260102.md) - Multi-provider LLM
- [08-shortgpt-20260102.md](../08-shortgpt-20260102.md) - YAML prompts, EdgeTTS
- [10-short-video-maker-gyori-20260102.md](../10-short-video-maker-gyori-20260102.md) - Validation-only pattern
- [SECTION-SCHEMAS-VALIDATION-20260104.md](SECTION-SCHEMAS-VALIDATION-20260104.md) - Zod patterns

---

## 9. Next Steps

1. Create `src/script/prompts/` directory with YAML templates
2. Implement `loadPrompt()` utility with variable interpolation
3. Define `ScriptOutputSchema` with Zod
4. Implement `generateScript()` with Vercel AI SDK
5. Add regex fallback for non-structured-output models
6. Write tests with mock LLM responses
