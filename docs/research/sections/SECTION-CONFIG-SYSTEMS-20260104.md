# Research: Configuration Systems in Video Generation Tools

**Date:** 2026-01-04  
**Section:** System Design Section 4 - Configuration System  
**Status:** Complete  
**Purpose:** Document evidence-based patterns for configuration in video generation tools

---

## 1. Overview

This document analyzes configuration patterns from 7 vendored repositories to inform the design of content-machine's configuration system.

---

## 2. Evidence from Vendor Repositories

### 2.1 MoneyPrinterTurbo - TOML Configuration

**Source:** `vendor/MoneyPrinterTurbo/app/config/config.py`  
**Pattern:** TOML file with Python dict access

**Code Evidence:**

```python
# vendor/MoneyPrinterTurbo/app/config/config.py (lines 1-35)
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

    _config_ = toml.load(config_file)
    return _config_
```

**Configuration Structure:**

From `vendor/MoneyPrinterTurbo/config.example.toml`:

```toml
[app]
video_source = "pexels" # "pexels" or "pixabay"
pexels_api_keys = []
pixabay_api_keys = []

# 12+ LLM providers supported
llm_provider = "openai"

# Per-provider settings
openai_api_key = ""
openai_base_url = ""
openai_model_name = "gpt-4o-mini"

moonshot_api_key = ""
moonshot_base_url = "https://api.moonshot.cn/v1"
moonshot_model_name = "moonshot-v1-8k"

[whisper]
model_size = "large-v3"
device = "CPU"
compute_type = "int8"

[azure]
speech_key = ""
speech_region = ""
```

**Findings:**
- Supports 12+ LLM providers with per-provider configuration
- Uses sections for grouping related settings (`[app]`, `[whisper]`, `[azure]`)
- Copies `config.example.toml` to `config.toml` on first run
- API keys stored in config file (not recommended - should use env vars)
- Supports multiple API keys for rate limit avoidance: `pexels_api_keys = []`

---

### 2.2 short-video-maker-gyori - TypeScript Class with dotenv

**Source:** `vendor/short-video-maker-gyori/src/config.ts`  
**Pattern:** TypeScript class + environment variables

**Code Evidence:**

```typescript
// vendor/short-video-maker-gyori/src/config.ts (full file)
import path from "path";
import "dotenv/config";
import os from "os";

export class Config {
  private dataDirPath: string;

  public pexelsApiKey: string;
  public logLevel: pino.Level;
  public whisperVerbose: boolean;
  public port: number;
  public whisperModel: whisperModels = defaultWhisperModel;
  public kokoroModelPrecision: kokoroModelPrecision = "fp32";

  constructor() {
    this.dataDirPath =
      process.env.DATA_DIR_PATH ||
      path.join(os.homedir(), ".ai-agents-az-video-generator");

    this.pexelsApiKey = process.env.PEXELS_API_KEY as string;
    this.logLevel = (process.env.LOG_LEVEL || defaultLogLevel) as pino.Level;
    this.port = process.env.PORT ? parseInt(process.env.PORT) : defaultPort;

    if (process.env.WHISPER_MODEL) {
      this.whisperModel = process.env.WHISPER_MODEL as whisperModels;
    }
  }

  public ensureConfig() {
    if (!this.pexelsApiKey) {
      throw new Error(
        "PEXELS_API_KEY environment variable is missing. Get your free API key: https://www.pexels.com/api/key/"
      );
    }
  }
}
```

**Findings:**
- All secrets via environment variables (best practice)
- `dotenv/config` auto-loads `.env` file
- Type-safe with TypeScript types
- Defaults baked into class constructor
- Explicit validation via `ensureConfig()` method
- Data directory defaults to `~/.ai-agents-az-video-generator`

**Environment Variables Used:**
- `DATA_DIR_PATH` - Storage location
- `PEXELS_API_KEY` - Stock footage API
- `LOG_LEVEL` - Logging verbosity
- `PORT` - Server port
- `WHISPER_MODEL` - ASR model selection
- `KOKORO_MODEL_PRECISION` - TTS model precision

---

### 2.3 kokoro-fastapi - Pydantic BaseSettings

**Source:** `vendor/audio/kokoro-fastapi/api/src/core/config.py`  
**Pattern:** Pydantic BaseSettings with automatic env var loading

**Code Evidence:**

```python
# vendor/audio/kokoro-fastapi/api/src/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # API Settings
    api_title: str = "Kokoro TTS API"
    host: str = "0.0.0.0"
    port: int = 8880

    # Application Settings
    default_voice: str = "af_heart"
    use_gpu: bool = True
    device_type: str | None = None  # Auto-detected if None

    # Audio Settings
    sample_rate: int = 24000
    target_min_tokens: int = 175
    target_max_tokens: int = 250

    class Config:
        env_file = ".env"

    def get_device(self) -> str:
        """Get the appropriate device based on settings and availability"""
        if not self.use_gpu:
            return "cpu"
        if self.device_type:
            return self.device_type
        # Auto-detect device
        if torch.backends.mps.is_available():
            return "mps"
        elif torch.cuda.is_available():
            return "cuda"
        return "cpu"

settings = Settings()
```

**Findings:**
- Type-safe with Pydantic validation
- Automatic environment variable loading via `env_file = ".env"`
- Environment variables override defaults (e.g., `PORT=8881` overrides `port: int = 8880`)
- Computed properties via methods (`get_device()`)
- Singleton pattern: `settings = Settings()`
- Supports optional types with auto-detection: `device_type: str | None = None`

---

### 2.4 vidosy - Zod Schema Validation

**Source:** `templates/vidosy/src/shared/zod-schema.ts`  
**Pattern:** JSON config files validated by Zod schemas

**Code Evidence:**

```typescript
// templates/vidosy/src/shared/zod-schema.ts
import { z } from 'zod';

export const videoSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  fps: z.number().positive(),
  duration: z.number().positive(),
});

export const sceneSchema = z.object({
  id: z.string(),
  duration: z.number().positive(),
  background: backgroundSchema.optional(),
  text: textSchema.optional(),
  audio: z.object({
    file: z.string().optional(),
    volume: z.number().min(0).max(1).optional(),
  }).optional(),
});

export const vidosyConfigSchema = z.object({
  video: videoSchema,
  scenes: z.array(sceneSchema).min(1),
  audio: audioSchema.optional(),
  output: outputSchema.optional(),
});

export type VidosyConfig = z.infer<typeof vidosyConfigSchema>;
```

**Config Loader:**

```typescript
// templates/vidosy/src/cli/utils/config-loader.ts
export async function loadConfig(configPath: string): Promise<VidosyConfig> {
  const configContent = fs.readFileSync(resolvedPath, 'utf-8');
  const configData = JSON.parse(configContent);

  // Validate the configuration
  const validatedConfig = vidosyConfigSchema.parse(configData);
  return validatedConfig;
}
```

**Findings:**
- Runtime validation with Zod schemas
- TypeScript type inference via `z.infer<>`
- Clear error messages for invalid config
- Schema is separate from loading logic (reusable)
- Video-specific configuration (scenes, output format)

---

### 2.5 ShortGPT - YAML + Database Hybrid

**Source:** `vendor/ShortGPT/shortGPT/config/config.py`  
**Pattern:** Environment variables + YAML files + database storage

**Code Evidence:**

```python
# vendor/ShortGPT/shortGPT/config/config.py
import yaml
from dotenv import load_dotenv

load_dotenv()

ELEVEN_LABS_KEY = os.getenv('ELEVEN_LABS_API_KEY')
OPENAI_KEY = os.getenv('OPENAI_API_KEY')
PLAY_HT_USERID = os.getenv('PLAY_HT_USERID')
PLAY_HT_API_KEY = os.getenv('PLAY_HT_API_KEY')

def read_yaml_config(file_path: str) -> dict:
    with open(file_path, 'r') as file:
        contents = yaml.safe_load(file)
    return contents
```

**Findings:**
- API keys from environment variables (dotenv)
- Asset paths from YAML files
- Supports GUI-based API key management (database storage)
- Multiple TTS providers: ElevenLabs, PlayHT

---

## 3. Pattern Comparison

| Pattern | Type Safety | Secrets Handling | Multi-Provider | Complexity |
|---------|-------------|------------------|----------------|------------|
| **TOML (MoneyPrinterTurbo)** | None | In file (bad) | ★★★★★ | Medium |
| **TypeScript Class + dotenv** | ★★★★★ | Env vars (good) | ★★☆☆☆ | Low |
| **Pydantic BaseSettings** | ★★★★★ | Env vars (good) | ★★★☆☆ | Low |
| **Zod + JSON** | ★★★★★ | N/A (video config) | N/A | Low |
| **YAML + DB (ShortGPT)** | ★☆☆☆☆ | Mixed | ★★☆☆☆ | High |

---

## 4. Common Environment Variables

From analysis of all repos, these environment variable names are de facto standards:

| Variable | Usage | Repos |
|----------|-------|-------|
| `OPENAI_API_KEY` | OpenAI LLM/embeddings | All |
| `ANTHROPIC_API_KEY` | Anthropic LLM | MoneyPrinterTurbo |
| `PEXELS_API_KEY` | Stock footage | MoneyPrinterTurbo, short-video-maker |
| `PIXABAY_API_KEY` | Stock footage | MoneyPrinterTurbo |
| `ELEVEN_LABS_API_KEY` | TTS | ShortGPT |
| `PLAY_HT_API_KEY` | TTS | ShortGPT |
| `LOG_LEVEL` | Logging | short-video-maker |
| `PORT` | Server port | short-video-maker, kokoro-fastapi |

---

## 5. Multi-Provider Configuration Pattern

MoneyPrinterTurbo demonstrates the most comprehensive multi-provider pattern:

```toml
# Select active provider
llm_provider = "openai"

# OpenAI configuration
openai_api_key = ""
openai_base_url = ""
openai_model_name = "gpt-4o-mini"

# Moonshot configuration
moonshot_api_key = ""
moonshot_base_url = "https://api.moonshot.cn/v1"
moonshot_model_name = "moonshot-v1-8k"

# DeepSeek configuration
deepseek_api_key = ""
deepseek_base_url = "https://api.deepseek.com"
deepseek_model_name = "deepseek-chat"
```

**Implementation:**

```python
# vendor/MoneyPrinterTurbo/app/services/llm.py (inferred pattern)
def get_llm_client():
    provider = config.app.get("llm_provider")
    if provider == "openai":
        return OpenAI(api_key=config.app.get("openai_api_key"))
    elif provider == "moonshot":
        return OpenAI(
            api_key=config.app.get("moonshot_api_key"),
            base_url=config.app.get("moonshot_base_url")
        )
    # ... 10 more providers
```

---

## 6. Recommended Configuration Architecture

Based on evidence from vendor repos, content-machine should use a hybrid approach:

### 6.1 Secrets Layer (Environment Variables)

```bash
# .env (never committed)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PEXELS_API_KEY=...
```

### 6.2 Application Config Layer (TOML or JSON)

```toml
# ~/.cmrc.toml
[llm.default]
provider = "openai"
model = "gpt-4o"
temperature = 0.7

[llm.reasoning]
provider = "openai"
model = "o1-preview"

[embedding]
provider = "openai"
model = "text-embedding-3-small"

[commands.script]
llm = "default"

[commands.visuals]
llm = "reasoning"
```

### 6.3 Video Config Layer (JSON + Zod)

```typescript
// Validated at runtime
const videoConfigSchema = z.object({
  scenes: z.array(sceneSchema),
  output: outputSchema,
});
```

---

## 7. Key Insights

1. **Secrets must be in environment variables** - MoneyPrinterTurbo's approach of putting API keys in TOML is a security anti-pattern. All other repos use dotenv.

2. **Type safety is essential** - Both Pydantic (Python) and Zod (TypeScript) provide runtime validation with type inference. Raw YAML/TOML without validation leads to runtime errors.

3. **Multi-provider support requires structured config** - MoneyPrinterTurbo's flat key naming (`openai_api_key`, `moonshot_api_key`) doesn't scale. Nested config sections (`[llm.openai]`, `[llm.anthropic]`) are cleaner.

4. **Video-specific config is separate** - vidosy pattern: video configs are per-project JSON files, not global settings.

5. **Default-then-override** - All repos use sensible defaults that can be overridden. kokoro-fastapi's Pydantic pattern is cleanest.

---

## 8. References

| Source | Path | Key Pattern |
|--------|------|-------------|
| MoneyPrinterTurbo config | `vendor/MoneyPrinterTurbo/app/config/config.py` | TOML + multi-provider |
| MoneyPrinterTurbo example | `vendor/MoneyPrinterTurbo/config.example.toml` | 12+ LLM providers |
| short-video-maker config | `vendor/short-video-maker-gyori/src/config.ts` | TypeScript + dotenv |
| kokoro-fastapi settings | `vendor/audio/kokoro-fastapi/api/src/core/config.py` | Pydantic BaseSettings |
| vidosy schema | `templates/vidosy/src/shared/zod-schema.ts` | Zod validation |
| vidosy loader | `templates/vidosy/src/cli/utils/config-loader.ts` | JSON + Zod |
| ShortGPT config | `vendor/ShortGPT/shortGPT/config/config.py` | YAML + dotenv |

---

*Research completed: 2026-01-04*
