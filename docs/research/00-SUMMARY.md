# Vendored Repos Research Summary

**Date:** January 2026  
**Purpose:** Understand what we have before building anything

---

## Quick Reference

| Repo | Location | Value | Primary Use |
|------|----------|-------|-------------|
| **template-tiktok** | `templates/template-tiktok-base/` | 🔴 CRITICAL | Video composition + captions |
| **openai-agents-js** | `vendor/openai-agents-js/` | 🔴 CRITICAL | Agent orchestration + tools |
| **mcp-reddit** | `connectors/mcp-reddit/` | 🟠 HIGH | Trend research |
| **MoneyPrinterTurbo** | `vendor/MoneyPrinterTurbo/` | 🟠 HIGH | Script + stock footage patterns |
| **AI-Youtube-Shorts** | `vendor/AI-Youtube-Shorts-Generator/` | 🟡 MEDIUM-HIGH | Whisper + highlight patterns |
| **template-audiogram** | `templates/template-audiogram/` | 🟡 MEDIUM | Caption generation reference |
| **MoneyPrinter** | `vendor/MoneyPrinter/` | 🟢 LOW | TikTok TTS fallback |

---

## Architecture Insights

### What We DON'T Need to Build (Already Exists)

| Capability | Source | Notes |
|------------|--------|-------|
| Video composition (React) | template-tiktok | Remotion framework |
| Caption generation | template-tiktok, template-audiogram | Whisper.cpp integration |
| Agent orchestration | openai-agents-js | Official OpenAI SDK |
| MCP tool framework | openai-agents-js | MCP server support |
| Reddit trend fetching | mcp-reddit | MCP-ready |
| Script generation prompts | MoneyPrinterTurbo | Battle-tested |
| Stock footage patterns | MoneyPrinterTurbo | Pexels integration |
| Word-by-word captions | template-tiktok | Built-in animations |

### What We NEED to Build

| Capability | Why | Reference |
|------------|-----|-----------|
| CLI orchestrator | User experience | Our MVP-PLAN.md |
| Content machine agent | Domain logic | openai-agents-js patterns |
| TTS integration | Audio generation | MoneyPrinterTurbo for patterns |
| Custom Remotion compositions | Our visual style | template-tiktok base |
| Niche-specific prompts | Our content focus | MoneyPrinterTurbo prompts |
| Export pipeline | Multi-platform | Remotion render |

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Content Machine CLI                          │
│                     (cm research, cm plan, cm script, etc.)     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Content Agent (openai-agents-js)              │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │ Research │  │  Script  │  │   TTS    │  │  Render  │       │
│   │   Tool   │  │   Tool   │  │   Tool   │  │   Tool   │       │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└────────┼─────────────┼──────────────┼─────────────┼─────────────┘
         │             │              │             │
         ▼             ▼              ▼             ▼
┌──────────────┐ ┌───────────┐ ┌───────────┐ ┌─────────────────┐
│ mcp-reddit   │ │ LLM +     │ │ OpenAI    │ │ Remotion        │
│ (trends)     │ │ Prompts   │ │ TTS API   │ │ (template-tiktok)│
└──────────────┘ │ (MPTurbo) │ └───────────┘ │ + Whisper.cpp   │
                 └───────────┘               └─────────────────┘
```

---

## Next Steps (Recommended Order)

### Phase 1: Foundation
1. [ ] Set up Remotion in content-machine (copy template-tiktok structure)
2. [ ] Verify Whisper.cpp caption generation works
3. [ ] Create basic CLI entry point

### Phase 2: Agent Core
4. [ ] Set up openai-agents-js dependency
5. [ ] Create ContentAgent with placeholder tools
6. [ ] Implement `research` tool using mcp-reddit patterns

### Phase 3: Script Generation
7. [ ] Study MoneyPrinterTurbo prompts
8. [ ] Implement `script` tool with our niche focus
9. [ ] Add script review/edit flow

### Phase 4: Audio + Video
10. [ ] Integrate OpenAI TTS (or ElevenLabs)
11. [ ] Create custom Remotion composition
12. [ ] Implement render pipeline

### Phase 5: Polish
13. [ ] Add export to multiple formats (TikTok, Shorts, Reels)
14. [ ] Add stock footage integration (Pexels)
15. [ ] Human-in-the-loop approvals

---

## Key Learnings

### From MoneyPrinterTurbo
- Script prompts that work for engagement
- Clip duration tuning (3-5s per clip)
- Subtitle styling (font, color, outline)
- Pexels API integration patterns

### From template-tiktok
- Remotion composition structure
- Whisper.cpp integration via `sub.mjs`
- Caption animation patterns
- Render pipeline

### From openai-agents-js
- Tool definition patterns with Zod
- MCP server integration
- Structured outputs
- Human-in-the-loop flows

### From mcp-reddit
- Trend fetching for research phase
- Agent-callable tools pattern

---

## Don't Reinvent

These are SOLVED problems with vendored solutions:

1. ❌ Don't build video composition → Use Remotion
2. ❌ Don't build caption generation → Use Whisper.cpp
3. ❌ Don't build agent framework → Use openai-agents-js
4. ❌ Don't build Reddit scraping → Use mcp-reddit
5. ❌ Don't guess script prompts → Study MoneyPrinterTurbo

Focus our energy on:
- **Integration** - Connecting these pieces
- **Domain logic** - Our specific content strategy
- **UX** - The CLI/semi-manual workflow
- **Customization** - Our visual style

---

## Full Research Reports

1. [MoneyPrinterTurbo](01-moneyprinter-turbo.md) - Script + stock footage
2. [MoneyPrinter](02-moneyprinter.md) - TikTok TTS fallback
3. [AI-Youtube-Shorts-Generator](03-ai-youtube-shorts-generator.md) - Whisper + highlights
4. [Template TikTok](04-template-tiktok.md) - Video composition
5. [Template Audiogram](05-template-audiogram.md) - Caption patterns
6. [MCP Reddit](06-mcp-reddit.md) - Trend research
7. [OpenAI Agents SDK](07-openai-agents-sdk.md) - Agent framework
