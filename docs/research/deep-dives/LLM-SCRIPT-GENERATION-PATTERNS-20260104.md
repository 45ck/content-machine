# LLM Script/Voiceover Generation Patterns in Vendored Repos

**Date:** 2026-01-04  
**Purpose:** Research how vendored repos generate scripts/voiceovers from LLMs  
**Repos Analyzed:** MoneyPrinterTurbo, short-video-maker-gyori, ShortGPT, shortrocity, AI-short-creator, MoneyPrinterV2, viralfactory, AI-Youtube-Shorts-Generator

---

## Executive Summary

| Aspect                       | Dominant Pattern                                      | Best Implementation             |
| ---------------------------- | ----------------------------------------------------- | ------------------------------- |
| **Prompt Templates**         | YAML files with `system_prompt` + `chat_prompt`       | ShortGPT                        |
| **LLM Provider Abstraction** | Factory pattern with config-driven provider selection | viralfactory, MoneyPrinterTurbo |
| **Structured Output**        | JSON parsing with regex fallback + retry loops        | ShortGPT, MoneyPrinterTurbo     |
| **Scene Generation**         | LLM generates timed segments with captions            | ShortGPT (editing prompts)      |
| **Search Term Generation**   | LLM generates JSON array of 1-3 word terms            | MoneyPrinterTurbo, ShortGPT     |

---

## 1. Prompt Template Formats

### Pattern A: YAML Files (ShortGPT, viralfactory)

**Location:** `vendor/ShortGPT/shortGPT/prompt_templates/`

**Structure:**

```yaml
# Example: reddit_generate_script.yaml
system_prompt: |
  Instructions for the new story:
  You are a YouTube shorts content creator who makes extremely good YouTube shorts...
  1- The story must be between 120 and 140 words MAXIMUM.
  2- DO NOT end the story with a moral conclusion...
  ...

chat_prompt: |
  Reddit question: <<QUESTION>>

  -New Generated story...
```

**Loading Code:** [gpt_utils.py#L49-L54](../../../vendor/ShortGPT/shortGPT/gpt/gpt_utils.py)

```python
def load_local_yaml_prompt(file_path):
    _here = Path(__file__).parent
    _absolute_path = (_here / '..' / file_path).resolve()
    json_template = load_yaml_file(str(_absolute_path))
    return json_template['chat_prompt'], json_template['system_prompt']
```

**Templates Available:**

- `reddit_generate_script.yaml` - Story generation from Reddit questions
- `facts_generator.yaml` - Facts video scripts with examples
- `editing_generate_images.yaml` - Image search query generation
- `editing_generate_videos.yaml` - Video search query generation
- `yt_title_description.yaml` - YouTube metadata (expects JSON output)
- `chat_video_script.yaml` - Generic video script generation
- `translate_content.yaml` - Content translation
- `reddit_filter_realistic.yaml` - Score realism (JSON output)

### Pattern B: Inline F-String Prompts (MoneyPrinterTurbo, MoneyPrinterV2)

**Location:** [vendor/MoneyPrinterTurbo/app/services/llm.py#L334-L357](../../../vendor/MoneyPrinterTurbo/app/services/llm.py)

```python
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
6. do not include "voiceover", "narrator" or similar indicators...
7. you must not mention the prompt, or anything about the script itself...
8. respond in the same language as the video subject.

# Initialization:
- video subject: {video_subject}
- number of paragraphs: {paragraph_number}
""".strip()
if language:
    prompt += f"\n- language: {language}"
```

### Pattern C: Inline with Structured Output (shortrocity)

**Location:** [vendor/shortrocity/main.py#L36-L69](../../../vendor/shortrocity/main.py)

```python
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {
            "role": "system",
            "content": """You are a YouTube short narration generator. You generate 30 seconds to 1 minute of narration...

Respond with a pair of an image description in square brackets and a narration below it:

###
[Description of a background image]
Narrator: "One sentence of narration"

[Description of a background image]
Narrator: "One sentence of narration"
###

The short should be 6 sentences maximum.
"""
        },
        {
            "role": "user",
            "content": f"Create a YouTube short narration based on the following source material:\n\n{source_material}"
        }
    ]
)
```

**Parsing:** [vendor/shortrocity/narration.py#L12-L25](../../../vendor/shortrocity/narration.py)

```python
def parse(narration):
    data = []
    narrations = []
    lines = narration.split("\n")
    for line in lines:
        if line.startswith('Narrator: '):
            text = line.replace('Narrator: ', '')
            data.append({
                "type": "text",
                "content": text.strip('"'),
            })
            narrations.append(text.strip('"'))
        elif line.startswith('['):
            background = line.strip('[]')
            data.append({
                "type": "image",
                "description": background,
            })
    return data, narrations
```

---

## 2. LLM Provider Abstraction

### Pattern A: Config-Driven Factory (MoneyPrinterTurbo) ⭐ Best Coverage

**Location:** [vendor/MoneyPrinterTurbo/app/services/llm.py#L17-L320](../../../vendor/MoneyPrinterTurbo/app/services/llm.py)

**Providers Supported:** 13 total

- OpenAI, Azure OpenAI, Gemini, Ollama, g4f (free)
- Moonshot, OneAPI, Qwen, Cloudflare, DeepSeek
- ModelScope, Ernie, Pollinations

```python
def _generate_response(prompt: str) -> str:
    llm_provider = config.app.get("llm_provider", "openai")

    if llm_provider == "g4f":
        content = g4f.ChatCompletion.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
        )
    elif llm_provider == "openai":
        api_key = config.app.get("openai_api_key")
        model_name = config.app.get("openai_model_name")
        base_url = config.app.get("openai_base_url", "https://api.openai.com/v1")
        client = OpenAI(api_key=api_key, base_url=base_url)
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}]
        )
    elif llm_provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=api_key, transport="rest")
        model = genai.GenerativeModel(model_name=model_name, ...)
        response = model.generate_content(prompt)
    # ... 10 more providers
```

### Pattern B: Abstract Base Class (viralfactory) ⭐ Best Architecture

**Location:** [vendor/viralfactory/src/engines/LLMEngine/BaseLLMEngine.py](../../../vendor/viralfactory/src/engines/LLMEngine/BaseLLMEngine.py)

```python
class BaseLLMEngine(BaseEngine):
    supports_vision = False

    @abstractmethod
    def generate(
        self,
        system_prompt: str,
        chat_prompt: str = "",
        messages: list[dict] = [],
        max_tokens: int = 512,
        temperature: float = 1.0,
        json_mode: bool = False,  # OpenAI native JSON mode
        top_p: float = 1,
        frequency_penalty: float = 0,
        presence_penalty: float = 0,
    ) -> str | dict:
        pass
```

**OpenAI Implementation:** [vendor/viralfactory/src/engines/LLMEngine/OpenaiLLMEngine.py](../../../vendor/viralfactory/src/engines/LLMEngine/OpenaiLLMEngine.py)

```python
class OpenaiLLMEngine(BaseLLMEngine):
    def generate(self, system_prompt, chat_prompt="", messages=[],
                 max_tokens=512, temperature=1.0, json_mode=False, ...):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system_prompt}, *messages],
            max_tokens=int(max_tokens),
            temperature=temperature,
            response_format=(
                {"type": "json_object"} if json_mode else openai.NOT_GIVEN
            ),
        )
        return (
            response.choices[0].message.content
            if not json_mode
            else orjson.loads(response.choices[0].message.content)
        )
```

### Pattern C: Gemini/OpenAI Fallback (ShortGPT)

**Location:** [vendor/ShortGPT/shortGPT/gpt/gpt_utils.py#L58-L100](../../../vendor/ShortGPT/shortGPT/gpt/gpt_utils.py)

```python
def llm_completion(chat_prompt="", system="", temp=0.7, max_tokens=2000,
                   remove_nl=True, conversation=None):
    openai_key = ApiKeyManager.get_api_key("OPENAI_API_KEY")
    gemini_key = ApiKeyManager.get_api_key("GEMINI_API_KEY")

    if gemini_key:
        client = OpenAI(
            api_key=gemini_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        model = "gemini-2.0-flash-lite-preview-02-05"
    elif openai_key:
        client = OpenAI(api_key=openai_key)
        model = "gpt-4o-mini"
    else:
        raise Exception("No OpenAI or Gemini API Key found")

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": chat_prompt}
        ],
        max_tokens=max_tokens,
        temperature=temp,
        timeout=30
    )
```

### Pattern D: LangChain with Structured Output (AI-Youtube-Shorts-Generator) ⭐ Best Type Safety

**Location:** [vendor/AI-Youtube-Shorts-Generator/Components/LanguageTasks.py](../../../vendor/AI-Youtube-Shorts-Generator/Components/LanguageTasks.py)

```python
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

class JSONResponse(BaseModel):
    """Structured output schema"""
    start: float = Field(description="Start time of the clip")
    content: str = Field(description="Highlight Text")
    end: float = Field(description="End time for the highlighted clip")

def GetHighlight(Transcription):
    llm = ChatOpenAI(model="gpt-5-nano", temperature=1.0, api_key=api_key)

    prompt = ChatPromptTemplate.from_messages([
        ("system", system),
        ("user", Transcription)
    ])

    # LangChain structured output with function calling
    chain = prompt | llm.with_structured_output(JSONResponse, method="function_calling")
    response = chain.invoke({"Transcription": Transcription})

    return int(response.start), int(response.end)
```

---

## 3. Structured Output Handling

### Pattern A: JSON Parsing with Regex Fallback (MoneyPrinterTurbo)

**Location:** [vendor/MoneyPrinterTurbo/app/services/llm.py#L406-L445](../../../vendor/MoneyPrinterTurbo/app/services/llm.py)

```python
def generate_terms(video_subject: str, video_script: str, amount: int = 5) -> List[str]:
    prompt = f"""
# Role: Video Search Terms Generator

## Constrains:
1. the search terms are to be returned as a json-array of strings.
2. each search term should consist of 1-3 words, always add the main subject of the video.
3. you must only return the json-array of strings...

## Output Example:
["search term 1", "search term 2", "search term 3","search term 4","search term 5"]
...
"""
    for i in range(_max_retries):
        try:
            response = _generate_response(prompt)
            search_terms = json.loads(response)
            if not isinstance(search_terms, list) or not all(
                isinstance(term, str) for term in search_terms
            ):
                continue
        except Exception as e:
            # Regex fallback: extract JSON array from response
            if response:
                match = re.search(r"\[.*]", response)
                if match:
                    try:
                        search_terms = json.loads(match.group())
                    except:
                        pass
        if search_terms:
            break
```

### Pattern B: Explicit JSON Schema in Prompt (ShortGPT)

**Location:** [vendor/ShortGPT/shortGPT/prompt_templates/editing_generate_images.yaml](../../../vendor/ShortGPT/shortGPT/prompt_templates/editing_generate_images.yaml)

```yaml
chat_prompt: |
  IMPORTANT OUTPUT RULES:
  1. NEVER use abstract nouns in the queries
  2. ALWAYS use real objects or persons in the queries
  3. Choose more objects than people
  4. Generate exactly <<NUMBER>> queries
  5. Output must be valid JSON in this format:
  {
    "image_queries": [
      {"timestamp": 1.0, "query": "happy person"},
      {"timestamp": 3.2, "query": "red car"}
    ]
  }
  ...
  Output ONLY the JSON response, no additional text.
```

**Parsing:** [vendor/ShortGPT/shortGPT/gpt/gpt_editing.py#L4-L9](../../../vendor/ShortGPT/shortGPT/gpt/gpt_editing.py)

```python
def extractJsonFromString(text):
    start = text.find('{')
    end = text.rfind('}') + 1
    if start == -1 or end == 0:
        raise Exception("Error: No JSON object found in response")
    json_str = text[start:end]
    return json.loads(json_str)
```

### Pattern C: Retry Loop with Validation (ShortGPT)

**Location:** [vendor/ShortGPT/shortGPT/gpt/gpt_yt.py](../../../vendor/ShortGPT/shortGPT/gpt/gpt_yt.py)

```python
def generate_title_description_dict(content):
    out = {"title": "", "description":""}
    chat, system = gpt_utils.load_local_yaml_prompt('prompt_templates/yt_title_description.yaml')
    chat = chat.replace("<<CONTENT>>", f"{content}")

    while out["title"] == "" or out["description"] == "":
        result = gpt_utils.llm_completion(chat_prompt=chat, system=system, temp=1)
        try:
            response = json.loads(result)
            if "title" in response:
                out["title"] = response["title"]
            if "description" in response:
                out["description"] = response["description"]
        except Exception as e:
            pass  # Retry on failure

    return out['title'], out['description']
```

### Pattern D: Native OpenAI JSON Mode (viralfactory)

```python
response = self.client.chat.completions.create(
    model=self.model,
    messages=[...],
    response_format=(
        {"type": "json_object"} if json_mode else openai.NOT_GIVEN
    ),
)
return orjson.loads(response.choices[0].message.content) if json_mode else response.choices[0].message.content
```

---

## 4. Scene Generation Logic

### Pattern A: LLM Generates Timed Segments (ShortGPT)

**Prompt:** [vendor/ShortGPT/shortGPT/prompt_templates/editing_generate_videos.yaml](../../../vendor/ShortGPT/shortGPT/prompt_templates/editing_generate_videos.yaml)

```yaml
chat_prompt: |
  For each time segment (4-5 seconds long), you need to suggest 3 alternative 
  search queries that could be used to find appropriate video footage...

  The output must be valid JSON in this format:
  {
    "video_segments": [
      {
        "time_range": [0.0, 4.324],
        "queries": ["coffee steam", "hot drink", "morning breakfast"]
      },
      {
        "time_range": [4.324, 9.56],
        "queries": ["office work", "desk computer", "typing hands"]
      }
    ]
  }

  Timed captions:
  <<TIMED_CAPTIONS>>
```

**Processing:** [vendor/ShortGPT/shortGPT/gpt/gpt_editing.py#L46-L85](../../../vendor/ShortGPT/shortGPT/gpt/gpt_editing.py)

```python
def getVideoSearchQueriesTimed(captions_timed):
    end_time = captions_timed[-1][0][1]
    chat, system = gpt_utils.load_local_yaml_prompt('prompt_templates/editing_generate_videos.yaml')
    prompt = chat.replace("<<TIMED_CAPTIONS>>", f"{captions_timed}")

    res = gpt_utils.llm_completion(chat_prompt=prompt, system=system)
    data = extractJsonFromString(res)

    formatted_queries = []
    for segment in data["video_segments"]:
        time_range = segment["time_range"]
        queries = segment["queries"]

        # Validate time range
        if not (0 <= time_range[0] < time_range[1] <= end_time):
            continue

        # Ensure exactly 3 queries
        while len(queries) < 3:
            queries.append(queries[-1])
        queries = queries[:3]

        formatted_queries.append([time_range, queries])
```

### Pattern B: Stepwise Pipeline (ShortGPT Content Engine)

**Location:** [vendor/ShortGPT/shortGPT/engine/content_short_engine.py](../../../vendor/ShortGPT/shortGPT/engine/content_short_engine.py)

```python
class ContentShortEngine(AbstractContentEngine):
    def __init__(self, ...):
        self.stepDict = {
            1:  self._generateScript,           # LLM: Generate script
            2:  self._generateTempAudio,        # TTS: Script -> Audio
            3:  self._speedUpAudio,             # FFmpeg: Speed up
            4:  self._timeCaptions,             # Whisper: Audio -> Timed captions
            5:  self._generateImageSearchTerms, # LLM: Captions -> Image queries
            6:  self._generateImageUrls,        # API: Queries -> Image URLs
            7:  self._chooseBackgroundMusic,    # DB: Select music
            8:  self._chooseBackgroundVideo,    # DB: Select video
            9:  self._prepareBackgroundAssets,  # Prepare clips
            10: self._prepareCustomAssets,      # Custom overlays
            11: self._editAndRenderShort,       # Remotion/MoviePy: Render
            12: self._addYoutubeMetadata        # LLM: Generate title/description
        }

    def _generateImageSearchTerms(self):
        """Use LLM to generate image search terms from timed captions"""
        self._db_timed_image_searches = gpt_editing.getImageQueryPairs(
            self._db_timed_captions, n=self._db_num_images
        )
```

### Pattern C: Text + Image Interleaving (shortrocity)

**Output Format:**

```
[Description of a background image]
Narrator: "One sentence of narration"

[Description of a background image]
Narrator: "One sentence of narration"
```

**Parsing creates interleaved data:**

```python
data = [
    {"type": "image", "description": "background image description"},
    {"type": "text", "content": "narration text"},
    {"type": "image", "description": "next image description"},
    {"type": "text", "content": "next narration text"},
]
```

### Pattern D: Input Schema (short-video-maker-gyori) - MCP/REST

**Location:** [vendor/short-video-maker-gyori/src/types/shorts.ts](../../../vendor/short-video-maker-gyori/src/types/shorts.ts)

```typescript
// LLM generates this structure, validated by Zod
export const sceneInput = z.object({
  text: z.string().describe('Text to be spoken in the video'),
  searchTerms: z
    .array(z.string())
    .describe(
      'Search term for video, 1 word, and at least 2-3 search terms should be provided for each scene. Make sure to match the overall context with the word.'
    ),
});

export const createShortInput = z.object({
  scenes: z.array(sceneInput).describe('Each scene to be created'),
  config: renderConfig.describe('Configuration for rendering the video'),
});
```

**MCP Tool Definition:** [vendor/short-video-maker-gyori/src/server/routers/mcp.ts](../../../vendor/short-video-maker-gyori/src/server/routers/mcp.ts)

```typescript
this.mcpServer.tool(
  'create-short-video',
  'Create a short video from a list of scenes',
  {
    scenes: z.array(sceneInput).describe('Each scene to be created'),
    config: renderConfig.describe('Configuration for rendering the video'),
  },
  async ({ scenes, config }) => {
    const videoId = await this.shortCreator.addToQueue(scenes, config);
    return { content: [{ type: 'text', text: videoId }] };
  }
);
```

---

## 5. Search Term Generation

### Pattern A: Direct JSON Array (MoneyPrinterTurbo)

**Prompt:** [vendor/MoneyPrinterTurbo/app/services/llm.py#L406-L430](../../../vendor/MoneyPrinterTurbo/app/services/llm.py)

```python
prompt = f"""
# Role: Video Search Terms Generator

## Goals:
Generate {amount} search terms for stock videos, depending on the subject of a video.

## Constrains:
1. the search terms are to be returned as a json-array of strings.
2. each search term should consist of 1-3 words, always add the main subject of the video.
3. you must only return the json-array of strings. you must not return anything else.
4. the search terms must be related to the subject of the video.
5. reply with english search terms only.

## Output Example:
["search term 1", "search term 2", "search term 3","search term 4","search term 5"]

## Context:
### Video Subject
{video_subject}

### Video Script
{video_script}
"""
```

### Pattern B: Image Prompts for AI Generation (MoneyPrinterV2)

**Location:** [vendor/MoneyPrinterV2/src/classes/YouTube.py#L192-L244](../../../vendor/MoneyPrinterV2/src/classes/YouTube.py)

````python
def generate_prompts(self) -> List[str]:
    n_prompts = len(self.script) / 3  # ~1 image per 3 characters

    prompt = f"""
    Generate {n_prompts} Image Prompts for AI Image Generation,
    depending on the subject of a video.
    Subject: {self.subject}

    The image prompts are to be returned as a JSON-Array of strings.

    Each search term should consist of a full sentence,
    always add the main subject of the video.

    Be emotional and use interesting adjectives to make the
    Image Prompt as detailed as possible.

    YOU MUST ONLY RETURN THE JSON-ARRAY OF STRINGS.

    Here is an example of a JSON-Array of strings:
    ["image prompt 1", "image prompt 2", "image prompt 3"]

    For context, here is the full text:
    {self.script}
    """

    completion = str(self.generate_response(prompt, model=parse_model(get_image_prompt_llm()))) \
        .replace("```json", "") \
        .replace("```", "")

    # Parse with fallback
    try:
        image_prompts = json.loads(completion)
    except:
        r = re.compile(r"\[.*\]")
        image_prompts = r.findall(completion)
````

### Pattern C: Timed Queries with Timestamps (ShortGPT)

**Prompt:** See `editing_generate_images.yaml` above

**Output:**

```json
{
  "image_queries": [
    { "timestamp": 1.0, "query": "happy person" },
    { "timestamp": 3.2, "query": "red car" },
    { "timestamp": 5.5, "query": "city skyline" }
  ]
}
```

---

## 6. Key Patterns Summary

### Prompt Template Best Practices

| Pattern                 | Pros                                  | Cons                   | Use When                         |
| ----------------------- | ------------------------------------- | ---------------------- | -------------------------------- |
| **YAML files**          | Versioned, reusable, clean separation | Extra file I/O         | Many prompts, multiple languages |
| **F-strings**           | Simple, inline context                | Hard to version, messy | Quick prototypes                 |
| **LangChain templates** | Type-safe, structured output          | Heavy dependency       | Production apps                  |

### LLM Abstraction Recommendations

1. **Use Abstract Base Class** (viralfactory pattern) for extensibility
2. **Support JSON mode natively** where available (OpenAI, Gemini)
3. **Config-driven provider selection** (MoneyPrinterTurbo)
4. **Fallback chain**: Gemini → OpenAI → Local (ShortGPT)

### Structured Output Best Practices

1. **Always specify JSON schema in prompt** with example
2. **Use regex fallback** for extracting JSON from messy responses
3. **Implement retry loops** (3-5 attempts) with validation
4. **Validate structure** before using (check required keys exist)
5. **Consider LangChain structured output** for type safety

### Scene Generation Recommendations

1. **Generate from timed captions** (post-TTS, post-Whisper)
2. **4-5 second segments** for video search terms
3. **Multiple search alternatives** (3 per segment) for fallback
4. **Validate time ranges** against actual audio duration

---

## 7. File Reference Index

| Repo                        | Key File                                   | Purpose                               |
| --------------------------- | ------------------------------------------ | ------------------------------------- |
| ShortGPT                    | `shortGPT/gpt/gpt_utils.py`                | LLM completion, YAML loading          |
| ShortGPT                    | `shortGPT/prompt_templates/*.yaml`         | All prompt templates                  |
| ShortGPT                    | `shortGPT/gpt/gpt_editing.py`              | Image/video query generation          |
| ShortGPT                    | `shortGPT/engine/content_short_engine.py`  | Full pipeline orchestration           |
| MoneyPrinterTurbo           | `app/services/llm.py`                      | Multi-provider LLM, script generation |
| viralfactory                | `src/engines/LLMEngine/BaseLLMEngine.py`   | Abstract LLM interface                |
| viralfactory                | `src/engines/LLMEngine/OpenaiLLMEngine.py` | OpenAI with JSON mode                 |
| viralfactory                | `src/utils/prompting.py`                   | YAML prompt loader                    |
| short-video-maker-gyori     | `src/types/shorts.ts`                      | Zod schemas for scenes                |
| short-video-maker-gyori     | `src/server/routers/mcp.ts`                | MCP tool definitions                  |
| shortrocity                 | `main.py`                                  | Inline prompts, GPT-4                 |
| shortrocity                 | `narration.py`                             | Text/image interleave parsing         |
| AI-Youtube-Shorts-Generator | `Components/LanguageTasks.py`              | LangChain structured output           |
| MoneyPrinterV2              | `src/classes/YouTube.py`                   | Script + image prompt generation      |

---

## 8. Recommendations for content-machine

### Prompt System

```yaml
# Use ShortGPT pattern: prompt_templates/*.yaml
# Location: src/prompts/

# Structure:
system_prompt: |
  Role definition...
  Constraints...
  Output format specification...

chat_prompt: |
  Context: <<CONTEXT>>
  Task: <<TASK>>
```

### LLM Abstraction

```typescript
// Use viralfactory pattern with TypeScript
interface LLMProvider {
  generate(options: {
    systemPrompt: string;
    chatPrompt: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }): Promise<string | Record<string, unknown>>;
}

// Implementations: OpenAI, Gemini, Ollama, Anthropic
```

### Structured Output

```typescript
// Use Zod for validation (short-video-maker-gyori pattern)
import { z } from 'zod';

const ScriptOutputSchema = z.object({
  scenes: z.array(
    z.object({
      text: z.string(),
      searchTerms: z.array(z.string()).min(2).max(5),
      duration: z.number().optional(),
    })
  ),
  title: z.string().max(100),
  description: z.string().max(500),
});

// Parse with retry
async function parseWithRetry<T>(
  response: string,
  schema: z.ZodSchema<T>,
  maxRetries = 3
): Promise<T> {
  // Try direct parse
  // Try regex extraction
  // Retry with prompt feedback
}
```

### Scene Generation Flow

```
1. User provides topic/source material
2. LLM generates script (text only)
3. TTS converts script to audio
4. Whisper transcribes to timed captions
5. LLM generates search terms from captions (per 4-5s segment)
6. Pexels/Unsplash fetches videos/images
7. Remotion renders final video
```
