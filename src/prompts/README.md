# Prompt Library

**content-machine** prompt library - curated prompts for video generation, image generation, and content creation.

> **Status:** Active  
> **Last Updated:** 2026-01-07

---

## 📁 Structure

```
src/prompts/
├── README.md                    # This file
├── index.ts                     # Main exports
├── types.ts                     # TypeScript interfaces
├── registry.ts                  # Prompt registry and search
├── templates/                   # Prompt templates by category
│   ├── script/                  # Script generation prompts
│   ├── visuals/                 # Visual search & generation prompts
│   ├── image-generation/        # AI image generation prompts (Nano Banana, DALL-E)
│   └── editing/                 # Video editing assistance prompts
└── sources/                     # Attribution for vendored prompts
    └── ATTRIBUTIONS.md          # Credit to original repos
```

---

## 🎯 Purpose

This library provides:

1. **Curated Prompts** - Battle-tested prompts from popular open-source video generators
2. **Nano Banana Templates** - Ready-to-use prompts for AI image generation
3. **Searchable Registry** - Agents can search prompts by category, use case, or keywords
4. **Attribution** - Full credit to original open-source projects

---

## 🎬 Video Generator Pipeline Integration

The prompt library integrates with content-machine's 4-stage video generation pipeline:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  cm script  │ ──▶│  cm audio   │ ──▶│  cm visuals │ ──▶│  cm render  │
│             │    │             │    │             │    │             │
│  Script     │    │  TTS + ASR  │    │  Footage    │    │  Remotion   │
│  Prompts    │    │             │    │  Prompts    │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      ↑                                     ↑
      │                                     │
   ┌──┴──────────────────────────────────────┴──┐
   │           src/prompts/ Library             │
   │                                            │
   │  • script/video-script-generator.yaml      │
   │  • visuals/video-search-terms.yaml         │
   │  • image-generation/cinematic-scene.yaml   │
   └────────────────────────────────────────────┘
```

### Stage 1: Script Generation (`cm script`)

The script generator uses archetype-specific prompts from `src/script/prompts/`:

```typescript
// src/script/generator.ts
import { getPromptForArchetype } from './prompts';

const { prompt } = await getPromptForArchetype(options.archetype, {
  topic: options.topic,
  targetWordCount,
  targetDuration,
});

const response = await llm.chat([
  { role: 'system', content: 'You are an expert short-form video scriptwriter...' },
  { role: 'user', content: prompt },
]);
```

**Archetypes available:** dynamic (run `cm archetypes list`)

**Output:** `ScriptOutput` with scenes, hook, CTA, hashtags

### Stage 2: Audio Generation (`cm audio`)

Audio stage uses timestamps from TTS + ASR (no prompts needed).

### Stage 3: Visual Matching (`cm visuals`)

The visual matcher extracts keywords from scenes using prompts:

```typescript
// src/visuals/keywords.ts
const SYSTEM_PROMPT = `You are a visual search keyword expert...`;

const response = await llm.chat([
  { role: 'system', content: SYSTEM_PROMPT },
  { role: 'user', content: buildKeywordPrompt(scenes) },
]);
```

**For AI-generated images (Nano Banana):**

```typescript
import { getPrompt, renderPrompt, NANO_BANANA_PROMPTS } from '../prompts';

// Get the cinematic scene template
const template = getPrompt(NANO_BANANA_PROMPTS.cinematic);

// Render with scene-specific variables
const prompt = renderPrompt(template, {
  scene_description: scene.visualDirection,
  mood: scene.mood,
  lighting: 'dramatic',
  aspect_ratio: '9:16',
});

// Use with Gemini Imagen API
const image = await nanoBananaProvider.generate(prompt.user);
```

### Stage 4: Video Rendering (`cm render`)

Render stage uses Remotion (no prompts needed).

---

## 🔌 Integration Points

### Current Integration

| Component            | Prompt Source             | Status     |
| -------------------- | ------------------------- | ---------- |
| Script Generator     | `src/script/prompts/`     | ✅ Active  |
| Keyword Extractor    | `src/visuals/keywords.ts` | ✅ Active  |
| Stock Footage Search | Pexels API (no prompts)   | ✅ Active  |
| AI Image Generation  | `src/prompts/` library    | 🔄 Planned |

### Planned Integration

The prompt library is designed for the **Nano Banana visual provider** (AI-generated images):

```typescript
// Future: src/visuals/providers/nanobanana-provider.ts
import { searchPrompts, renderPrompt, NANO_BANANA_PROMPTS } from '../../prompts';

class NanoBananaProvider implements VisualProvider {
  async generate(scene: SceneTimestamp): Promise<GeneratedImage> {
    // 1. Search for the best prompt template based on scene content
    const results = searchPrompts(scene.visualDirection, {
      category: 'image-generation',
      provider: 'gemini',
      limit: 3,
    });

    // 2. Select best template (by relevance score)
    const template = results[0]?.template ?? getPrompt(NANO_BANANA_PROMPTS.cinematic);

    // 3. Render with scene-specific variables
    const prompt = renderPrompt(template, {
      scene_description: scene.visualDirection,
      mood: scene.mood ?? 'professional',
      lighting: this.inferLighting(scene),
      aspect_ratio: '9:16',
    });

    // 4. Call Gemini Imagen API
    return await this.geminiClient.generateImage(prompt.user);
  }
}
```

---

## 📚 Prompt Categories

### Script Generation (`script/`)

Prompts for generating video scripts from topics.

| Template                 | Source            | Use Case              |
| ------------------------ | ----------------- | --------------------- |
| `video-script-generator` | MoneyPrinterTurbo | General video scripts |
| `facts-generator`        | ShortGPT          | Facts/trivia shorts   |

### Visual Search (`visuals/`)

Prompts for generating stock footage search terms.

| Template                | Source            | Use Case             |
| ----------------------- | ----------------- | -------------------- |
| `video-search-terms`    | MoneyPrinterTurbo | Stock video queries  |
| `image-query-generator` | ShortGPT          | Image search queries |

### AI Image Generation (`image-generation/`)

Prompts for generating images with Gemini/DALL-E/Nano Banana.

| Template                      | Source          | Use Case                              |
| ----------------------------- | --------------- | ------------------------------------- |
| `cinematic-scene`             | content-machine | Cinematic B-roll style                |
| `tech-visualization`          | content-machine | Abstract tech concepts                |
| `comparison-split`            | content-machine | Side-by-side "X vs Y" visuals         |
| `person-action`               | content-machine | Lifestyle/person doing action         |
| `abstract-concept`            | content-machine | Concept-to-metaphor visualization     |
| `seedream-hero-still`         | content-machine | Character-first hero still/keyframe   |
| `seedream-reference-anchored` | content-machine | Identity-consistent reference edit    |
| `seedream-stylized-remix`     | content-machine | Stylized policy-safer character remix |

---

## 🔍 API Reference

### Quick Start

```typescript
import {
  getPrompt,
  searchPrompts,
  renderPrompt,
  PromptRegistry,
  PROMPT_IDS,
  NANO_BANANA_PROMPTS,
  SEED_CREATIVE_PROMPTS,
} from './prompts';
```

### Get a Specific Prompt

```typescript
// By full ID
const template = getPrompt('script/video-script-generator');

// Using constants (recommended)
const template = getPrompt(PROMPT_IDS.SCRIPT_VIDEO_GENERATOR);
const template = getPrompt(NANO_BANANA_PROMPTS.cinematic);
const seedTemplate = getPrompt(SEED_CREATIVE_PROMPTS.seedreamHeroStill);
```

### Search Prompts

```typescript
// Keyword search with relevance scoring
const results = searchPrompts('cinematic tech visualization');
// Returns: { template, score, matchedKeywords }[]

// Filter by category
const imagePrompts = searchPrompts('scene', { category: 'image-generation' });

// Filter by provider
const geminiPrompts = searchPrompts('generate', { provider: 'gemini' });

// Filter by tags
const nanoPrompts = PromptRegistry.search({ tags: ['nano-banana'] });
```

### Render a Prompt

```typescript
const template = getPrompt(PROMPT_IDS.IMAGE_CINEMATIC_SCENE);

const rendered = renderPrompt(template, {
  scene_description: 'A developer coding late at night',
  mood: 'focused',
  lighting: 'dramatic blue monitor glow',
  aspect_ratio: '9:16',
});

console.log(rendered.user); // The rendered prompt string
console.log(rendered.system); // Optional system prompt
console.log(rendered.meta); // { templateId, templateVersion, renderedAt, variables }
```

### List All Prompts

```typescript
// All templates
const all = PromptRegistry.list();

// By category
const scripts = PromptRegistry.listByCategory('script');
const images = PromptRegistry.listByCategory('image-generation');

// By provider
const gemini = PromptRegistry.listByProvider('gemini');
```

### Register Custom Prompts

```typescript
import type { PromptTemplate } from './prompts/types';

const customTemplate: PromptTemplate = {
  id: 'custom/my-prompt',
  name: 'My Custom Prompt',
  description: 'A custom prompt for special use cases',
  category: 'script',
  provider: 'openai',
  outputFormat: 'json',
  version: '1.0.0',
  template: 'Generate a script about {{topic}}',
  variables: [{ name: 'topic', description: 'The topic', required: true }],
  tags: ['custom', 'script'],
};

PromptRegistry.register(customTemplate);
```

---

## 🤖 Agent Workflow

For AI agents designing visual content, the recommended workflow:

```typescript
import { searchPrompts, renderPrompt, getPrompt, NANO_BANANA_PROMPTS } from './prompts';

async function selectPromptForScene(scene: Scene): Promise<RenderedPrompt> {
  // Step 1: Search for relevant prompts based on scene content
  const results = searchPrompts(scene.visualDirection, {
    category: 'image-generation',
    limit: 5,
  });

  // Step 2: Score and select best template
  let template: PromptTemplate;

  if (results.length > 0 && results[0].score > 0.6) {
    // High-confidence match
    template = results[0].template;
  } else {
    // Fall back to default based on scene type
    template = selectDefaultTemplate(scene);
  }

  // Step 3: Extract variables from scene
  const variables = {
    scene_description: scene.visualDirection,
    mood: scene.mood ?? 'professional',
    lighting: inferLighting(scene.text),
    aspect_ratio: '9:16',
  };

  // Step 4: Render and return
  return renderPrompt(template, variables);
}

function selectDefaultTemplate(scene: Scene): PromptTemplate {
  // Use scene hints to pick template
  if (scene.visualDirection.includes('vs') || scene.visualDirection.includes('comparison')) {
    return getPrompt(NANO_BANANA_PROMPTS.comparison)!;
  }
  if (scene.visualDirection.includes('abstract') || scene.visualDirection.includes('concept')) {
    return getPrompt(NANO_BANANA_PROMPTS.abstract)!;
  }
  if (scene.visualDirection.includes('person') || scene.visualDirection.includes('someone')) {
    return getPrompt(NANO_BANANA_PROMPTS.person)!;
  }
  // Default to cinematic
  return getPrompt(NANO_BANANA_PROMPTS.cinematic)!;
}
```

### Registry Metadata for Agent Decisions

Each template includes metadata to help agents make decisions:

```yaml
# Example template metadata
id: image-generation/cinematic-scene
category: image-generation # What stage of pipeline
provider: gemini # Which AI to use
outputFormat: text # Expected output format
tags:
  - nano-banana # For filtering
  - cinematic # Visual style
  - b-roll # Use case
variables:
  - name: scene_description
    required: true
  - name: mood
    required: false
    default: professional
examples: # Help agents understand output
  - input: { scene_description: 'coffee shop' }
    output: 'Cozy coffee shop interior...'
```

---

## 🙏 Attribution

All prompts sourced from open-source repositories are credited in [sources/ATTRIBUTIONS.md](sources/ATTRIBUTIONS.md).

**Primary Sources:**

- [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) - MIT License
- [ShortGPT](https://github.com/RayVentura/ShortGPT) - MIT License
- [short-video-maker](https://github.com/gyoridavid/short-video-maker) - MIT License

---

## 🔧 Development

### Adding New Prompts

1. Create a YAML file in the appropriate category folder:

```yaml
# src/prompts/templates/image-generation/my-prompt.yaml
id: image-generation/my-prompt
name: My New Prompt
description: What this prompt does
category: image-generation
provider: gemini
outputFormat: text
version: 1.0.0
template: |
  Generate an image of {{subject}} in {{style}} style.
  Mood: {{mood}}
variables:
  - name: subject
    description: The main subject
    required: true
  - name: style
    description: Visual style
    required: false
    default: photorealistic
  - name: mood
    description: Emotional tone
    required: false
    default: neutral
tags:
  - nano-banana
  - custom
examples:
  - input: { subject: 'a cat' }
    output: 'Generate an image of a cat in photorealistic style...'
```

2. The registry automatically loads all YAML files on startup.

3. Add to `PROMPT_IDS` in [index.ts](index.ts) for typed access:

```typescript
export const PROMPT_IDS = {
  // ... existing
  IMAGE_MY_PROMPT: 'image-generation/my-prompt',
} as const;
```

### Testing

```bash
npm test -- tests/unit/prompts/
```

### Template Variables

Use `{{variable}}` syntax for substitution:

```yaml
template: |
  Create a {{style}} image of {{subject}}.
  {{#if mood}}The mood should be {{mood}}.{{/if}}
```

Supported features:

- `{{variable}}` - Simple substitution
- `{{#if variable}}...{{/if}}` - Conditional blocks
- Default values in variable definitions
