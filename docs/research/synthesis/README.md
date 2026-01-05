# Research Synthesis Index

**Date:** 2026-01-04  
**Total Documents:** 86 deep-dives → 12 categories → 4 themes → 1 master  
**Purpose:** Navigate the content-machine research pyramid

---

## Pyramid Structure

```
                         ┌─────────────────────────────────┐
                         │          LAYER 1                │
                         │     Master Architecture         │
                         │         (1 doc)                 │
                         └───────────────┬─────────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
    ┌─────────▼─────────┐    ┌───────────▼───────────┐   ┌─────────▼─────────┐
    │     LAYER 2       │    │       LAYER 2         │   │     LAYER 2       │
    │    Theme 1-2      │    │      Theme 3-4        │   │                   │
    │    (4 docs)       │    │                       │   │                   │
    └─────────┬─────────┘    └───────────┬───────────┘   └─────────┬─────────┘
              │                          │                          │
    ┌─────────┴─────────────────────────────────────────────────────┴─────────┐
    │                              LAYER 3                                     │
    │                       Category Syntheses                                 │
    │                           (12 docs)                                      │
    └─────────────────────────────────────┬───────────────────────────────────┘
                                          │
    ┌─────────────────────────────────────┴───────────────────────────────────┐
    │                              LAYER 4                                     │
    │                       Deep Dive Documents                                │
    │                           (86 docs)                                      │
    └─────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Master Architecture

| Document                                                                 | Purpose                                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [L1-MASTER-ARCHITECTURE-20260104.md](L1-MASTER-ARCHITECTURE-20260104.md) | **Final architecture decisions**, technology stack, implementation roadmap |

---

## Layer 2: Theme Syntheses

| Document                                                                                             | Categories | Purpose                        |
| ---------------------------------------------------------------------------------------------------- | ---------- | ------------------------------ |
| [L2-THEME-1-CONTENT-PIPELINE-20260104.md](L2-THEME-1-CONTENT-PIPELINE-20260104.md)                   | A, B, J    | INPUT → RESEARCH → SCRIPT flow |
| [L2-THEME-2-VIDEO-PRODUCTION-20260104.md](L2-THEME-2-VIDEO-PRODUCTION-20260104.md)                   | C, D, E, F | TTS → Captions → Render flow   |
| [L2-THEME-3-AI-ORCHESTRATION-20260104.md](L2-THEME-3-AI-ORCHESTRATION-20260104.md)                   | G, H, I    | Agents → MCP → Queues          |
| [L2-THEME-4-INFRASTRUCTURE-PUBLISHING-20260104.md](L2-THEME-4-INFRASTRUCTURE-PUBLISHING-20260104.md) | K, L       | Storage → API → Distribution   |

---

## Layer 3: Category Syntheses

| Category | Document                                                                                       | Deep Dives | Focus                      |
| -------- | ---------------------------------------------------------------------------------------------- | ---------- | -------------------------- |
| **A**    | [L3-CAT-A-VIDEO-GENERATORS-20260104.md](L3-CAT-A-VIDEO-GENERATORS-20260104.md)                 | 15         | End-to-end generators      |
| **B**    | [L3-CAT-B-BLUEPRINT-REPOS-20260104.md](L3-CAT-B-BLUEPRINT-REPOS-20260104.md)                   | 4          | Primary patterns           |
| **C**    | [L3-CAT-C-RENDERING-COMPOSITION-20260104.md](L3-CAT-C-RENDERING-COMPOSITION-20260104.md)       | 10         | Remotion, FFmpeg           |
| **D**    | [L3-CAT-D-CLIPPING-SCENE-DETECTION-20260104.md](L3-CAT-D-CLIPPING-SCENE-DETECTION-20260104.md) | 9          | FunClip, PySceneDetect     |
| **E**    | [L3-CAT-E-CAPTIONS-TRANSCRIPTION-20260104.md](L3-CAT-E-CAPTIONS-TRANSCRIPTION-20260104.md)     | 5          | WhisperX, Captacity        |
| **F**    | [L3-CAT-F-TTS-AUDIO-20260104.md](L3-CAT-F-TTS-AUDIO-20260104.md)                               | 4          | Kokoro, EdgeTTS            |
| **G**    | [L3-CAT-G-AGENT-FRAMEWORKS-20260104.md](L3-CAT-G-AGENT-FRAMEWORKS-20260104.md)                 | 10         | OpenAI Agents, Pydantic AI |
| **H**    | [L3-CAT-H-MCP-ECOSYSTEM-20260104.md](L3-CAT-H-MCP-ECOSYSTEM-20260104.md)                       | 7          | FastMCP, MCP servers       |
| **I**    | [L3-CAT-I-ORCHESTRATION-QUEUES-20260104.md](L3-CAT-I-ORCHESTRATION-QUEUES-20260104.md)         | 6          | BullMQ, Temporal           |
| **J**    | [L3-CAT-J-CONNECTORS-SOURCES-20260104.md](L3-CAT-J-CONNECTORS-SOURCES-20260104.md)             | 5          | Reddit, YouTube, HN        |
| **K**    | [L3-CAT-K-INFRASTRUCTURE-20260104.md](L3-CAT-K-INFRASTRUCTURE-20260104.md)                     | 6          | MinIO, Qdrant, PostgreSQL  |
| **L**    | [L3-CAT-L-PUBLISHING-20260104.md](L3-CAT-L-PUBLISHING-20260104.md)                             | 3          | YouTube, TikTok APIs       |

---

## Layer 4: Deep Dive Inventory

See [LAYER-4-INVENTORY-20260104.md](LAYER-4-INVENTORY-20260104.md) for complete listing of 86 deep-dive documents with category assignments.

---

## Technology Decisions Summary

### Selected Stack

| Component          | Technology           | Document |
| ------------------ | -------------------- | -------- |
| **Rendering**      | Remotion             | L3-CAT-C |
| **TTS**            | Kokoro-FastAPI       | L3-CAT-F |
| **ASR**            | WhisperX             | L3-CAT-E |
| **Captions**       | remotion-subtitles   | L3-CAT-E |
| **Agent (TS)**     | OpenAI Agents SDK    | L3-CAT-G |
| **Agent (Python)** | Pydantic AI          | L3-CAT-G |
| **MCP**            | FastMCP 2.0          | L3-CAT-H |
| **Queue**          | BullMQ               | L3-CAT-I |
| **Storage**        | MinIO                | L3-CAT-K |
| **Vector DB**      | Qdrant               | L3-CAT-K |
| **Database**       | PostgreSQL + Drizzle | L3-CAT-K |
| **Publishing**     | Official APIs        | L3-CAT-L |

### Blueprint Repos

| Repo                        | Use                          | Document |
| --------------------------- | ---------------------------- | -------- |
| **short-video-maker-gyori** | Primary architecture pattern | L3-CAT-B |
| **vidosy**                  | JSON → video configuration   | L3-CAT-B |
| **ShortGPT**                | EdgeTTS integration          | L3-CAT-B |
| **chuk-mcp-remotion**       | 51 Remotion components       | L3-CAT-C |

---

## Reading Path

### For Architecture Understanding

1. Start with **L1-MASTER-ARCHITECTURE** for complete picture
2. Dive into **L2-THEME-\*\*** for domain context
3. Reference **L3-CAT-\*\*** for technology details

### For Implementation

1. **L3-CAT-B** (Blueprint repos) for patterns
2. **L3-CAT-C** (Rendering) for Remotion setup
3. **L3-CAT-G** (Agents) for orchestration
4. **L3-CAT-K** (Infrastructure) for services

### For Specific Technologies

- **TTS**: L3-CAT-F, then deep-dives for Kokoro, EdgeTTS
- **Captions**: L3-CAT-E, then deep-dives for WhisperX
- **Rendering**: L3-CAT-C, then deep-dives for Remotion
- **Agents**: L3-CAT-G, then deep-dives for OpenAI Agents SDK

---

## Statistics

| Metric                      | Count |
| --------------------------- | ----- |
| **Vendored Repos Analyzed** | 139   |
| **Deep Dive Documents**     | 86    |
| **Category Syntheses**      | 12    |
| **Theme Syntheses**         | 4     |
| **Master Documents**        | 1     |
| **Total Synthesis Docs**    | 18    |

---

## Document Naming Convention

All documents follow: `{TYPE}-{NAME}-{YYYYMMDD}.md`

- **L1-** = Layer 1 (Master)
- **L2-** = Layer 2 (Theme)
- **L3-** = Layer 3 (Category)
- **DD-** = Deep Dive (Layer 4)

---

_Synthesis Index Created: 2026-01-04_
