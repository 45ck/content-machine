# Prompt Library Attributions

This document credits the open-source projects from which prompts were adapted.

---

## MoneyPrinterTurbo

**Repository:** https://github.com/harry0703/MoneyPrinterTurbo  
**License:** MIT  
**Stars:** 20k+

### Prompts Adapted

#### Video Script Generator (`script/video-script-generator`)

- **Original Location:** `app/services/llm.py` → `generate_script()`
- **Adapted:** 2026-01-07
- **Modifications:** Converted to YAML template format, added archetype support

#### Video Search Terms (`visuals/video-search-terms`)

- **Original Location:** `app/services/llm.py` → `generate_terms()`
- **Adapted:** 2026-01-07
- **Modifications:** Converted to YAML template format, added structured output

---

## ShortGPT

**Repository:** https://github.com/RayVentura/ShortGPT  
**License:** MIT  
**Stars:** 5k+

### Prompts Adapted

#### Image Query Generator (`visuals/image-query-generator`)

- **Original Location:** `shortGPT/prompt_templates/editing_generate_images.yaml`
- **Adapted:** 2026-01-07
- **Modifications:** Minor formatting, kept original structure

#### Video Segment Queries (`visuals/video-segment-queries`)

- **Original Location:** `shortGPT/prompt_templates/editing_generate_videos.yaml`
- **Adapted:** 2026-01-07
- **Modifications:** Minor formatting, kept original structure

#### Facts Generator (`script/facts-generator`)

- **Original Location:** `shortGPT/prompt_templates/facts_generator.yaml`
- **Adapted:** 2026-01-07
- **Modifications:** Converted to content-machine format

#### Chat Video Script (`script/chat-video-script`)

- **Original Location:** `shortGPT/prompt_templates/chat_video_script.yaml`
- **Adapted:** 2026-01-07
- **Modifications:** Added archetype context

---

## short-video-maker (gyoridavid)

**Repository:** https://github.com/gyoridavid/short-video-maker  
**License:** MIT  
**Stars:** 1k+

### Architecture Patterns Used

- MCP server integration pattern
- Kokoro TTS + Whisper ASR pipeline
- Remotion rendering architecture

---

## Original Prompts (content-machine)

The following prompts are original to content-machine:

### Image Generation Templates

- `image-generation/cinematic-scene`
- `image-generation/product-shot`
- `image-generation/abstract-concept`
- `image-generation/person-action`
- `image-generation/tech-visualization`
- `image-generation/comparison-split`

These were designed specifically for:

- Google Gemini Imagen 3 (via Nano Banana Pro)
- OpenAI DALL-E 3
- Other text-to-image providers

---

## License Compliance

All adapted prompts maintain their original MIT license terms. The content-machine project is also MIT licensed, ensuring compatibility.

When using these prompts:

1. ✅ Commercial use is permitted
2. ✅ Modification is permitted
3. ✅ Distribution is permitted
4. ⚠️ Must include original license notice in distributions
5. ⚠️ No warranty is provided

---

## Contributing New Prompts

When adding prompts from external sources:

1. Verify the source license is compatible (MIT, Apache 2.0, BSD, etc.)
2. Add an entry to this file with:
   - Repository URL
   - License type
   - Original file location
   - Date adapted
   - Modifications made
3. Include the license header in the prompt file if required

---

_Last Updated: 2026-01-07_
