# Configuration Systems Research Report

**Date:** 2026-01-04  
**Type:** Research / Pattern Analysis  
**Status:** Complete

---

## Executive Summary

This report analyzes configuration patterns across 12+ vendored video generation repositories. Key findings:

1. **TOML + Python dict** (MoneyPrinterTurbo) - Most feature-complete for multi-provider LLM/TTS
2. **Pydantic BaseSettings** (kokoro-fastapi) - Best type safety + env var integration
3. **TypeScript class + dotenv** (short-video-maker-gyori) - Clean TypeScript pattern
4. **Zod schemas** (vidosy) - Best for runtime validation of video configs
5. **Database-backed config** (ShortGPT) - Best for dynamic API key management

---

## Repository Analysis

### 1. MoneyPrinterTurbo

**Pattern:** TOML config file + Python dict access

**File Paths:**

- [config.example.toml](../../../vendor/MoneyPrinterTurbo/config.example.toml)
- [app/config/config.py](../../../vendor/MoneyPrinterTurbo/app/config/config.py)
- [app/services/llm.py](../../../vendor/MoneyPrinterTurbo/app/services/llm.py)

**Config Loading Pattern:**

```python
# app/config/config.py
import toml
from loguru import logger

root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
config_file = f"{root_dir}/config.toml"

def load_config():
    if not os.path.isfile(config_file):
        example_file = f"{root_dir}/config.example.toml"
        if os.path.isfile(example_file):
            shutil.copyfile(example_file, config_file)
            logger.info("copy config.example.toml to config.toml")

    logger.info(f"load config from file: {config_file}")
    _config_ = toml.load(config_file)
    return _config_

_cfg = load_config()
app = _cfg.get("app", {})
whisper = _cfg.get("whisper", {})
proxy = _cfg.get("proxy", {})
azure = _cfg.get("azure", {})
```

**Multi-Provider LLM Pattern:**

```python
# app/services/llm.py
def _generate_response(prompt: str) -> str:
    llm_provider = config.app.get("llm_provider", "openai")

    if llm_provider == "moonshot":
        api_key = config.app.get("moonshot_api_key")
        model_name = config.app.get("moonshot_model_name")
        base_url = "https://api.moonshot.cn/v1"
    elif llm_provider == "ollama":
        api_key = "ollama"
        model_name = config.app.get("ollama_model_name")
        base_url = config.app.get("ollama_base_url", "http://localhost:11434/v1")
    elif llm_provider == "openai":
        api_key = config.app.get("openai_api_key")
        model_name = config.app.get("openai_model_name")
        base_url = config.app.get("openai_base_url", "https://api.openai.com/v1")
    elif llm_provider == "azure":
        api_key = config.app.get("azure_api_key")
        model_name = config.app.get("azure_model_name")
        base_url = config.app.get("azure_base_url", "")
        api_version = config.app.get("azure_api_version", "2024-02-15-preview")
    # ... 10+ more providers
```

**TOML Config Structure:**

```toml
[app]
llm_provider = "openai"  # openai, moonshot, azure, qwen, deepseek, gemini, ollama, g4f, oneapi, cloudflare, ernie, modelscope
video_source = "pexels"  # pexels, pixabay
pexels_api_keys = []     # Array for rate limit avoidance
pixabay_api_keys = []

# Per-provider settings
openai_api_key = ""
openai_base_url = ""
openai_model_name = "gpt-4o-mini"

moonshot_api_key = ""
moonshot_base_url = "https://api.moonshot.cn/v1"
moonshot_model_name = "moonshot-v1-8k"

# Whisper settings
subtitle_provider = "edge"  # edge, whisper

[whisper]
model_size = "large-v3"
device = "CPU"
compute_type = "int8"

[azure]
speech_key = ""
speech_region = ""

[proxy]
http = ""
https = ""
```

**Strengths:**

- Excellent multi-provider support (12+ LLM providers)
- TOML is human-readable
- Supports array values for API key rotation
- Section-based organization (`[app]`, `[whisper]`, `[azure]`)
- Auto-copy from example file

**Weaknesses:**

- No type validation
- Dictionary access pattern (`config.app.get("key")`) - typo-prone
- No environment variable override support
- Global mutable state

---

### 2. short-video-maker-gyori

**Pattern:** TypeScript class + dotenv

**File Paths:**

- [.env.example](../../../vendor/short-video-maker-gyori/.env.example)
- [src/config.ts](../../../vendor/short-video-maker-gyori/src/config.ts)

**Config Class Pattern:**

```typescript
// src/config.ts
import path from 'path';
import 'dotenv/config'; // Auto-loads .env
import os from 'os';
import fs from 'fs-extra';
import pino from 'pino';
import { kokoroModelPrecision, whisperModels } from './types/shorts';

const defaultLogLevel: pino.Level = 'info';
const defaultPort = 3123;
const defaultWhisperModel: whisperModels = 'medium.en';

export class Config {
  private dataDirPath: string;
  private libsDirPath: string;

  public pexelsApiKey: string;
  public logLevel: pino.Level;
  public whisperVerbose: boolean;
  public port: number;
  public runningInDocker: boolean;
  public devMode: boolean;
  public whisperModel: whisperModels = defaultWhisperModel;
  public kokoroModelPrecision: kokoroModelPrecision = 'fp32';
  public concurrency?: number;
  public videoCacheSizeInBytes: number | null = null;

  constructor() {
    this.dataDirPath =
      process.env.DATA_DIR_PATH || path.join(os.homedir(), '.ai-agents-az-video-generator');

    // Ensure directories exist
    fs.ensureDirSync(this.dataDirPath);
    fs.ensureDirSync(this.libsDirPath);

    // Load from environment variables with defaults
    this.pexelsApiKey = process.env.PEXELS_API_KEY as string;
    this.logLevel = (process.env.LOG_LEVEL || defaultLogLevel) as pino.Level;
    this.whisperVerbose = process.env.WHISPER_VERBOSE === 'true';
    this.port = process.env.PORT ? parseInt(process.env.PORT) : defaultPort;
    this.runningInDocker = process.env.DOCKER === 'true';
    this.devMode = process.env.DEV === 'true';

    if (process.env.WHISPER_MODEL) {
      this.whisperModel = process.env.WHISPER_MODEL as whisperModels;
    }
    if (process.env.KOKORO_MODEL_PRECISION) {
      this.kokoroModelPrecision = process.env.KOKORO_MODEL_PRECISION as kokoroModelPrecision;
    }
    if (process.env.CONCURRENCY) {
      this.concurrency = parseInt(process.env.CONCURRENCY);
    }
  }

  public ensureConfig() {
    if (!this.pexelsApiKey) {
      throw new Error(
        'PEXELS_API_KEY environment variable is missing. Get your free API key: https://www.pexels.com/api/key/'
      );
    }
  }
}
```

**.env.example:**

```dotenv
PEXELS_API_KEY=     # crucial for the project to work
LOG_LEVEL=trace     # trace, debug, info, warn, error, fatal, silent
WHISPER_VERBOSE=true
PORT=3123
DEV=true            # local development mode
DATA_DIR_PATH=      # only for docker, otherwise leave empty
```

**Strengths:**

- Type-safe (TypeScript types)
- Environment variable based (12-factor app)
- Directory auto-creation on init
- Validation method (`ensureConfig()`)
- Clean singleton pattern

**Weaknesses:**

- No runtime validation (uses `as` casts)
- Limited multi-provider support
- Boolean parsing requires manual `=== "true"` checks

---

### 3. kokoro-fastapi (TTS Engine)

**Pattern:** Pydantic BaseSettings

**File Paths:**

- [api/src/core/config.py](../../../vendor/audio/kokoro-fastapi/api/src/core/config.py)

**BaseSettings Pattern:**

```python
# api/src/core/config.py
import torch
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API Settings
    api_title: str = "Kokoro TTS API"
    api_description: str = "API for text-to-speech generation using Kokoro"
    api_version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8880

    # Application Settings
    output_dir: str = "output"
    output_dir_size_limit_mb: float = 500.0
    default_voice: str = "af_heart"
    use_gpu: bool = True
    device_type: str | None = None  # Auto-detected: "cuda", "mps", "cpu"

    # Container paths
    model_dir: str = "/app/api/src/models"
    voices_dir: str = "/app/api/src/voices/v1_0"

    # Audio Settings
    sample_rate: int = 24000
    default_volume_multiplier: float = 1.0

    # Text Processing
    target_min_tokens: int = 175
    target_max_tokens: int = 250
    absolute_max_tokens: int = 450
    advanced_text_normalization: bool = True

    # Gap trimming (streaming)
    gap_trim_ms: int = 1
    dynamic_gap_trim_padding_ms: int = 410
    dynamic_gap_trim_padding_char_multiplier: dict[str, float] = {
        ".": 1, "!": 0.9, "?": 1, ",": 0.8,
    }

    # Web Player
    enable_web_player: bool = True
    cors_origins: list[str] = ["*"]
    cors_enabled: bool = True

    class Config:
        env_file = ".env"

    def get_device(self) -> str:
        """Auto-detect compute device"""
        if not self.use_gpu:
            return "cpu"
        if self.device_type:
            return self.device_type
        if torch.backends.mps.is_available():
            return "mps"
        elif torch.cuda.is_available():
            return "cuda"
        return "cpu"


settings = Settings()
```

**Strengths:**

- Full type validation at runtime
- Auto-loads from `.env` file
- Environment variable override (auto: `PORT=8080` overrides `port`)
- Complex types supported (dict, list)
- Device auto-detection method
- Best practice Python pattern

**Weaknesses:**

- Requires `pydantic-settings` dependency
- Singleton at module level (testing challenges)

---

### 4. vidosy

**Pattern:** Zod schemas + JSON config files

**File Paths:**

- [src/shared/zod-schema.ts](../../../templates/vidosy/src/shared/zod-schema.ts)
- [src/shared/constants.ts](../../../templates/vidosy/src/shared/constants.ts)
- [demo-vidosy.json](../../../templates/vidosy/demo-vidosy.json)

**Zod Schema Pattern:**

```typescript
// src/shared/zod-schema.ts
import { z } from 'zod';

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

export const videoSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  fps: z.number().positive(),
  duration: z.number().positive(),
});

export const vidosyConfigSchema = z.object({
  video: videoSchema,
  scenes: z.array(sceneSchema).min(1),
  audio: audioSchema.optional(),
  output: outputSchema.optional(),
});

// Type exports (auto-inferred from schema)
export type VidosyConfig = z.infer<typeof vidosyConfigSchema>;
export type SceneConfig = z.infer<typeof sceneSchema>;
```

**Constants Pattern:**

```typescript
// src/shared/constants.ts
export const VIDEO_QUALITY_PRESETS = {
  low: { width: 1280, height: 720, fps: 24, bitrate: 1000000 },
  medium: { width: 1920, height: 1080, fps: 30, bitrate: 5000000 },
  high: { width: 1920, height: 1080, fps: 60, bitrate: 10000000 },
} as const;

export const DEFAULT_VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 10,
} as const;

export const DEFAULT_TEXT_CONFIG = {
  fontSize: 48,
  color: '#ffffff',
  position: 'center' as const,
} as const;

export const FILE_SIZE_LIMITS = {
  image: 50 * 1024 * 1024, // 50MB
  audio: 100 * 1024 * 1024, // 100MB
  video: 500 * 1024 * 1024, // 500MB
} as const;
```

**JSON Config File:**

```json
{
  "video": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "duration": 14
  },
  "audio": {
    "background": "my-background-music.mp3",
    "volume": 0.4,
    "fadeIn": 2,
    "fadeOut": 3
  },
  "scenes": [
    {
      "id": "intro",
      "duration": 5,
      "background": { "type": "image", "value": "my-intro-background.png" },
      "text": {
        "content": "Welcome to Vidosy",
        "fontSize": 72,
        "color": "#ffffff",
        "position": "center"
      }
    }
  ]
}
```

**Strengths:**

- Runtime validation with detailed error messages
- Auto-generated TypeScript types from schemas
- JSON configs are portable/serializable
- Constraint validation (min, max, regex)
- Preset system for common configurations

**Weaknesses:**

- No environment variable integration
- Requires Zod parsing call on every load
- Verbose for simple configs

---

### 5. ShortGPT

**Pattern:** dotenv + Database-backed API key management

**File Paths:**

- [shortGPT/config/config.py](../../../vendor/ShortGPT/shortGPT/config/config.py)
- [shortGPT/config/api_db.py](../../../vendor/ShortGPT/shortGPT/config/api_db.py)
- [shortGPT/database/db_document.py](../../../vendor/ShortGPT/shortGPT/database/db_document.py)

**API Key Manager Pattern:**

```python
# shortGPT/config/api_db.py
import enum
import os
from shortGPT.database.db_document import TinyMongoDocument
from dotenv import load_dotenv

load_dotenv('./.env')

class ApiProvider(enum.Enum):
    OPENAI = "OPENAI_API_KEY"
    GEMINI = "GEMINI_API_KEY"
    ELEVEN_LABS = "ELEVENLABS_API_KEY"
    PEXELS = "PEXELS_API_KEY"


class ApiKeyManager:
    api_key_doc_manager = TinyMongoDocument("api_db", "api_keys", "key_doc", create=True)

    @classmethod
    def get_api_key(cls, key: str | ApiProvider):
        if isinstance(key, ApiProvider):
            key = key.value

        # Priority 1: Check database
        api_key = cls.api_key_doc_manager._get(key)
        if api_key:
            return api_key

        # Priority 2: Check environment variables
        env_key = key.replace(" ", "_").upper()
        api_key = os.environ.get(env_key)
        if api_key:
            return api_key

        return ""

    @classmethod
    def set_api_key(cls, key: str | ApiProvider, value: str):
        if isinstance(key, ApiProvider):
            key = key.value
        return cls.api_key_doc_manager._save({key: value})
```

**TinyMongo Document Pattern:**

```python
# shortGPT/database/db_document.py
import tinydb
import tinymongo as tm

class TinyMongoClient(tm.TinyMongoClient):
    @property
    def _storage(self):
        return tinydb.storages.JSONStorage


TINY_MONGO_DATABASE = TinyMongoClient("./.database")


class TinyMongoDocument:
    _lock = threading.Lock()

    def __init__(self, db_name: str, collection_name: str, document_id: str, create=False):
        self.collection = TINY_MONGO_DATABASE[db_name][collection_name]
        self.document_id = document_id
        if not self.exists():
            if create:
                self.collection.insert_one({"_id": document_id})

    def _save(self, data):
        with self._lock:
            update_data = {'$set': {}}
            for key, value in data.items():
                update_data['$set'][key] = value
            self.collection.update_one({'_id': self.document_id}, update_data)

    def _get(self, key=None):
        with self._lock:
            document = self.collection.find_one({'_id': self.document_id})
            if not key:
                del document['_id']
                return document
            return document.get(key)
```

**Strengths:**

- Runtime-modifiable API keys (GUI-friendly)
- Fallback chain: Database → Environment → Empty
- Thread-safe with locks
- Enum-based provider types
- Persistent storage in JSON file

**Weaknesses:**

- Complex for simple use cases
- File-based "database" not production-ready
- No validation on stored values

---

### 6. pydantic-ai Providers

**Pattern:** Per-provider environment variable conventions

**File Paths:**

- [pydantic_ai_slim/pydantic_ai/providers/openai.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/providers/openai.py)
- [pydantic_ai_slim/pydantic_ai/providers/anthropic.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/providers/anthropic.py)
- [pydantic_ai_slim/pydantic_ai/settings.py](../../../vendor/agents/pydantic-ai/pydantic_ai_slim/pydantic_ai/settings.py)

**Provider Pattern:**

```python
# providers/openai.py
class OpenAIProvider(Provider[AsyncOpenAI]):
    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        openai_client: AsyncOpenAI | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        # Fallback for local models that don't need API key
        if api_key is None and 'OPENAI_API_KEY' not in os.environ and base_url is not None:
            api_key = 'api-key-not-set'

        if openai_client is not None:
            assert base_url is None, 'Cannot provide both `openai_client` and `base_url`'
            self._client = openai_client
        else:
            http_client = cached_async_http_client(provider='openai')
            self._client = AsyncOpenAI(base_url=base_url, api_key=api_key, http_client=http_client)


# providers/anthropic.py
class AnthropicProvider(Provider[AsyncAnthropicClient]):
    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        anthropic_client: AsyncAnthropicClient | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        if anthropic_client is not None:
            self._client = anthropic_client
        else:
            api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
            if not api_key:
                raise UserError(
                    'Set the `ANTHROPIC_API_KEY` environment variable or pass via `AnthropicProvider(api_key=...)`'
                )
            self._client = AsyncAnthropic(api_key=api_key, base_url=base_url, http_client=http_client)
```

**ModelSettings Pattern:**

```python
# settings.py
from typing_extensions import TypedDict

class ModelSettings(TypedDict, total=False):
    """Settings that apply to multiple models/providers."""

    max_tokens: int
    temperature: float
    top_p: float
    timeout: float | Timeout
    parallel_tool_calls: bool
    seed: int
    presence_penalty: float
    frequency_penalty: float
    logit_bias: dict[str, int]
    stop_sequences: list[str]
    extra_headers: dict[str, str]
    extra_body: object


def merge_model_settings(base: ModelSettings | None, overrides: ModelSettings | None) -> ModelSettings | None:
    """Merge settings, preferring overrides."""
    if base and overrides:
        return base | overrides
    return base or overrides
```

**Strengths:**

- Convention-based env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)
- Graceful fallback for local models
- TypedDict for partial settings
- Settings merge utility for layered overrides
- Client injection pattern for testing

**Weaknesses:**

- No centralized config object
- Each provider has different validation logic

---

### 7. open-deep-research (LangGraph)

**Pattern:** Pydantic BaseModel + RunnableConfig integration

**File Path:**

- [src/open_deep_research/configuration.py](../../../vendor/research/open-deep-research/src/open_deep_research/configuration.py)

**LangGraph Configuration Pattern:**

```python
# configuration.py
from enum import Enum
from typing import Any, Optional
from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel, Field


class SearchAPI(Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    TAVILY = "tavily"
    NONE = "none"


class Configuration(BaseModel):
    # With UI metadata for frontend generation
    max_structured_output_retries: int = Field(
        default=3,
        metadata={
            "x_oap_ui_config": {
                "type": "number",
                "default": 3,
                "min": 1,
                "max": 10,
                "description": "Maximum retries for structured output calls"
            }
        }
    )

    search_api: SearchAPI = Field(
        default=SearchAPI.TAVILY,
        metadata={
            "x_oap_ui_config": {
                "type": "select",
                "default": "tavily",
                "options": [
                    {"label": "Tavily", "value": "tavily"},
                    {"label": "OpenAI", "value": "openai"},
                    {"label": "Anthropic", "value": "anthropic"},
                ]
            }
        }
    )

    research_model: str = Field(
        default="openai:gpt-4.1",
        metadata={
            "x_oap_ui_config": {
                "type": "text",
                "default": "openai:gpt-4.1",
                "description": "Model for research"
            }
        }
    )

    @classmethod
    def from_runnable_config(cls, config: Optional[RunnableConfig] = None) -> "Configuration":
        """Create from LangGraph RunnableConfig with env var fallback."""
        configurable = config.get("configurable", {}) if config else {}
        field_names = list(cls.model_fields.keys())

        values: dict[str, Any] = {
            field_name: os.environ.get(field_name.upper(), configurable.get(field_name))
            for field_name in field_names
        }
        return cls(**{k: v for k, v in values.items() if v is not None})
```

**Strengths:**

- UI metadata for auto-generating config forms
- LangGraph `RunnableConfig` integration
- Environment variable fallback
- Enum-based provider selection
- Self-documenting with Field descriptions

**Weaknesses:**

- Complex metadata structure
- LangGraph-specific pattern

---

### 8. YASGU (JSON Config)

**Pattern:** JSON config file + getter functions

**File Paths:**

- [config/config.example.json](../../../vendor/YASGU/config/config.example.json)
- [src/utils/config.py](../../../vendor/YASGU/src/utils/config.py)

**JSON Config:**

```json
{
  "verbose": true,
  "headless": false,
  "threads": 4,
  "assembly_ai_api_key": "xx",
  "imagemagick_path": "C:\\Program Files\\ImageMagick\\magick.exe",
  "generators": [
    {
      "id": 1,
      "language": "English",
      "subject": "Facts about a random animal",
      "llm": "dolphin_mixtral_8x7b",
      "image_model": "lexica",
      "images_count": 10,
      "font": "bold_font.ttf",
      "subtitles_font_size": 110,
      "audio_song_volume": 0.1
    }
  ]
}
```

**Getter Pattern:**

```python
# src/utils/config.py
import json
import os

ROOT_DIR = os.path.dirname(sys.path[0])

def get_verbose() -> bool:
    with open(os.path.join(ROOT_DIR, "config/config.json"), "r") as file:
        return json.load(file)["verbose"]

def get_threads() -> int:
    with open(os.path.join(ROOT_DIR, "config/config.json"), "r") as file:
        return json.load(file)["threads"]

def get_assemblyai_api_key() -> str:
    with open(os.path.join(ROOT_DIR, "config/config.json"), "r") as file:
        return json.load(file)["assembly_ai_api_key"]

def get_generators() -> list:
    with open(os.path.join(ROOT_DIR, "config/config.json"), "r") as file:
        return json.load(file)["generators"]
```

**Strengths:**

- Simple JSON format
- Supports arrays of generators (batch processing)
- Per-generator configuration

**Weaknesses:**

- File read on every getter call (inefficient)
- No validation
- No type hints
- No environment variable support

---

### 9. moviepy

**Pattern:** dotenv + environment variable with auto-detection

**File Path:**

- [moviepy/config.py](../../../vendor/video-processing/moviepy/moviepy/config.py)

**Binary Detection Pattern:**

```python
# moviepy/config.py
import os
import subprocess as sp

try:
    from dotenv import find_dotenv, load_dotenv
    DOTENV = find_dotenv()
    load_dotenv(DOTENV)
except ImportError:
    DOTENV = None

FFMPEG_BINARY = os.getenv("FFMPEG_BINARY", "ffmpeg-imageio")
FFPLAY_BINARY = os.getenv("FFPLAY_BINARY", "auto-detect")


def try_cmd(cmd):
    """Verify command works on this OS"""
    try:
        proc = sp.Popen(cmd, stdout=sp.PIPE, stderr=sp.PIPE, stdin=sp.DEVNULL)
        proc.communicate()
    except Exception as err:
        return False, err
    return True, None


if FFMPEG_BINARY == "ffmpeg-imageio":
    from imageio.plugins.ffmpeg import get_exe
    FFMPEG_BINARY = get_exe()
elif FFMPEG_BINARY == "auto-detect":
    if try_cmd(["ffmpeg"])[0]:
        FFMPEG_BINARY = "ffmpeg"
    elif not IS_POSIX_OS and try_cmd(["ffmpeg.exe"])[0]:
        FFMPEG_BINARY = "ffmpeg.exe"
    else:
        FFMPEG_BINARY = "unset"
```

**Strengths:**

- Graceful dotenv import (optional dependency)
- Multiple detection strategies (imageio, auto-detect, explicit)
- Platform-aware (.exe on Windows)
- Verification of binary availability

**Weaknesses:**

- Limited to binary paths
- No structured configuration

---

### 10. short-video-maker-leke

**Pattern:** Python constants + hardcoded paths

**File Path:**

- [agent/config.py](../../../vendor/short-video-maker-leke/agent/config.py)

**Constants Pattern:**

```python
# agent/config.py
import os

HOME_DIR = os.path.expanduser("~")

# Model names
PLANNER_MODEL = "gemini-2.5-flash"
IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation"
TTS_MODEL = "gemini-2.5-flash-preview-tts"

# TTS Settings
TTS_SUPPORTED_LANGUAGES = {
    'arabic', 'german', 'english', 'spanish', 'french', 'hindi',
    'japanese', 'korean', 'portuguese', 'russian', ...
}

TTS_VOICES = [
    'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', ...
]

TTS_RANDOM_VOICE = True
TTS_DEFAULT_VOICE = 'Kore'

# File Paths
OUTPUT_DIR = "output"
DB_FILE = os.path.join(OUTPUT_DIR, "projects.sqlite")

# Rate Limiting
TTS_DELAY_S = 21       # 3 RPM -> 20s delay
IMAGE_DELAY_S = 7      # 10 RPM -> 6s delay

# Video Composition
VIDEO_DIMENSIONS = (1080, 1920)  # 9:16
MUSIC_VOLUME = 0.15

# Font mappings per language
FONT_MAPPINGS = {
    "default": {
        "intro": os.path.join(HOME_DIR, 'Library/Fonts/google-fonts/ofl/poppins/Poppins-Regular.ttf'),
        "challenge": os.path.join(HOME_DIR, 'Library/Fonts/google-fonts/ofl/poppins/Poppins-ExtraBold.ttf'),
    },
    "arabic": {
        "intro": os.path.join(HOME_DIR, 'Library/Fonts/google-fonts/ofl/notosansarabic/NotoSansArabic[wdth,wght].ttf'),
    },
    # ... more languages
}
```

**Strengths:**

- Simple, no dependencies
- Comprehensive language/font mappings
- Rate limit documentation inline
- Tuple for dimensions (typed)

**Weaknesses:**

- No environment variable override
- Hardcoded paths (macOS-specific)
- Requires code changes to modify

---

## Pattern Comparison Matrix

| Repo                    | Pattern                   | Type Safety | Env Vars      | Multi-Provider | Validation      | Persistence |
| ----------------------- | ------------------------- | ----------- | ------------- | -------------- | --------------- | ----------- |
| MoneyPrinterTurbo       | TOML + dict               | ❌          | ❌            | ✅ 12+ LLMs    | ❌              | ✅ File     |
| short-video-maker-gyori | TS Class + dotenv         | ✅          | ✅            | ❌             | ⚠️ Manual       | ❌          |
| kokoro-fastapi          | Pydantic BaseSettings     | ✅          | ✅ Auto       | ❌             | ✅              | ❌          |
| vidosy                  | Zod schemas               | ✅          | ❌            | ❌             | ✅              | ✅ JSON     |
| ShortGPT                | DB + dotenv               | ⚠️ Enum     | ✅            | ⚠️ 4 providers | ❌              | ✅ TinyDB   |
| pydantic-ai             | Provider classes          | ✅          | ✅ Convention | ✅ 20+         | ⚠️ Per-provider | ❌          |
| open-deep-research      | Pydantic + RunnableConfig | ✅          | ✅            | ✅             | ✅              | ❌          |
| YASGU                   | JSON + getters            | ❌          | ❌            | ⚠️             | ❌              | ✅ JSON     |
| moviepy                 | dotenv + auto-detect      | ❌          | ✅            | ❌             | ❌              | ❌          |

---

## Recommendations for content-machine

### Recommended Pattern: Hybrid Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                    Configuration Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   .env file      │───▶│ Pydantic         │                   │
│  │  (secrets only)  │    │ BaseSettings     │                   │
│  └──────────────────┘    │ (type-safe)      │                   │
│                          └────────┬─────────┘                   │
│                                   │                              │
│  ┌──────────────────┐             │                              │
│  │  config.toml     │─────────────┤                              │
│  │ (app settings)   │             │                              │
│  └──────────────────┘             ▼                              │
│                          ┌──────────────────┐                   │
│                          │  Merged Config   │                   │
│                          │  (validated)     │                   │
│                          └────────┬─────────┘                   │
│                                   │                              │
│         ┌─────────────────────────┼─────────────────────────┐   │
│         ▼                         ▼                         ▼   │
│  ┌─────────────┐          ┌─────────────┐          ┌────────────┐
│  │ LLM Config  │          │ TTS Config  │          │Video Config│
│  │ (provider)  │          │ (provider)  │          │ (Zod)      │
│  └─────────────┘          └─────────────┘          └────────────┘
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Proposed Implementation

**1. Base Settings (Python):**

```python
# src/config/settings.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from enum import Enum

class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    OLLAMA = "ollama"

class TTSProvider(str, Enum):
    EDGE = "edge"
    KOKORO = "kokoro"
    ELEVENLABS = "elevenlabs"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM Configuration
    llm_provider: LLMProvider = LLMProvider.OPENAI
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    # TTS Configuration
    tts_provider: TTSProvider = TTSProvider.EDGE
    elevenlabs_api_key: str | None = None

    # Video Configuration
    pexels_api_key: str
    video_source: str = "pexels"

    # Paths
    output_dir: str = "output"
    temp_dir: str = "temp"

settings = Settings()
```

**2. Video Config Schema (TypeScript/Zod):**

```typescript
// src/config/video-schema.ts
import { z } from 'zod';

export const videoConfigSchema = z.object({
  width: z.number().positive().default(1080),
  height: z.number().positive().default(1920),
  fps: z.number().positive().default(30),
  scenes: z.array(sceneSchema).min(1),
  audio: audioConfigSchema.optional(),
});
```

### Key Takeaways

1. **Secrets in .env, settings in TOML** - Separation of concerns
2. **Pydantic BaseSettings for Python** - Best type safety + env var integration
3. **Zod schemas for video configs** - Runtime validation + TypeScript types
4. **Provider pattern from pydantic-ai** - Clean multi-provider abstraction
5. **Avoid ShortGPT's database pattern** - Overkill for most use cases
6. **Avoid YASGU's per-call file reads** - Performance anti-pattern

---

## Appendix: Environment Variable Conventions

| Provider   | Env Var              | Used By                                  |
| ---------- | -------------------- | ---------------------------------------- |
| OpenAI     | `OPENAI_API_KEY`     | pydantic-ai, ShortGPT, MoneyPrinterTurbo |
| Anthropic  | `ANTHROPIC_API_KEY`  | pydantic-ai                              |
| Gemini     | `GEMINI_API_KEY`     | ShortGPT                                 |
| Pexels     | `PEXELS_API_KEY`     | short-video-maker-gyori, ShortGPT        |
| ElevenLabs | `ELEVENLABS_API_KEY` | ShortGPT                                 |
| FFmpeg     | `FFMPEG_BINARY`      | moviepy                                  |
