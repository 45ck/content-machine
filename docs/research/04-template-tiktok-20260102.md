# Research Report: Remotion Template TikTok

**Repo:** `remotion-dev/template-tiktok`  
**Location:** `templates/template-tiktok-base/`  
**License:** Remotion License (company license may be needed)  
**Language:** TypeScript/React

---

## What It Does

Official Remotion template for creating **TikTok-style vertical videos** with:

1. React-based video composition
2. Built-in **Whisper.cpp** captioning
3. Word-by-word subtitle animations
4. Multiple caption presets

## Key Features

| Feature | Details |
|---------|---------|
| **Framework** | Remotion (React video) |
| **Captions** | Whisper.cpp integration via `@remotion/install-whisper-cpp` |
| **Subtitles** | Word-by-word with animations |
| **Language Support** | Non-English via model configuration |
| **Dev Mode** | `npm run dev` with hot reload |
| **Render** | `npx remotion render` to MP4 |

## Tech Stack

- **Framework:** Remotion
- **Language:** TypeScript/React
- **Captioning:** Whisper.cpp (local, fast)
- **Audio Processing:** Remotion audio APIs

## What We Can Reuse

### ✅ High Value
- **Complete video template** - Starting point for our videos
- **Whisper.cpp integration** - Caption generation (`node sub.mjs`)
- **Caption animations** - Word-by-word highlighting
- **Non-English support** - Multi-language content
- **Remotion patterns** - How to structure video compositions

### ⚠️ Medium Value
- **Caption presets** - Different styling options

### ❌ Not Needed
- Nothing - this is core to our implementation

## How It Helps Us

1. **Base template** - Clone and customize for our content types
2. **Caption pipeline** - Whisper.cpp transcription already working
3. **React composition** - Programmatic video generation
4. **Export pipeline** - MP4 rendering workflow

## Key Files to Study

```
src/
├── Composition.tsx    # Main video composition
├── Caption.tsx        # Subtitle rendering
└── Root.tsx           # Entry point

sub.mjs                # Whisper.cpp caption generation ⭐
package.json           # Remotion deps
```

## Caption Generation Flow

```bash
# Generate captions from audio
node sub.mjs

# Render video with captions
npx remotion render
```

## Gaps / Limitations

- Basic template - needs customization for our styles
- No audio generation (TTS) - we add this
- No stock footage integration - we add this
- No script generation - we add this

---

## Verdict

**Value: CRITICAL** - This is our **primary video generation foundation**. Whisper.cpp captioning already works, React composition is flexible, and Remotion's rendering is production-ready. We build ON TOP of this.
