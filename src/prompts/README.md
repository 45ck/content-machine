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

## 📚 Prompt Categories

### Script Generation

Prompts for generating video scripts from topics.

| Template                 | Source            | Use Case               |
| ------------------------ | ----------------- | ---------------------- |
| `video-script-generator` | MoneyPrinterTurbo | General video scripts  |
| `facts-generator`        | ShortGPT          | Facts/trivia shorts    |
| `chat-video-script`      | ShortGPT          | Conversational scripts |

### Visual Search

Prompts for generating stock footage search terms.

| Template                | Source            | Use Case             |
| ----------------------- | ----------------- | -------------------- |
| `video-search-terms`    | MoneyPrinterTurbo | Stock video queries  |
| `image-query-generator` | ShortGPT          | Image search queries |
| `video-segment-queries` | ShortGPT          | Timed video segments |

### AI Image Generation (Nano Banana)

Prompts for generating images with Gemini/DALL-E.

| Template           | Source          | Use Case               |
| ------------------ | --------------- | ---------------------- |
| `cinematic-scene`  | content-machine | Cinematic B-roll style |
| `product-shot`     | content-machine | Product photography    |
| `abstract-concept` | content-machine | Abstract/metaphorical  |
| `person-action`    | content-machine | Person doing action    |

---

## 🔍 Usage

```typescript
import { getPrompt, searchPrompts, PromptRegistry } from './prompts';

// Get a specific prompt template
const template = getPrompt('script/video-script-generator');

// Search prompts by keyword
const results = searchPrompts('image generation');

// List all prompts in a category
const imagePrompts = PromptRegistry.listByCategory('image-generation');

// Render a prompt with variables
const rendered = template.render({
  topic: 'Redis vs PostgreSQL',
  paragraphs: 3,
  language: 'en',
});
```

---

## 🙏 Attribution

All prompts sourced from open-source repositories are credited in [sources/ATTRIBUTIONS.md](sources/ATTRIBUTIONS.md).

**Primary Sources:**

- [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) - MIT License
- [ShortGPT](https://github.com/RayVentura/ShortGPT) - MIT License
- [short-video-maker](https://github.com/gyoridavid/short-video-maker) - MIT License

---

## 🤖 For Agents

When designing visual content, search this library first:

```typescript
// Agent workflow
const context = await searchPrompts('cinematic scene generation');
const template = selectBestTemplate(context, userRequest);
const prompt = template.render(extractVariables(userRequest));
```

The registry includes metadata for:

- `category` - script, visuals, image-generation, editing
- `provider` - Which AI provider (gemini, openai, pexels)
- `outputFormat` - json, text, structured
- `variables` - Required template variables
- `examples` - Example outputs
