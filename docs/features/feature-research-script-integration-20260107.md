# Feature: Research → Script Integration

**Date:** 2026-01-07  
**Status:** Implemented  
**Grade:** A+ (Full Ecosystem Integration)

---

## Overview

The Research Module is now fully integrated into the content-machine pipeline, enabling evidence-based script generation. Research output can be injected into the script generation prompt, providing the LLM with verified facts, statistics, and suggested content angles.

## User Value

- **Evidence-backed content**: Scripts cite real sources instead of hallucinated facts
- **Improved credibility**: Generated content is grounded in actual research
- **Workflow efficiency**: Single command can research + generate scripts
- **Citation tracking**: Script output includes source URLs for transparency

---

## Usage

### Standalone Workflow (Two Commands)

```bash
# Step 1: Research the topic
cm research --query "TypeScript best practices 2025" --sources tavily --limit 5 --output research.json

# Step 2: Generate script with research context
cm script --topic "TypeScript best practices 2025" --research research.json --output script.json
```

### Integrated Workflow (Single Command)

```bash
# Auto-run research before script generation
cm generate "TypeScript best practices 2025" --research --output video.mp4

# Or provide existing research file
cm generate "TypeScript best practices 2025" --research research.json --output video.mp4
```

---

## Technical Details

### Research Context Injection

The `buildResearchContext()` function in [src/script/research-context.ts](../../src/script/research-context.ts) formats research output for LLM prompt injection:

```typescript
import { buildResearchContext, extractSourceUrls } from './research-context';

// Build context string (max 2500 chars, top 10 evidence items)
const context = buildResearchContext(research);

// Extract source URLs for citation tracking
const sources = extractSourceUrls(research);
```

**Context Format:**

```markdown
## Research Evidence
Use these verified facts in your script:

- **TypeScript 5.0 Features** (dev.to, relevance: 95%)
  Comprehensive overview of new TS features...
  Source: https://dev.to/article-url

## Suggested Content Angles
- listicle: "5 TypeScript tricks you're not using" (hook: "Stop writing JavaScript...")
```

### Script Output Metadata

Generated scripts include research metadata in `extra.research`:

```json
{
  "scenes": [...],
  "title": "TypeScript Best Practices 2025",
  "extra": {
    "research": {
      "sources": [
        "https://dev.to/article1",
        "https://medium.com/article2"
      ],
      "evidenceCount": 5,
      "query": "TypeScript best practices 2025"
    }
  }
}
```

### Scene-Level Citations (Optional)

Scenes can include source citations via the optional `sources` field:

```json
{
  "id": "scene-002",
  "text": "According to the 2025 State of JS survey...",
  "sources": ["https://stateofjs.com/2025"]
}
```

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   cm research   │────▶│   research.json │────▶│   cm script     │
│                 │     │                 │     │  --research     │
│  Query → API    │     │  Evidence +     │     │                 │
│  → Evidence     │     │  Angles         │     │  Context inject │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │   script.json   │
                                                │  + extra.research│
                                                └─────────────────┘
```

### Pipeline Integration

When using `cm generate --research`:

1. **Load or Run**: If path provided, load from file. If flag only, auto-run `cm research`
2. **Inject Context**: Research formatted and prepended to LLM prompt
3. **Track Sources**: URLs extracted and stored in script metadata
4. **Continue Pipeline**: Script flows to audio → visuals → render

---

## Configuration

### Context Limits

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_CONTEXT_LENGTH` | 2500 | Maximum characters in research context |
| `MAX_EVIDENCE_ITEMS` | 10 | Maximum evidence items to include |

### Relevance Sorting

Evidence is sorted by `relevanceScore` (descending) before inclusion. Only the top 10 most relevant items are included to prevent prompt bloat.

---

## CLI Options

### cm script

```bash
--research <path>    # Path to research JSON file from cm research
```

### cm generate

```bash
--research [path]    # Boolean flag or path to research file
                     # If no path: auto-runs research before script
                     # If path: loads existing research file
```

---

## Testing

### Unit Tests

- `tests/integration/research/research-script-integration.test.ts` (9 tests)
  - `buildResearchContext()` formatting
  - `extractSourceUrls()` extraction
  - `generateScript()` with research option
  - SceneSchema sources validation

### Integration Tests

- `tests/integration/research/generate-with-research.test.ts` (3 tests)
  - Pipeline config accepts research option
  - Research flows through script stage
  - Sources tracked in output

### E2E Verification

```bash
# Verified working flow:
cm research --query "TypeScript best practices 2025" --sources tavily --limit 3 --mock
cm script --topic "TypeScript best practices 2025" --research research-demo.json --mock
# → script.json contains extra.research with 3 source URLs
```

---

## Related

- [cm-research-reference-20260106.md](../reference/cm-research-reference-20260106.md)
- [cm-script-reference-20260106.md](../reference/cm-script-reference-20260106.md)
- [cm-generate-reference-20260106.md](../reference/cm-generate-reference-20260106.md)
- [guide-cli-ux-cm-research-20260106.md](../guides/guide-cli-ux-cm-research-20260106.md)

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-07 | Initial implementation - Plans 1, 2, 4 complete |

