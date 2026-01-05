# Implementation Phase 1: cm script — Script Generation

**Phase:** 1  
**Duration:** Weeks 2-3  
**Status:** Not Started  
**Document ID:** IMPL-PHASE-1-SCRIPT-20260105  
**Prerequisites:** Phase 0 complete  

---

## 1. Overview

Phase 1 implements the `cm script` command, which generates video scripts from topics using LLM providers. This is the first pipeline stage and the foundation for all subsequent stages.

### 1.1 Goals

- ✅ `cm script "topic"` generates valid script.json
- ✅ 6 archetypes implemented with distinct prompts
- ✅ LLM-as-judge evaluations pass ≥80%
- ✅ Structured output parsing with fallback

### 1.2 Non-Goals

- ❌ TTS integration (Phase 2)
- ❌ Video rendering (Phase 4)
- ❌ Web research for topics (Post-MVP)

---

## 2. Deliverables

### 2.1 File Structure

```
src/script/
├── generator.ts          # Main generation logic
├── schema.ts             # ScriptOutput Zod schema
├── archetypes/
│   ├── index.ts          # Registry
│   ├── listicle.ts       # Listicle archetype
│   ├── versus.ts         # Comparison archetype
│   ├── howto.ts          # Tutorial archetype
│   ├── myth.ts           # Myth-busting archetype
│   ├── story.ts          # Narrative archetype
│   └── hot-take.ts       # Opinion archetype
├── prompts/
│   ├── system.yaml       # System prompt template
│   ├── listicle.yaml     # Archetype-specific prompts
│   ├── versus.yaml
│   ├── howto.yaml
│   ├── myth.yaml
│   ├── story.yaml
│   └── hot-take.yaml
└── __tests__/
    ├── generator.test.ts
    ├── archetypes.test.ts
    └── schema.test.ts
```

### 2.2 Component Matrix

| Component | File | Interface | Test Coverage |
|-----------|------|-----------|---------------|
| Schema | `src/script/schema.ts` | `ScriptOutput`, `Scene` | 100% |
| Generator | `src/script/generator.ts` | `generateScript()` | 90% |
| Archetypes | `src/script/archetypes/*.ts` | `Archetype` interface | 100% |
| Prompts | `src/script/prompts/*.yaml` | YAML templates | E2E |
| CLI | `src/cli/commands/script.ts` | `cm script` command | 80% |

---

## 3. Implementation Details

### 3.1 Schema Definition

**Pattern from:** [SECTION-SCHEMAS-VALIDATION-20260104.md](../research/sections/SECTION-SCHEMAS-VALIDATION-20260104.md)

```typescript
// src/script/schema.ts
import { z } from 'zod';

export const SceneSchema = z.object({
  id: z.number().int().positive(),
  narration: z.string()
    .min(10, 'Narration too short')
    .max(500, 'Narration too long'),
  visualDirection: z.string()
    .min(5, 'Visual direction required')
    .max(200, 'Visual direction too long'),
  durationHint: z.enum(['short', 'medium', 'long']).optional(),
  keywords: z.array(z.string()).optional(),
});

export const ScriptOutputSchema = z.object({
  title: z.string().min(3).max(100),
  hook: z.string().min(5).max(50),
  scenes: z.array(SceneSchema)
    .min(3, 'At least 3 scenes required')
    .max(8, 'Maximum 8 scenes'),
  callToAction: z.string().optional(),
  metadata: z.object({
    archetype: z.string(),
    estimatedDuration: z.number().positive(),
    wordCount: z.number().int().positive().optional(),
    generatedAt: z.string().datetime().optional(),
  }),
});

export type Scene = z.infer<typeof SceneSchema>;
export type ScriptOutput = z.infer<typeof ScriptOutputSchema>;

// Validation helpers
export function validateScript(data: unknown): ScriptOutput {
  return ScriptOutputSchema.parse(data);
}

export function safeValidateScript(data: unknown): { 
  success: true; data: ScriptOutput 
} | { 
  success: false; error: z.ZodError 
} {
  const result = ScriptOutputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
```

### 3.2 Archetype System

**Pattern from:** [RQ-21-CONTENT-ARCHETYPES-20260105.md](../research/investigations/RQ-21-CONTENT-ARCHETYPES-20260105.md)

```typescript
// src/script/archetypes/index.ts
export interface Archetype {
  name: string;
  description: string;
  structure: string;
  exampleTopics: string[];
  sceneCountHint: { min: number; max: number };
  promptModifiers: {
    tone: string;
    pacing: string;
    visualStyle: string;
  };
}

const archetypes: Record<string, Archetype> = {
  listicle: {
    name: 'listicle',
    description: 'Numbered list format: "5 tips...", "3 reasons..."',
    structure: 'Hook → Item 1 → Item 2 → ... → CTA',
    exampleTopics: ['5 JavaScript tips', '3 VS Code extensions'],
    sceneCountHint: { min: 4, max: 7 },
    promptModifiers: {
      tone: 'helpful and enthusiastic',
      pacing: 'each item gets equal time',
      visualStyle: 'numbered overlays, code snippets',
    },
  },
  versus: {
    name: 'versus',
    description: 'Comparison format: "X vs Y"',
    structure: 'Hook → Intro both → Compare → Verdict',
    exampleTopics: ['Redis vs Memcached', 'React vs Vue'],
    sceneCountHint: { min: 4, max: 6 },
    promptModifiers: {
      tone: 'balanced and analytical',
      pacing: 'equal time for each side',
      visualStyle: 'split screen, comparison tables',
    },
  },
  howto: {
    name: 'howto',
    description: 'Step-by-step tutorial',
    structure: 'Hook → Setup → Steps → Result',
    exampleTopics: ['How to deploy to Vercel', 'Setting up ESLint'],
    sceneCountHint: { min: 4, max: 8 },
    promptModifiers: {
      tone: 'clear and instructional',
      pacing: 'methodical, pause between steps',
      visualStyle: 'screen recordings, terminal',
    },
  },
  myth: {
    name: 'myth',
    description: 'Myth-busting format',
    structure: 'State myth → Show reality → Evidence',
    exampleTopics: ['You need a CS degree', 'JavaScript is dying'],
    sceneCountHint: { min: 3, max: 5 },
    promptModifiers: {
      tone: 'authoritative but friendly',
      pacing: 'dramatic reveal',
      visualStyle: 'myth vs reality overlays',
    },
  },
  story: {
    name: 'story',
    description: 'Personal narrative arc',
    structure: 'Hook → Challenge → Journey → Resolution',
    exampleTopics: ['How I learned React in 2 weeks', 'My first job rejection'],
    sceneCountHint: { min: 4, max: 6 },
    promptModifiers: {
      tone: 'personal and relatable',
      pacing: 'build tension, emotional payoff',
      visualStyle: 'lifestyle shots, emotional imagery',
    },
  },
  'hot-take': {
    name: 'hot-take',
    description: 'Controversial opinion',
    structure: 'Bold claim → Reasoning → Acknowledge counter → Stand firm',
    exampleTopics: ['TypeScript is overrated', 'Stop using Redux'],
    sceneCountHint: { min: 3, max: 5 },
    promptModifiers: {
      tone: 'confident and provocative',
      pacing: 'fast, punchy statements',
      visualStyle: 'dramatic text overlays',
    },
  },
};

export function getArchetype(name: string): Archetype {
  const archetype = archetypes[name];
  if (!archetype) {
    throw new Error(`Unknown archetype: ${name}. Valid: ${Object.keys(archetypes).join(', ')}`);
  }
  return archetype;
}

export function listArchetypes(): string[] {
  return Object.keys(archetypes);
}
```

### 3.3 Prompt Templates

**Pattern from:** [SECTION-SCRIPT-GENERATION-20260104.md](../research/sections/SECTION-SCRIPT-GENERATION-20260104.md)

```yaml
# src/script/prompts/system.yaml
role: system
content: |
  You are a viral short-form video scriptwriter specializing in {{ archetype.name }} content.
  
  YOUR VOICE:
  - Casual, conversational TikTok style
  - No corporate speak, no "In this video..."
  - Sound like a friend giving advice
  - Use contractions (you're, don't, it's)
  
  STRUCTURE:
  {{ archetype.structure }}
  
  REQUIREMENTS:
  - Start with an attention-grabbing hook (first 3 seconds matter!)
  - {{ archetype.sceneCountHint.min }}-{{ archetype.sceneCountHint.max }} scenes
  - 100-250 words total (30-60 seconds when spoken)
  - Each scene needs a narration AND a visual direction
  - Visual directions describe what the viewer SEES (filmable, concrete)
  
  TONE: {{ archetype.promptModifiers.tone }}
  PACING: {{ archetype.promptModifiers.pacing }}
  VISUAL STYLE: {{ archetype.promptModifiers.visualStyle }}
```

```yaml
# src/script/prompts/listicle.yaml
role: user
content: |
  Create a listicle script about: {{ topic }}
  
  The video should cover {{ itemCount | default(5) }} items.
  Make each item actionable and specific.
  
  Output as JSON matching this structure:
  {
    "title": "short catchy title",
    "hook": "attention-grabbing first line under 10 words",
    "scenes": [
      {
        "id": 1,
        "narration": "what to say",
        "visualDirection": "what viewer sees",
        "durationHint": "short|medium|long"
      }
    ],
    "callToAction": "follow for more tips",
    "metadata": {
      "archetype": "listicle",
      "estimatedDuration": 45
    }
  }
```

### 3.4 Script Generator

```typescript
// src/script/generator.ts
import { LLMProvider } from '../core/llm/provider.js';
import { ScriptOutput, ScriptOutputSchema, safeValidateScript } from './schema.js';
import { getArchetype, Archetype } from './archetypes/index.js';
import { loadPrompt, renderPrompt } from './prompts/loader.js';
import { SchemaError, ValidationError } from '../core/errors.js';
import { logger } from '../core/logger.js';

export interface GenerateScriptOptions {
  topic: string;
  archetype: string;
  temperature?: number;
  maxRetries?: number;
}

export interface GenerateScriptResult {
  script: ScriptOutput;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  attempts: number;
}

export async function generateScript(
  llm: LLMProvider,
  options: GenerateScriptOptions
): Promise<GenerateScriptResult> {
  const { topic, archetype: archetypeName, temperature = 0.7, maxRetries = 2 } = options;
  
  const archetype = getArchetype(archetypeName);
  logger.info({ topic, archetype: archetypeName }, 'Generating script');
  
  // Load and render prompts
  const systemPrompt = await loadPrompt('system');
  const userPrompt = await loadPrompt(archetypeName);
  
  const renderedSystem = renderPrompt(systemPrompt, { archetype });
  const renderedUser = renderPrompt(userPrompt, { topic });
  
  const messages = [
    { role: 'system' as const, content: renderedSystem },
    { role: 'user' as const, content: renderedUser },
  ];
  
  let lastError: Error | undefined;
  let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      logger.debug({ attempt }, 'LLM call attempt');
      
      const response = await llm.chat(messages, { 
        temperature,
        jsonMode: true,
      });
      
      totalUsage.promptTokens += response.usage.promptTokens;
      totalUsage.completionTokens += response.usage.completionTokens;
      totalUsage.totalTokens += response.usage.totalTokens;
      
      // Parse and validate
      const parsed = JSON.parse(response.content);
      const validation = safeValidateScript(parsed);
      
      if (validation.success) {
        // Add computed fields
        const script: ScriptOutput = {
          ...validation.data,
          metadata: {
            ...validation.data.metadata,
            wordCount: countWords(validation.data),
            generatedAt: new Date().toISOString(),
          },
        };
        
        logger.info({ 
          scenes: script.scenes.length,
          wordCount: script.metadata.wordCount,
        }, 'Script generated successfully');
        
        return { script, usage: totalUsage, attempts: attempt };
      }
      
      // Validation failed, retry with error feedback
      lastError = new SchemaError(validation.error.issues);
      logger.warn({ issues: validation.error.issues }, 'Schema validation failed, retrying');
      
      messages.push({
        role: 'assistant' as const,
        content: response.content,
      });
      messages.push({
        role: 'user' as const,
        content: `The JSON was invalid. Fix these issues: ${validation.error.issues.map(i => i.message).join(', ')}`,
      });
      
    } catch (error) {
      lastError = error as Error;
      logger.warn({ error, attempt }, 'Generation attempt failed');
      
      if (attempt === maxRetries + 1) break;
    }
  }
  
  throw lastError ?? new ValidationError('Script generation failed after retries');
}

function countWords(script: ScriptOutput): number {
  return script.scenes.reduce(
    (acc, scene) => acc + scene.narration.split(/\s+/).length,
    0
  );
}
```

### 3.5 CLI Command

```typescript
// src/cli/commands/script.ts
import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { generateScript } from '../../script/generator.js';
import { createLLMProvider } from '../../core/llm/factory.js';
import { loadConfig } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import { listArchetypes } from '../../script/archetypes/index.js';
import ora from 'ora';

export function createScriptCommand(): Command {
  return new Command('script')
    .description('Generate a video script from a topic')
    .argument('<topic>', 'The topic for the video')
    .option('-a, --archetype <type>', 'Content archetype', 'listicle')
    .option('-o, --output <path>', 'Output file path', 'script.json')
    .option('--temperature <number>', 'LLM temperature', parseFloat, 0.7)
    .option('--json', 'Output JSON to stdout instead of file')
    .option('--list-archetypes', 'List available archetypes')
    .action(async (topic, options) => {
      // Handle list archetypes
      if (options.listArchetypes) {
        console.log('Available archetypes:');
        listArchetypes().forEach(a => console.log(`  - ${a}`));
        return;
      }
      
      const spinner = ora('Generating script...').start();
      
      try {
        const config = loadConfig();
        const llm = createLLMProvider(config.llm.provider, config.llm.model);
        
        const result = await generateScript(llm, {
          topic,
          archetype: options.archetype,
          temperature: options.temperature,
        });
        
        spinner.succeed(`Script generated (${result.script.scenes.length} scenes, ${result.script.metadata.wordCount} words)`);
        
        if (options.json) {
          console.log(JSON.stringify(result.script, null, 2));
        } else {
          const outputPath = resolve(options.output);
          writeFileSync(outputPath, JSON.stringify(result.script, null, 2));
          console.log(`Saved to ${outputPath}`);
        }
        
        // Log usage
        logger.info({
          tokens: result.usage.totalTokens,
          attempts: result.attempts,
        }, 'Generation complete');
        
      } catch (error) {
        spinner.fail('Script generation failed');
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
```

---

## 4. Tests to Write First (TDD)

### 4.1 Schema Tests

```typescript
// src/script/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest';
import { ScriptOutputSchema, validateScript, safeValidateScript } from '../schema';

describe('ScriptOutputSchema', () => {
  const validScript = {
    title: 'Test Script',
    hook: 'Stop using console.log',
    scenes: [
      { id: 1, narration: 'Scene one narration here', visualDirection: 'Show code editor' },
      { id: 2, narration: 'Scene two narration here', visualDirection: 'Show terminal' },
      { id: 3, narration: 'Scene three narration here', visualDirection: 'Show result' },
    ],
    metadata: { archetype: 'listicle', estimatedDuration: 45 },
  };

  it('should validate correct script', () => {
    expect(() => validateScript(validScript)).not.toThrow();
  });

  it('should reject script with < 3 scenes', () => {
    const invalid = { ...validScript, scenes: [validScript.scenes[0]] };
    const result = safeValidateScript(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject script with > 8 scenes', () => {
    const scenes = Array.from({ length: 9 }, (_, i) => ({
      id: i + 1,
      narration: `Scene ${i + 1}`,
      visualDirection: 'Show something',
    }));
    const invalid = { ...validScript, scenes };
    const result = safeValidateScript(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject empty narration', () => {
    const invalid = {
      ...validScript,
      scenes: [{ id: 1, narration: '', visualDirection: 'Show code' }],
    };
    const result = safeValidateScript(invalid);
    expect(result.success).toBe(false);
  });
});
```

### 4.2 Generator Tests

```typescript
// src/script/__tests__/generator.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { generateScript } from '../generator';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';

describe('generateScript', () => {
  let fakeLLM: FakeLLMProvider;

  beforeEach(() => {
    fakeLLM = new FakeLLMProvider();
  });

  it('should generate script from topic', async () => {
    const mockScript = {
      title: 'JavaScript Tips',
      hook: 'Stop making these mistakes',
      scenes: [
        { id: 1, narration: 'First tip', visualDirection: 'Show code' },
        { id: 2, narration: 'Second tip', visualDirection: 'Show terminal' },
        { id: 3, narration: 'Third tip', visualDirection: 'Show browser' },
      ],
      metadata: { archetype: 'listicle', estimatedDuration: 45 },
    };

    fakeLLM.queueJsonResponse(mockScript);

    const result = await generateScript(fakeLLM, {
      topic: '3 JavaScript tips',
      archetype: 'listicle',
    });

    expect(result.script.scenes).toHaveLength(3);
    expect(result.script.metadata.archetype).toBe('listicle');
  });

  it('should retry on validation failure', async () => {
    // First response invalid (2 scenes)
    fakeLLM.queueJsonResponse({
      title: 'Test',
      hook: 'Hook',
      scenes: [
        { id: 1, narration: 'One', visualDirection: 'Show' },
        { id: 2, narration: 'Two', visualDirection: 'Show' },
      ],
      metadata: { archetype: 'listicle', estimatedDuration: 30 },
    });

    // Second response valid (3 scenes)
    fakeLLM.queueJsonResponse({
      title: 'Test',
      hook: 'Hook',
      scenes: [
        { id: 1, narration: 'One here', visualDirection: 'Show one' },
        { id: 2, narration: 'Two here', visualDirection: 'Show two' },
        { id: 3, narration: 'Three here', visualDirection: 'Show three' },
      ],
      metadata: { archetype: 'listicle', estimatedDuration: 30 },
    });

    const result = await generateScript(fakeLLM, {
      topic: 'Test topic',
      archetype: 'listicle',
    });

    expect(result.attempts).toBe(2);
    expect(result.script.scenes).toHaveLength(3);
  });

  it('should pass archetype context to prompts', async () => {
    fakeLLM.queueJsonResponse({
      title: 'Test',
      hook: 'Hook',
      scenes: [
        { id: 1, narration: 'One one one', visualDirection: 'Show one' },
        { id: 2, narration: 'Two two two', visualDirection: 'Show two' },
        { id: 3, narration: 'Three three', visualDirection: 'Show three' },
      ],
      metadata: { archetype: 'versus', estimatedDuration: 45 },
    });

    await generateScript(fakeLLM, {
      topic: 'Redis vs PostgreSQL',
      archetype: 'versus',
    });

    const lastCall = fakeLLM.getLastCall();
    expect(lastCall?.[0].content).toContain('versus');
  });
});
```

---

## 5. Validation Checklist

### 5.1 Layer 1: Schema Validation
- [ ] `ScriptOutputSchema` validates all fields
- [ ] Scene count between 3-8 enforced
- [ ] Narration and visualDirection required
- [ ] Type exports work with z.infer

### 5.2 Layer 2: Programmatic Checks
- [ ] Word count computed correctly
- [ ] All 6 archetypes load without error
- [ ] Prompt templates render correctly
- [ ] Retry logic works on validation failure

### 5.3 Layer 3: LLM-as-Judge (promptfoo)
- [ ] Run: `npx promptfoo eval -c evals/configs/cm-script.yaml`
- [ ] Pass rate ≥80%
- [ ] Hook score ≥0.85 average
- [ ] Archetype adherence ≥0.90

### 5.4 Layer 4: Manual Review
- [ ] Sample 5 generated scripts manually
- [ ] Verify hook is attention-grabbing
- [ ] Verify TikTok voice (no corporate speak)
- [ ] Verify visual directions are filmable

---

## 6. Research References

| Topic | Document |
|-------|----------|
| Script generation patterns | [SECTION-SCRIPT-GENERATION-20260104.md](../research/sections/SECTION-SCRIPT-GENERATION-20260104.md) |
| Structured LLM output | [RQ-04-STRUCTURED-LLM-OUTPUT-20260104.md](../research/investigations/RQ-04-STRUCTURED-LLM-OUTPUT-20260104.md) |
| Content archetypes | [RQ-21-CONTENT-ARCHETYPES-20260105.md](../research/investigations/RQ-21-CONTENT-ARCHETYPES-20260105.md) |
| LLM evaluation | [RQ-24-LLM-EVALUATION-QUALITY-ASSURANCE-20260105.md](../research/investigations/RQ-24-LLM-EVALUATION-QUALITY-ASSURANCE-20260105.md) |
| V&V framework | [VV-FRAMEWORK-20260105.md](../guides/VV-FRAMEWORK-20260105.md) |

---

## 7. Definition of Done

Phase 1 is complete when:

- [ ] `cm script "topic"` outputs valid script.json
- [ ] All 6 archetypes work
- [ ] Unit tests pass with >90% coverage
- [ ] `npx promptfoo eval` passes ≥80%
- [ ] Code review approved

---

**Previous Phase:** [IMPL-PHASE-0-FOUNDATION-20260105.md](IMPL-PHASE-0-FOUNDATION-20260105.md)  
**Next Phase:** [IMPL-PHASE-2-AUDIO-20260105.md](IMPL-PHASE-2-AUDIO-20260105.md)
