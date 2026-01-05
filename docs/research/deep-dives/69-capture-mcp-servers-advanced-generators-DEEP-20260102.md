# Deep Dive #69: Capture, MCP Servers & Advanced Video Generators

**Document ID:** DD-069  
**Date:** 2026-01-02  
**Category:** Capture, MCP Servers, Video Generators  
**Status:** Complete  
**Word Count:** ~6,500

---

## Executive Summary

This deep dive covers three remaining technology areas for the content-machine platform:

1. **Capture Tools** – Playwright for product-truthful UI recording
2. **Specialized MCP Servers** – Qdrant, Plainly, Nano-Banana ecosystem
3. **Advanced Video Generators** – Clip-Anything, VideoGraphAI, Cassette, OBrainRot, Crank

These tools complete the full technology stack from capture to generation to publishing.

---

## 1. Capture Tools

### 1.1 Playwright

**Source:** `vendor/capture/playwright/`  
**Creator:** Microsoft  
**Stars:** 68k+  
**License:** Apache 2.0

#### Overview

Playwright is **the best browser automation framework** for capturing product-truthful UI demonstrations. It's the recommended approach for content-machine's capture pipeline.

#### Key Features

| Feature                  | Description                          |
| ------------------------ | ------------------------------------ |
| **Cross-browser**        | Chromium, Firefox, WebKit            |
| **Cross-platform**       | Linux, macOS, Windows                |
| **Auto-wait**            | No flaky tests                       |
| **Tracing**              | Capture execution screenshots/videos |
| **Codegen**              | Record actions, generate code        |
| **Network Interception** | Mock APIs, modify requests           |

#### Code Patterns

##### Basic Page Screenshot

```typescript
import { test } from '@playwright/test';

test('Page Screenshot', async ({ page }) => {
  await page.goto('https://yourproduct.com/');
  await page.screenshot({ path: 'product-screenshot.png' });
});
```

##### Mobile Emulation

```typescript
import { test, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 13 Pro'],
  locale: 'en-US',
});

test('Mobile Demo', async ({ page }) => {
  await page.goto('https://yourproduct.com/mobile');
  await page.screenshot({ path: 'mobile-demo.png' });
});
```

##### Video Recording

```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  recordVideo: {
    dir: './videos/',
    size: { width: 1920, height: 1080 },
  },
});

const page = await context.newPage();
await page.goto('https://yourproduct.com/demo');

// Perform actions...
await page.click('.feature-button');
await page.waitForSelector('.result');

await context.close(); // Video is saved
await browser.close();
```

##### Network Interception for Demo Data

```typescript
test('Demo with Mock Data', async ({ page }) => {
  // Intercept API calls with demo data
  await page.route('**/api/users', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify([{ id: 1, name: 'Demo User', avatar: '...' }]),
    });
  });

  await page.goto('https://yourproduct.com/dashboard');
  await page.screenshot({ path: 'dashboard-demo.png' });
});
```

#### MCP Integration

Playwright can be wrapped as an MCP server for AI-controlled capture:

```python
from fastmcp import FastMCP
from playwright.async_api import async_playwright

mcp = FastMCP("Playwright Capture")

@mcp.tool
async def capture_screenshot(url: str, selector: str = None) -> str:
    """Capture a screenshot of a webpage or specific element."""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(url)

        if selector:
            element = await page.wait_for_selector(selector)
            await element.screenshot(path='capture.png')
        else:
            await page.screenshot(path='capture.png')

        await browser.close()
        return 'capture.png'

@mcp.tool
async def record_demo(url: str, actions: list, output_path: str) -> str:
    """Record a video of UI actions."""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            record_video_dir='./videos/',
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        await page.goto(url)

        for action in actions:
            if action['type'] == 'click':
                await page.click(action['selector'])
            elif action['type'] == 'type':
                await page.fill(action['selector'], action['text'])
            elif action['type'] == 'wait':
                await page.wait_for_timeout(action['ms'])

        await context.close()
        await browser.close()
        return output_path
```

#### Why Playwright for content-machine

1. **Product Truthfulness:** Capture real product UI, not mockups
2. **Automation:** Script complex demo flows
3. **Cross-platform:** Test on multiple browsers
4. **Video Recording:** Native video capture
5. **MCP Ready:** Easy to integrate with agents

---

## 2. Specialized MCP Servers

### 2.1 Qdrant MCP Server

**Source:** `vendor/mcp-servers/qdrant-mcp-server/`  
**License:** MIT

#### Overview

The Qdrant MCP server provides **semantic memory capabilities** for LLM agents using the Qdrant vector database.

#### Tools Provided

| Tool           | Description                            |
| -------------- | -------------------------------------- |
| `qdrant-store` | Store information with embeddings      |
| `qdrant-find`  | Retrieve relevant information by query |

#### Configuration

```bash
QDRANT_URL="http://localhost:6333"
COLLECTION_NAME="content-machine-memory"
EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
```

#### Use Case for content-machine

- **Content Memory:** Store previously generated scripts
- **Trend Memory:** Remember researched trends
- **Product Knowledge:** Store product documentation for RAG
- **Avoid Repetition:** Find similar content before generating

#### Integration Pattern

```python
# Claude Desktop config
{
  "mcpServers": {
    "qdrant-memory": {
      "command": "uvx",
      "args": ["mcp-server-qdrant"],
      "env": {
        "QDRANT_URL": "http://localhost:6333",
        "COLLECTION_NAME": "content-machine"
      }
    }
  }
}
```

### 2.2 Plainly MCP Server

**Source:** `vendor/mcp-servers/plainly-mcp-server/`  
**Creator:** Plainly Videos  
**License:** MIT

#### Overview

Plainly MCP server enables LLM clients to **generate videos using Plainly's cloud rendering platform**.

#### Tools Provided

| Tool                           | Description              |
| ------------------------------ | ------------------------ |
| `list_renderable_items`        | List available templates |
| `get_renderable_items_details` | Get template parameters  |
| `render_item`                  | Submit render job        |
| `check_render_status`          | Check render progress    |

#### Use Case

Alternative to Remotion for cloud-based video rendering. Plainly handles infrastructure, scaling, and rendering.

```json
{
  "servers": {
    "plainly": {
      "command": "npx",
      "args": ["-y", "@plainly-videos/mcp-server@latest"],
      "env": {
        "PLAINLY_API_KEY": "<API_KEY>"
      }
    }
  }
}
```

### 2.3 Nano-Banana MCP Ecosystem

**Source:** `vendor/mcp-servers/Nano-Banana-MCP/` and variants  
**Purpose:** Image generation via AI

#### Variants Available

| Server                  | Focus                 |
| ----------------------- | --------------------- |
| `Nano-Banana-MCP`       | Core image generation |
| `gemini-nanobanana-mcp` | Gemini integration    |
| `nanobanana-mcp-server` | Server implementation |
| `nanobanana-cli`        | CLI interface         |

#### Use Case for content-machine

Generate AI images for video assets:

- Thumbnail generation
- Background images
- Character images for demos
- Stock footage alternatives

### MCP Server Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server Ecosystem                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │   Qdrant     │ │   Plainly    │ │ Nano-Banana  │         │
│  │   Memory     │ │   Render     │ │   Images     │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│         │                │                │                  │
│         ▼                ▼                ▼                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Content Planning Agent                      ││
│  │                  (LangGraph)                             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Advanced Video Generators

### 3.1 Clip-Anything

**Source:** `vendor/Clip-Anything/`  
**Creator:** SamurAIGPT  
**Stars:** 1k+  
**License:** MIT

#### Core Innovation

**Multimodal AI clipping** using visual, audio, and sentiment cues. Uses prompt-based clip selection.

#### Key Features

| Feature                | Description                     |
| ---------------------- | ------------------------------- |
| **Visual Analysis**    | Object, scene, action detection |
| **Audio Analysis**     | Sound, speech detection         |
| **Sentiment Analysis** | Emotion detection               |
| **Virality Scoring**   | Rate scenes for engagement      |
| **Prompt-based**       | Natural language clip selection |

#### API Integration

```python
# Using Vadoo.tv API
import vadoo

clips = vadoo.create_clips(
    video_url="https://...",
    prompt="Find the most exciting moments"
)
```

#### Use Case for content-machine

- **Long-form to Short-form:** Extract highlights from webinars, tutorials
- **Virality Optimization:** Select high-engagement segments
- **Multi-modal Selection:** Use visual + audio cues

### 3.2 VideoGraphAI

**Source:** `vendor/VideoGraphAI/`  
**Creator:** mikeoller82  
**Stars:** ~200  
**License:** MIT

#### Core Innovation

**Graph-based agent architecture** for YouTube Shorts automation. Uses multiple AI models in a coordinated pipeline.

#### Workflow

```
1. Input → Topic, timeframe, video length
2. Research → Tavily Search API
3. Content Creation → LLM (Groq/OpenAI)
4. Media Production → TogetherAI (FLUX.schnell)
5. Audio → F5-TTS voiceover
6. Subtitles → Gentle synchronization
7. Compilation → FFmpeg assembly
8. Delivery → Streamlit download
```

#### Tech Stack

| Component     | Tool                      |
| ------------- | ------------------------- |
| **Research**  | Tavily Search API         |
| **LLM**       | Groq (LLaMA) / OpenAI     |
| **Images**    | TogetherAI (FLUX.schnell) |
| **TTS**       | F5-TTS                    |
| **Subtitles** | Gentle                    |
| **Video**     | FFmpeg                    |
| **UI**        | Streamlit                 |

#### Code Pattern

```bash
# Install
git clone https://github.com/mikeoller82/VideoGraphAI.git
cd VideoGraphAI
pip install -r requirements.txt

# Configure
cp .env.example .env
# Add API keys: GROQ_API_KEY, TOGETHER_API_KEY, TAVILY_API_KEY

# Run
docker run -d -p 8765:8765 lowerquality/gentle  # Subtitles
streamlit run app.py
```

#### Key Insight

VideoGraphAI demonstrates a **research-first approach** – every video starts with Tavily Search to ensure content is current and accurate.

### 3.3 Cassette

**Source:** `vendor/Cassette/`  
**Creator:** M3rcuryLake  
**Stars:** ~200  
**License:** MIT

#### Core Innovation

**Terminal-based** 30-second explanatory video generation. Inspired by Brainrot.js.

#### Features

| Feature                | Description                 |
| ---------------------- | --------------------------- |
| **Terminal UI**        | No GUI required             |
| **GPT-3.5**            | Transcript generation       |
| **UnrealSpeech**       | Free TTS API                |
| **Custom Fonts**       | Multiple style options      |
| **Background Options** | Gameplay, colors            |
| **Subtitle Styles**    | Word or sentence timestamps |

#### Tech Stack

| Component      | Tool                    |
| -------------- | ----------------------- |
| **Transcript** | GPT-3.5-turbo (via g4f) |
| **TTS**        | UnrealSpeech API        |
| **Video**      | FFmpeg + MoviePy        |
| **Audio Viz**  | seewav module           |

#### Use Case

Lightweight, free (mostly) video generation for quick content experiments.

### 3.4 OBrainRot

**Source:** `vendor/OBrainRot/`  
**Creator:** harvestingmoon  
**Stars:** ~300  
**License:** MIT

#### Core Innovation

**Reddit-to-video generator** with forced alignment for accurate subtitles.

#### Architecture

```
┌───────────────────────────────────────────────────────────┐
│                      OBrainRot                             │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  1. Switch: Thread vs Link Detection                       │
│     └── Sentiment analysis (VADER + LLaMA 3.3)            │
│                                                            │
│  2. Scraping: Reddit API                                   │
│     └── Extract title + story                             │
│                                                            │
│  3. Voice: Coqui xTTS v2                                   │
│     └── Text → Audio with custom voice                    │
│                                                            │
│  4. Pre-processing: RegEx cleanup                          │
│                                                            │
│  5. Forced Alignment: wav2vec2                             │
│     └── Accurate word timestamps                          │
│                                                            │
│  6. FFmpeg: Video + Audio + Subtitles (.ass)              │
│                                                            │
│  7. Image Overlay: Per-sentence image switching           │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

#### Key Technical Detail

Uses **wav2vec2 forced alignment** for precise subtitle synchronization:

> "Uses a frame-wise label probability from the audio, creates a trellis matrix representing the probability of labels aligned per time step before using the most likely path from the trellis matrix."

#### Custom Assets

| Asset Type            | Location                          |
| --------------------- | --------------------------------- |
| Image Overlays        | `assets/[folder_name]/` (512x512) |
| Audio Samples         | `assets/` directory               |
| Pre-loaded Characters | trump, spongebob, lebron, griffin |

#### Docker Deployment

```bash
docker build -t obrainrot:latest .
docker run -it -p 8000:5000 obrainrot:latest /bin/bash
```

### 3.5 Crank

**Source:** `vendor/Crank/`  
**Creator:** ecnivs  
**Stars:** ~500  
**License:** Custom

#### Core Innovation

**Topic-to-complete-YouTube-Short** generator with automatic upload capability.

#### Pipeline

```
Topic → Research → Script → Media → Voice → Subtitles → Video → Upload
```

#### Configuration (`config/preset.yml`)

```yaml
NAME: 'My Channel'
PROMPT: 'Create a video about...'
UPLOAD: true
DELAY: 2.5 # Hours before upload
WHISPER_MODEL: 'small'
FONT: 'Comic Sans MS'
```

#### Key Features

| Feature            | Description                     |
| ------------------ | ------------------------------- |
| **Gemini API**     | Content generation              |
| **Whisper**        | Speech-to-text for subtitles    |
| **YouTube Upload** | OAuth 2.0 integration           |
| **Scheduling**     | Delay uploads by hours          |
| **Plugin System**  | Custom background video sources |

#### Use Case

End-to-end automation including **direct YouTube upload** – the most complete single-tool solution.

---

## 4. Generator Comparison Matrix

| Generator         | Tech Stack         | TTS          | ASR         | Auto-Upload | License |
| ----------------- | ------------------ | ------------ | ----------- | ----------- | ------- |
| **Clip-Anything** | Python             | N/A          | Multi-modal | No          | MIT     |
| **VideoGraphAI**  | Python + Streamlit | F5-TTS       | Gentle      | No          | MIT     |
| **Cassette**      | Python (terminal)  | UnrealSpeech | N/A         | No          | MIT     |
| **OBrainRot**     | Python + Docker    | Coqui xTTS   | wav2vec2    | No          | MIT     |
| **Crank**         | Python + UV        | Whisper      | Whisper     | YouTube     | Custom  |

### Best Use Cases

| Generator         | Best For                               |
| ----------------- | -------------------------------------- |
| **Clip-Anything** | Extracting highlights from long videos |
| **VideoGraphAI**  | Research-based news/topic videos       |
| **Cassette**      | Quick experimental content             |
| **OBrainRot**     | Reddit story videos                    |
| **Crank**         | Fully automated YouTube channel        |

---

## 5. Integration Recommendations

### Capture Layer

| Task          | Tool                      | Approach            |
| ------------- | ------------------------- | ------------------- |
| Product demos | Playwright                | Record interactions |
| Mobile demos  | Playwright + devices      | Emulated capture    |
| API demos     | Playwright + interception | Mock data           |

### Memory Layer

| Task            | Tool                |
| --------------- | ------------------- |
| Content memory  | Qdrant MCP          |
| Trend history   | Qdrant MCP          |
| RAG for scripts | Qdrant + LlamaIndex |

### Generation Layer

| Content Type        | Recommended Tool         |
| ------------------- | ------------------------ |
| Product demos       | content-machine (custom) |
| Topic explainers    | VideoGraphAI pattern     |
| Reddit stories      | OBrainRot pattern        |
| Long-to-short clips | Clip-Anything / FunClip  |
| Full automation     | Crank pattern            |

### Complete Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                 content-machine Pipeline                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CAPTURE LAYER                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Playwright MCP Server                                   ││
│  │  - Product UI recording                                  ││
│  │  - Demo flow automation                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                           │                                  │
│                           ▼                                  │
│  MEMORY LAYER                                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Qdrant MCP Server                                       ││
│  │  - Content history                                       ││
│  │  - Product knowledge base                                ││
│  └─────────────────────────────────────────────────────────┘│
│                           │                                  │
│                           ▼                                  │
│  GENERATION LAYER                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Content Pipeline (LangGraph)                            ││
│  │  - Trend research                                        ││
│  │  - Script generation                                     ││
│  │  - TTS (Kokoro)                                          ││
│  │  - Captions (WhisperX)                                   ││
│  │  - Render (chuk-motion/Remotion)                         ││
│  └─────────────────────────────────────────────────────────┘│
│                           │                                  │
│                           ▼                                  │
│  PUBLISHING LAYER                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Publishing MCP Server                                   ││
│  │  - TikTok (TiktokAutoUploader)                           ││
│  │  - YouTube (Data API)                                    ││
│  │  - Multi-platform (Mixpost)                              ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Patterns to Extract

### From VideoGraphAI

- **Research-first approach:** Always start with Tavily search
- **Graph-based agents:** LangGraph-style workflow
- **Multi-model pipeline:** Different models for different tasks

### From OBrainRot

- **Forced alignment:** wav2vec2 for precise timestamps
- **Sentiment filtering:** VADER + LLM for content selection
- **Image overlay algorithm:** Per-sentence image switching

### From Crank

- **Complete automation:** Topic → Upload in one command
- **Plugin system:** Extensible background sources
- **Config-driven:** YAML-based customization

### From Clip-Anything

- **Multi-modal analysis:** Visual + audio + sentiment
- **Virality scoring:** Engagement prediction
- **Prompt-based selection:** Natural language clip identification

---

## 7. Document Metadata

| Field            | Value          |
| ---------------- | -------------- |
| **Document ID**  | DD-069         |
| **Created**      | 2026-01-02     |
| **Last Updated** | 2026-01-02     |
| **Author**       | Research Agent |
| **Status**       | Complete       |
| **Dependencies** | DD-067, DD-068 |

---

## 8. Quick Reference

### Playwright Screenshot

```typescript
await page.goto('https://...');
await page.screenshot({ path: 'screenshot.png' });
```

### Playwright Video

```typescript
const context = await browser.newContext({
  recordVideo: { dir: './videos/' },
});
```

### Qdrant MCP Config

```json
{
  "command": "uvx",
  "args": ["mcp-server-qdrant"],
  "env": {
    "QDRANT_URL": "http://localhost:6333",
    "COLLECTION_NAME": "my-collection"
  }
}
```

---

**Key Takeaways:**

1. **Playwright** is essential for product-truthful capture
2. **Qdrant MCP** provides semantic memory for agents
3. **VideoGraphAI** shows best practice for research-first generation
4. **OBrainRot** demonstrates wav2vec2 forced alignment
5. **Crank** is the most complete topic-to-upload solution
6. **Pattern extraction** from all generators improves content-machine design
