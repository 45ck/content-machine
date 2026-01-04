# Deep Dive: captacity - Word-Level Caption Styling

**Date:** 2026-01-02  
**Repo:** `vendor/captacity/`  
**Priority:** ⭐ HIGH - Caption Rendering Patterns

---

## Executive Summary

**captacity** is a Python library for adding word-highlighted captions to videos. It demonstrates key patterns for caption timing, multi-line text layout, shadow rendering, and word-level highlighting. Uses MoviePy for video compositing.

### Why This Matters

- ✅ **Word-level highlight** - Current word in different color
- ✅ **Multi-line text layout** - Automatic line breaking
- ✅ **Shadow/blur effects** - Professional text styling
- ✅ **Whisper integration** - Local or API transcription
- ✅ **Line count control** - Fit captions to screen
- ⚠️ **MoviePy-based** - We use Remotion (React), need to port patterns

---

## Core API

```python
from captacity import add_captions

add_captions(
    video_file="input.mp4",
    output_file="output.mp4",
    
    # Typography
    font="Bangers-Regular.ttf",
    font_size=130,
    font_color="yellow",
    
    # Stroke
    stroke_width=3,
    stroke_color="black",
    
    # Word highlighting
    highlight_current_word=True,
    word_highlight_color="red",
    
    # Layout
    line_count=2,
    padding=50,
    position=("center", "center"),
    
    # Shadow
    shadow_strength=1.0,
    shadow_blur=0.1,
    
    # Transcription
    use_local_whisper="auto",  # or True/False
    initial_prompt=None,
    segments=None,  # Pre-transcribed segments
)
```

---

## Key Patterns

### 1. Line Layout Algorithm

```python
def calculate_lines(text, font, font_size, stroke_width, frame_width):
    """Break text into lines that fit the frame width"""
    lines = []
    line = ""
    words = text.split()
    
    for word in words:
        test_line = line + word + " "
        text_width = get_text_size(test_line, font, font_size)[0]
        
        if text_width < frame_width:
            line = test_line
        else:
            # Line is full, start new line
            lines.append({"text": line.strip(), "height": line_height})
            line = word + " "
    
    return {"lines": lines, "height": total_height}
```

### 2. Fit Function Pattern

```python
def fits_frame(line_count, font, font_size, stroke_width, frame_width):
    """Create a function that tests if text fits in N lines"""
    def fit_function(text):
        lines = calculate_lines(text, font, font_size, stroke_width, frame_width)
        return len(lines["lines"]) <= line_count
    return fit_function
```

This is used by the segment parser to group words into display-able chunks.

### 3. Segment Parsing

```python
def parse(segments, fit_function, allow_partial_sentences=False):
    """Parse Whisper segments into caption groups"""
    captions = []
    caption = {"start": None, "end": 0, "words": [], "text": ""}
    
    for segment in segments:
        for word in segment["words"]:
            if caption["start"] is None:
                caption["start"] = word["start"]
            
            test_text = caption["text"] + word["word"]
            
            # Check if adding word still fits
            if fit_function(test_text):
                caption["words"].append(word)
                caption["text"] = test_text
            else:
                # Caption is full, start new one
                captions.append(caption)
                caption = {
                    "start": word["start"],
                    "words": [word],
                    "text": word["word"]
                }
    
    return captions
```

### 4. Word Highlighting

```python
# For each caption, create multiple clips - one per word highlight state
for caption in captions:
    captions_to_draw = []
    
    if highlight_current_word:
        for i, word in enumerate(caption["words"]):
            # Each word gets its own time window
            start = word["start"]
            end = caption["words"][i+1]["start"] if i+1 < len(caption["words"]) else word["end"]
            
            captions_to_draw.append({
                "text": caption["text"],  # Full caption text
                "start": start,
                "end": end,
                "highlight_index": i  # Which word to highlight
            })
```

### 5. Shadow Rendering

```python
def create_shadow(text, font_size, font, blur_radius, opacity=1.0):
    """Create blurred shadow behind text"""
    # Create black text
    shadow = create_text(text, font_size, "black", font, opacity=opacity)
    # Apply blur
    shadow = blur_text_clip(shadow, int(font_size * blur_radius))
    return shadow

# Stack multiple shadows for stronger effect
shadow_left = shadow_strength
while shadow_left >= 1:
    shadow_left -= 1
    shadow = create_shadow(text, font_size, font, shadow_blur, opacity=1)
    clips.append(shadow)

if shadow_left > 0:
    # Partial opacity for remaining shadow
    shadow = create_shadow(text, font_size, font, shadow_blur, opacity=shadow_left)
    clips.append(shadow)
```

---

## Caption Data Structure

### Input: Whisper Segments

```python
segments = [
    {
        "start": 0.0,
        "end": 5.0,
        "words": [
            {"word": " Welcome", "start": 0.0, "end": 0.5},
            {"word": " to", "start": 0.5, "end": 0.7},
            {"word": " our", "start": 0.7, "end": 0.9},
            {"word": " video", "start": 0.9, "end": 1.3},
        ]
    }
]
```

### Output: Display Captions

```python
captions = [
    {
        "start": 0.0,
        "end": 1.3,
        "text": "Welcome to our video",
        "words": [
            {"word": " Welcome", "start": 0.0, "end": 0.5},
            {"word": " to", "start": 0.5, "end": 0.7},
            {"word": " our", "start": 0.7, "end": 0.9},
            {"word": " video", "start": 0.9, "end": 1.3},
        ]
    }
]
```

---

## Transcription

### Local Whisper

```python
def transcribe_locally(audio_file, prompt=None):
    import whisper
    model = whisper.load_model("base")
    transcription = model.transcribe(
        audio=audio_file,
        word_timestamps=True,
        fp16=False,
        initial_prompt=prompt
    )
    return transcription["segments"]
```

### OpenAI Whisper API

```python
def transcribe_with_api(audio_file, prompt=None):
    transcript = openai.audio.transcriptions.create(
        model="whisper-1",
        file=open(audio_file, "rb"),
        response_format="verbose_json",
        timestamp_granularities=["segment", "word"],
        prompt=prompt
    )
    return [{
        "start": transcript.segments[0]["start"],
        "end": transcript.segments[-1]["end"],
        "words": transcript.words
    }]
```

---

## Remotion Adaptation

### Caption Component

```tsx
// src/remotion/components/Caption.tsx
import { useCurrentFrame, useVideoConfig } from 'remotion';

interface Word {
  text: string;
  start: number;
  end: number;
}

interface CaptionProps {
  words: Word[];
  highlightColor: string;
  defaultColor: string;
  fontSize: number;
  strokeWidth: number;
  strokeColor: string;
}

export const Caption: React.FC<CaptionProps> = ({
  words,
  highlightColor,
  defaultColor,
  fontSize,
  strokeWidth,
  strokeColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  
  // Find currently speaking word
  const currentWordIndex = words.findIndex(
    (word) => currentTime >= word.start && currentTime < word.end
  );
  
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '0.5em',
    }}>
      {words.map((word, index) => (
        <span
          key={index}
          style={{
            fontSize,
            color: index === currentWordIndex ? highlightColor : defaultColor,
            WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
            textShadow: `0 0 ${fontSize * 0.1}px rgba(0,0,0,0.8)`,
          }}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
};
```

### Line Breaking Logic

```tsx
// src/remotion/utils/lineBreaking.ts
interface Line {
  words: Word[];
  width: number;
}

export function breakIntoLines(
  words: Word[],
  maxWidth: number,
  measureText: (text: string) => number
): Line[] {
  const lines: Line[] = [];
  let currentLine: Word[] = [];
  let currentWidth = 0;
  
  for (const word of words) {
    const wordWidth = measureText(word.text);
    
    if (currentWidth + wordWidth <= maxWidth) {
      currentLine.push(word);
      currentWidth += wordWidth;
    } else {
      if (currentLine.length > 0) {
        lines.push({ words: currentLine, width: currentWidth });
      }
      currentLine = [word];
      currentWidth = wordWidth;
    }
  }
  
  if (currentLine.length > 0) {
    lines.push({ words: currentLine, width: currentWidth });
  }
  
  return lines;
}
```

### Caption Group Component

```tsx
// src/remotion/components/CaptionGroup.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

interface CaptionGroupProps {
  captions: Caption[];
  style: CaptionStyle;
}

export const CaptionGroup: React.FC<CaptionGroupProps> = ({ captions, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  
  // Find current caption
  const currentCaption = captions.find(
    (cap) => currentTime >= cap.start && currentTime < cap.end
  );
  
  if (!currentCaption) return null;
  
  return (
    <AbsoluteFill style={{
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom: style.safeMargin.bottom + 20,
    }}>
      <Caption
        words={currentCaption.words}
        highlightColor={style.highlightColor}
        defaultColor={style.defaultColor}
        fontSize={style.fontSize}
        strokeWidth={style.strokeWidth}
        strokeColor={style.strokeColor}
      />
    </AbsoluteFill>
  );
};
```

---

## Configuration Schema

```typescript
// src/schemas/caption.ts
import { z } from 'zod';

export const CaptionStyleSchema = z.object({
  font: z.string().default('Bangers'),
  fontSize: z.number().default(72),
  
  defaultColor: z.string().default('#FFFFFF'),
  highlightColor: z.string().default('#FFD700'),
  
  strokeWidth: z.number().default(3),
  strokeColor: z.string().default('#000000'),
  
  maxLines: z.number().default(2),
  lineHeight: z.number().default(1.2),
  
  shadow: z.object({
    enabled: z.boolean().default(true),
    blur: z.number().default(8),
    color: z.string().default('rgba(0,0,0,0.8)'),
  }).default({}),
  
  position: z.enum(['top', 'center', 'bottom']).default('bottom'),
  padding: z.number().default(50),
});

export const CaptionWordSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
});

export const CaptionSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  words: z.array(CaptionWordSchema),
});
```

---

## What We Can Adopt

### Direct Adoption ✅

1. **Line breaking algorithm** - Adapt for Remotion
2. **Segment parsing logic** - Group words into display chunks
3. **Fit function pattern** - Test if text fits N lines
4. **Word highlight state machine** - Track current word

### Pattern Extraction 🔧

1. **Shadow layering** - Multiple shadows for stronger effect
2. **Whisper integration** - Both local and API modes
3. **Caption caching** - Avoid recalculating layouts

---

## Integration Points

### WhisperX Enhancement

captacity uses basic Whisper. We should use **WhisperX** for:
- More accurate word-level timestamps
- wav2vec2 phoneme alignment
- Speaker diarization (future)

### Remotion Integration

The patterns translate well to Remotion:
- `useCurrentFrame()` for time tracking
- CSS-based text styling (shadows, strokes)
- Component composition for captions

---

## Lessons Learned

1. **Word-level highlighting is a state machine** - Track current word by time
2. **Line breaking must account for styling** - Stroke width affects measurements
3. **Shadow layering creates depth** - Multiple passes for strong shadows
4. **Fit functions enable flexible layout** - Let content determine line breaks
5. **Caching is essential** - Text measurement is expensive

---

**Status:** Research complete. Caption patterns validated for Remotion adaptation.
