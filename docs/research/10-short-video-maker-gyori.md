# Research Report: Short-Video-Maker (gyoridavid)

**Repo:** `gyoridavid/short-video-maker`  
**Location:** `vendor/short-video-maker-gyori/`  
**Stars:** New/Growing  
**Language:** TypeScript  
**License:** MIT

---

## What It Does

Open-source **MCP + REST server** for automated short video creation. TypeScript-based with **Remotion** rendering - very close to our target stack!

Key differentiator: Exposes both **MCP server** (for AI agents) and **REST API** for flexibility.

## Key Features

| Feature | Details |
|---------|---------|
| **MCP Server** | AI agent integration (n8n workflows) |
| **REST API** | Direct programmatic access |
| **TTS** | Kokoro TTS (English only) |
| **Captions** | Whisper for transcription |
| **Footage** | Pexels for backgrounds |
| **Music** | Genre/mood selection |
| **Rendering** | Remotion-based composition |
| **Web UI** | Included |

## Tech Stack

- **Language:** TypeScript ⭐
- **Video:** Remotion ⭐
- **TTS:** Kokoro (local, free)
- **Transcription:** Whisper
- **Footage:** Pexels API
- **Servers:** MCP + REST

## What We Can Reuse

### ✅ High Value (CRITICAL)
- **Remotion + TypeScript** - Same stack as us!
- **MCP server pattern** - Agent integration
- **REST API design** - Programmatic access
- **Kokoro TTS** - Free local TTS
- **n8n workflow examples** - Integration patterns

### ⚠️ Medium Value
- **Web UI** - Reference for future
- **Docker deployment** - Cloud patterns

### ❌ Not Needed
- Nothing - this is very aligned with our goals

## How It Helps Us

1. **TypeScript + Remotion patterns** - Direct code reference
2. **MCP server implementation** - How to expose to agents
3. **Kokoro TTS** - Free alternative to paid TTS
4. **Pexels + Whisper integration** - In our target stack
5. **n8n workflows** - Agent automation examples

## Key Files to Study

```
src/
├── server/
│   ├── mcp.ts           # MCP server ⭐
│   └── rest.ts          # REST API ⭐
├── video/
│   ├── composition.tsx  # Remotion component ⭐
│   └── render.ts        # Rendering logic
├── tts/
│   └── kokoro.ts        # TTS integration ⭐
└── captions/
    └── whisper.ts       # Transcription
```

## Requirements

- 3GB+ RAM (4GB recommended)
- 2+ vCPU
- 5GB+ disk
- Pexels API key
- Internet connection

## Gaps / Limitations

- English only (Kokoro limitation)
- Pexels-only footage
- Newer project (less battle-tested)

---

## Verdict

**Value: CRITICAL** 🔴 - This is **the most aligned project** with our goals! TypeScript + Remotion + MCP server. Should be our primary code reference for the content machine implementation.
