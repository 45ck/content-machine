# Implementation Phase 0: Foundation & Infrastructure

**Phase:** 0  
**Duration:** Week 1  
**Status:** Not Started  
**Document ID:** IMPL-PHASE-0-FOUNDATION-20260105  
**Prerequisites:** None  

---

## 1. Overview

Phase 0 establishes the core infrastructure that all subsequent phases depend on. This is foundational work that must be completed before any pipeline commands can be implemented.

### 1.1 Goals

- ✅ Project compiles with TypeScript strict mode
- ✅ Vitest test runner works
- ✅ Core infrastructure modules exist and are tested
- ✅ `cm --help` outputs version and command list
- ✅ Configuration system loads environment and config files

### 1.2 Non-Goals

- ❌ Implementing any pipeline commands (script, audio, visuals, render)
- ❌ LLM API calls (use mocks only)
- ❌ Any video rendering

---

## 2. Deliverables

### 2.1 Project Structure

```
content-machine/
├── package.json              # Dependencies, scripts
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Test configuration
├── .env.example              # Environment template
├── .gitignore                # Ignore patterns
├── src/
│   ├── index.ts              # Main entry point
│   ├── cli/
│   │   ├── index.ts          # Commander.js setup
│   │   └── commands/         # Command files (stubs)
│   ├── core/
│   │   ├── config.ts         # Configuration loader
│   │   ├── logger.ts         # pino logger
│   │   ├── errors.ts         # Error taxonomy
│   │   └── llm/
│   │       ├── provider.ts   # LLMProvider interface
│   │       ├── openai.ts     # OpenAI implementation
│   │       └── factory.ts    # Provider factory
│   ├── schemas/
│   │   ├── script.ts         # ScriptOutput schema
│   │   ├── audio.ts          # AudioOutput schema
│   │   ├── visuals.ts        # VisualsOutput schema
│   │   └── render.ts         # RenderProps schema
│   └── test/
│       └── stubs/
│           ├── fake-llm.ts   # FakeLLMProvider
│           └── fake-tts.ts   # FakeTTSProvider
├── tests/
│   ├── unit/
│   │   ├── config.test.ts
│   │   ├── logger.test.ts
│   │   ├── errors.test.ts
│   │   └── schemas.test.ts
│   └── integration/
│       └── cli.test.ts
└── evals/                    # Already created
```

### 2.2 Component Matrix

| Component | File | Interface | Test Coverage |
|-----------|------|-----------|---------------|
| Config | `src/core/config.ts` | `Config`, `loadConfig()` | 100% |
| Logger | `src/core/logger.ts` | `logger`, `createLogger()` | 90% |
| Errors | `src/core/errors.ts` | `CMError`, error classes | 100% |
| LLM Provider | `src/core/llm/provider.ts` | `LLMProvider` interface | 100% |
| OpenAI | `src/core/llm/openai.ts` | `OpenAIProvider` | 80% (mocked) |
| Factory | `src/core/llm/factory.ts` | `createLLMProvider()` | 100% |
| Schemas | `src/schemas/*.ts` | Zod schemas | 100% |
| CLI | `src/cli/index.ts` | Commander setup | 80% |

---

## 3. Implementation Details

### 3.1 Package.json

```json
{
  "name": "content-machine",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "cm": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src tests",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "zod": "^3.22.0",
    "pino": "^8.17.0",
    "pino-pretty": "^10.3.0",
    "dotenv": "^16.3.0",
    "openai": "^4.28.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "@vitest/coverage-v8": "^1.2.0",
    "tsx": "^4.7.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 3.2 TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3.3 Configuration System

**Pattern from:** [SECTION-CONFIG-SYSTEMS-20260104.md](../research/sections/SECTION-CONFIG-SYSTEMS-20260104.md)

```typescript
// src/core/config.ts
import { z } from 'zod';
import { config as loadDotenv } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const ConfigSchema = z.object({
  llm: z.object({
    provider: z.enum(['openai', 'anthropic']).default('openai'),
    model: z.string().default('gpt-4o'),
    temperature: z.number().min(0).max(2).default(0.7),
  }).default({}),
  tts: z.object({
    engine: z.enum(['kokoro', 'edge', 'elevenlabs']).default('kokoro'),
    voice: z.string().default('af_heart'),
  }).default({}),
  output: z.object({
    resolution: z.enum(['1080x1920', '720x1280']).default('1080x1920'),
    fps: z.number().default(30),
    format: z.enum(['mp4', 'webm']).default('mp4'),
  }).default({}),
  defaults: z.object({
    archetype: z.string().default('listicle'),
    orientation: z.enum(['portrait', 'landscape', 'square']).default('portrait'),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  // Load .env first
  loadDotenv();
  
  // Load ~/.cmrc.json if exists
  const rcPath = join(homedir(), '.cmrc.json');
  let fileConfig = {};
  
  if (existsSync(rcPath)) {
    try {
      fileConfig = JSON.parse(readFileSync(rcPath, 'utf-8'));
    } catch (error) {
      // Invalid JSON, use defaults
    }
  }
  
  // Validate and return
  return ConfigSchema.parse(fileConfig);
}

export function getApiKey(provider: 'openai' | 'anthropic' | 'pexels'): string {
  const keyMap = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    pexels: 'PEXELS_API_KEY',
  };
  
  const key = process.env[keyMap[provider]];
  if (!key) {
    throw new ConfigError(`Missing ${keyMap[provider]} environment variable`);
  }
  return key;
}
```

### 3.4 Error Taxonomy

**Pattern from:** [RQ-14-ERROR-TAXONOMY-20260104.md](../research/investigations/RQ-14-ERROR-TAXONOMY-20260104.md)

```typescript
// src/core/errors.ts
export abstract class CMError extends Error {
  abstract readonly code: string;
  abstract readonly category: 'config' | 'api' | 'validation' | 'io' | 'render';
  abstract readonly retryable: boolean;
  
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Configuration errors
export class ConfigError extends CMError {
  readonly code = 'E_CONFIG';
  readonly category = 'config' as const;
  readonly retryable = false;
}

// API errors (retryable)
export class APIError extends CMError {
  readonly code = 'E_API';
  readonly category = 'api' as const;
  readonly retryable = true;
  
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    cause?: Error
  ) {
    super(message, cause);
  }
}

// Rate limit (retryable with backoff)
export class RateLimitError extends APIError {
  readonly code = 'E_RATE_LIMIT';
  readonly retryable = true;
  
  constructor(
    provider: string,
    public readonly retryAfter?: number,
    cause?: Error
  ) {
    super(`Rate limited by ${provider}`, provider, 429, cause);
  }
}

// Validation errors
export class ValidationError extends CMError {
  readonly code = 'E_VALIDATION';
  readonly category = 'validation' as const;
  readonly retryable = false;
  
  constructor(message: string, public readonly field?: string) {
    super(message);
  }
}

// Schema validation errors
export class SchemaError extends ValidationError {
  readonly code = 'E_SCHEMA';
  
  constructor(public readonly issues: z.ZodIssue[]) {
    super(`Schema validation failed: ${issues.map(i => i.message).join(', ')}`);
  }
}

// IO errors
export class IOError extends CMError {
  readonly code = 'E_IO';
  readonly category = 'io' as const;
  readonly retryable = false;
  
  constructor(message: string, public readonly path?: string, cause?: Error) {
    super(message, cause);
  }
}

// Render errors
export class RenderError extends CMError {
  readonly code = 'E_RENDER';
  readonly category = 'render' as const;
  readonly retryable = false;
}
```

### 3.5 LLM Provider Interface

**Pattern from:** [L3-CAT-G-AGENT-FRAMEWORKS-20260104.md](../research/synthesis/L3-CAT-G-AGENT-FRAMEWORKS-20260104.md)

```typescript
// src/core/llm/provider.ts
import { z } from 'zod';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface LLMProvider {
  readonly name: string;
  
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  
  chatJson<T>(
    messages: ChatMessage[],
    schema: z.ZodSchema<T>,
    options?: ChatOptions
  ): Promise<T>;
}
```

### 3.6 OpenAI Provider

```typescript
// src/core/llm/openai.ts
import OpenAI from 'openai';
import { z } from 'zod';
import { LLMProvider, ChatMessage, ChatOptions, ChatResponse } from './provider.js';
import { APIError, SchemaError } from '../errors.js';
import { getApiKey } from '../config.js';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private model: string;
  
  constructor(model: string = 'gpt-4o') {
    this.model = model;
    this.client = new OpenAI({
      apiKey: getApiKey('openai'),
    });
  }
  
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
      });
      
      return {
        content: response.choices[0].message.content ?? '',
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        model: response.model,
      };
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new APIError(
          error.message,
          'openai',
          error.status,
          error
        );
      }
      throw error;
    }
  }
  
  async chatJson<T>(
    messages: ChatMessage[],
    schema: z.ZodSchema<T>,
    options?: ChatOptions
  ): Promise<T> {
    const response = await this.chat(messages, { ...options, jsonMode: true });
    
    try {
      const parsed = JSON.parse(response.content);
      const result = schema.safeParse(parsed);
      
      if (!result.success) {
        throw new SchemaError(result.error.issues);
      }
      
      return result.data;
    } catch (error) {
      if (error instanceof SchemaError) throw error;
      throw new ValidationError(`Invalid JSON response: ${error}`);
    }
  }
}
```

### 3.7 Test Stubs

**Pattern from:** [SECTION-SCHEMAS-VALIDATION-20260104.md](../research/sections/SECTION-SCHEMAS-VALIDATION-20260104.md)

```typescript
// src/test/stubs/fake-llm.ts
import { z } from 'zod';
import { LLMProvider, ChatMessage, ChatOptions, ChatResponse } from '../../core/llm/provider.js';

interface QueuedResponse {
  content: string;
  usage?: Partial<ChatResponse['usage']>;
}

export class FakeLLMProvider implements LLMProvider {
  readonly name = 'fake';
  private queue: QueuedResponse[] = [];
  private calls: ChatMessage[][] = [];
  
  queueResponse(content: string, usage?: Partial<ChatResponse['usage']>): void {
    this.queue.push({ content, usage });
  }
  
  queueJsonResponse<T>(data: T): void {
    this.queue.push({ content: JSON.stringify(data) });
  }
  
  getCalls(): ChatMessage[][] {
    return this.calls;
  }
  
  getLastCall(): ChatMessage[] | undefined {
    return this.calls[this.calls.length - 1];
  }
  
  clearCalls(): void {
    this.calls = [];
  }
  
  async chat(messages: ChatMessage[], _options?: ChatOptions): Promise<ChatResponse> {
    this.calls.push(messages);
    
    const response = this.queue.shift();
    if (!response) {
      throw new Error('FakeLLMProvider: No response queued');
    }
    
    return {
      content: response.content,
      usage: {
        promptTokens: response.usage?.promptTokens ?? 100,
        completionTokens: response.usage?.completionTokens ?? 50,
        totalTokens: response.usage?.totalTokens ?? 150,
      },
      model: 'fake-model',
    };
  }
  
  async chatJson<T>(
    messages: ChatMessage[],
    schema: z.ZodSchema<T>,
    options?: ChatOptions
  ): Promise<T> {
    const response = await this.chat(messages, options);
    const parsed = JSON.parse(response.content);
    return schema.parse(parsed);
  }
}
```

### 3.8 CLI Setup

**Pattern from:** [SECTION-CLI-ARCHITECTURE-20260104.md](../research/sections/SECTION-CLI-ARCHITECTURE-20260104.md)

```typescript
// src/cli/index.ts
import { Command } from 'commander';
import { version } from '../../package.json';

export function createCLI(): Command {
  const program = new Command();
  
  program
    .name('cm')
    .description('content-machine: AI-powered short-form video generator')
    .version(version);
  
  // Placeholder commands (implemented in later phases)
  program
    .command('generate <topic>')
    .description('Generate a complete video from a topic')
    .option('-a, --archetype <type>', 'Content archetype', 'listicle')
    .option('-o, --output <path>', 'Output file path', 'output.mp4')
    .action(async (topic, options) => {
      console.log('cm generate not yet implemented');
    });
  
  program
    .command('script <topic>')
    .description('Generate a video script')
    .option('-a, --archetype <type>', 'Content archetype', 'listicle')
    .option('-o, --output <path>', 'Output file path', 'script.json')
    .action(async (topic, options) => {
      console.log('cm script not yet implemented');
    });
  
  program
    .command('audio')
    .description('Generate voiceover from script')
    .option('-i, --input <path>', 'Input script file', 'script.json')
    .option('-o, --output <path>', 'Output audio file', 'audio.wav')
    .action(async (options) => {
      console.log('cm audio not yet implemented');
    });
  
  program
    .command('visuals')
    .description('Find matching stock footage')
    .option('-i, --input <path>', 'Input timestamps file', 'timestamps.json')
    .option('-o, --output <path>', 'Output visuals file', 'visuals.json')
    .action(async (options) => {
      console.log('cm visuals not yet implemented');
    });
  
  program
    .command('render')
    .description('Render final video')
    .option('-i, --input <path>', 'Input visuals file', 'visuals.json')
    .option('-o, --output <path>', 'Output video file', 'video.mp4')
    .action(async (options) => {
      console.log('cm render not yet implemented');
    });
  
  return program;
}

// src/index.ts
#!/usr/bin/env node
import { createCLI } from './cli/index.js';

const program = createCLI();
program.parse();
```

---

## 4. Tests to Write First (TDD)

### 4.1 Config Tests

```typescript
// tests/unit/config.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadConfig, getApiKey } from '../../src/core/config';
import { ConfigError } from '../../src/core/errors';

describe('loadConfig', () => {
  it('should return default config when no file exists', () => {
    const config = loadConfig();
    expect(config.llm.provider).toBe('openai');
    expect(config.tts.engine).toBe('kokoro');
  });
  
  it('should merge file config with defaults', () => {
    // Mock fs.readFileSync to return custom config
    vi.mock('fs', () => ({
      existsSync: () => true,
      readFileSync: () => JSON.stringify({ llm: { model: 'gpt-4o-mini' } }),
    }));
    
    const config = loadConfig();
    expect(config.llm.model).toBe('gpt-4o-mini');
    expect(config.tts.engine).toBe('kokoro'); // Still default
  });
});

describe('getApiKey', () => {
  it('should return API key from environment', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(getApiKey('openai')).toBe('sk-test');
  });
  
  it('should throw ConfigError when key missing', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => getApiKey('openai')).toThrow(ConfigError);
  });
});
```

### 4.2 Schema Tests

```typescript
// tests/unit/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { ScriptOutputSchema } from '../../src/schemas/script';

describe('ScriptOutputSchema', () => {
  it('should validate a correct script', () => {
    const script = {
      title: 'Test Script',
      hook: 'Stop using console.log',
      scenes: [
        { id: 1, narration: 'This is scene one', visualDirection: 'Show code' },
        { id: 2, narration: 'This is scene two', visualDirection: 'Show terminal' },
        { id: 3, narration: 'This is scene three', visualDirection: 'Show result' },
      ],
      metadata: { archetype: 'listicle', estimatedDuration: 45 },
    };
    
    const result = ScriptOutputSchema.safeParse(script);
    expect(result.success).toBe(true);
  });
  
  it('should reject script with less than 3 scenes', () => {
    const script = {
      title: 'Test',
      hook: 'Hook',
      scenes: [{ id: 1, narration: 'One', visualDirection: 'Show' }],
      metadata: { archetype: 'listicle', estimatedDuration: 10 },
    };
    
    const result = ScriptOutputSchema.safeParse(script);
    expect(result.success).toBe(false);
  });
});
```

### 4.3 Error Tests

```typescript
// tests/unit/errors.test.ts
import { describe, it, expect } from 'vitest';
import { CMError, APIError, RateLimitError, SchemaError } from '../../src/core/errors';

describe('Error Taxonomy', () => {
  it('APIError should be retryable', () => {
    const error = new APIError('Failed', 'openai', 500);
    expect(error.retryable).toBe(true);
    expect(error.category).toBe('api');
  });
  
  it('RateLimitError should include retry-after', () => {
    const error = new RateLimitError('openai', 60);
    expect(error.retryAfter).toBe(60);
    expect(error.code).toBe('E_RATE_LIMIT');
  });
  
  it('SchemaError should include Zod issues', () => {
    const issues = [{ code: 'custom', path: ['field'], message: 'Invalid' }];
    const error = new SchemaError(issues as any);
    expect(error.issues).toHaveLength(1);
  });
});
```

---

## 5. Validation Checklist

### 5.1 Layer 1: Schema Validation
- [ ] All Zod schemas compile without errors
- [ ] Schema tests cover valid and invalid cases
- [ ] z.infer types are exported

### 5.2 Layer 2: Programmatic Checks
- [ ] `npm run build` succeeds
- [ ] `npm test` passes with >90% coverage on core modules
- [ ] `npm run type-check` has no errors
- [ ] `npm run lint` passes

### 5.3 Layer 3: Integration
- [ ] `cm --help` outputs command list
- [ ] `cm --version` outputs version
- [ ] `cm script --help` shows options
- [ ] Configuration loads from ~/.cmrc.json

### 5.4 Documentation
- [ ] README.md has installation instructions
- [ ] .env.example has all required variables
- [ ] CONTRIBUTING.md explains development setup

---

## 6. Research References

| Topic | Document |
|-------|----------|
| Configuration patterns | [SECTION-CONFIG-SYSTEMS-20260104.md](../research/sections/SECTION-CONFIG-SYSTEMS-20260104.md) |
| Schema validation | [SECTION-SCHEMAS-VALIDATION-20260104.md](../research/sections/SECTION-SCHEMAS-VALIDATION-20260104.md) |
| Error taxonomy | [RQ-14-ERROR-TAXONOMY-20260104.md](../research/investigations/RQ-14-ERROR-TAXONOMY-20260104.md) |
| CLI architecture | [SECTION-CLI-ARCHITECTURE-20260104.md](../research/sections/SECTION-CLI-ARCHITECTURE-20260104.md) |
| LLM providers | [L3-CAT-G-AGENT-FRAMEWORKS-20260104.md](../research/synthesis/L3-CAT-G-AGENT-FRAMEWORKS-20260104.md) |

---

## 7. Definition of Done

Phase 0 is complete when:

- [ ] All files in §2.1 structure exist
- [ ] All tests in §4 pass
- [ ] All validation checks in §5 pass
- [ ] `cm --help` works from npm link
- [ ] Code review approved

---

**Next Phase:** [IMPL-PHASE-1-SCRIPT-20260105.md](IMPL-PHASE-1-SCRIPT-20260105.md) — Script Generation
