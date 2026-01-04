# RQ-07: Edge TTS Timestamp Extraction

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P0  
**Question:** How does Edge TTS SubMaker extract word-level timestamps?

---

## 1. Problem Statement

The audio pipeline needs word-level timestamps for caption synchronization. Edge TTS provides these during generation, but the mechanism and format needed clarification.

---

## 2. Vendor Evidence

### 2.1 Timestamps Provided During Generation

**Key Finding:** Timestamps come **during generation**, not after. Microsoft's WebSocket API streams interleaved audio and metadata messages.

**Source:** [edge-tts library](https://github.com/rany2/edge-tts) (referenced in vendor/audio/edge-tts)

```python
# Edge TTS requests word boundaries via SSML config
await websocket.send_str(
    f"X-Timestamp:{date_to_string()}\r\n"
    "Content-Type:application/json; charset=utf-8\r\n"
    "Path:speech.config\r\n\r\n"
    '{"context":{"synthesis":{"audio":{"metadataoptions":{'
    f'"sentenceBoundaryEnabled":"{sq}","wordBoundaryEnabled":"{wd}"'  # ← ENABLES WORD BOUNDARIES
    "},"
    '"outputFormat":"audio-24khz-48kbitrate-mono-mp3"'
    "}}}}\r\n"
)
```

### 2.2 Metadata Message Format

When a `WordBoundary` message arrives:

```python
def __parse_metadata(self, data: bytes) -> TTSChunk:
    for meta_obj in json.loads(data)["Metadata"]:
        meta_type = meta_obj["Type"]
        if meta_type in ("WordBoundary", "SentenceBoundary"):
            return {
                "type": meta_type,
                "offset": meta_obj["Data"]["Offset"],        # 100-nanosecond units!
                "duration": meta_obj["Data"]["Duration"],    # 100-nanosecond units!
                "text": unescape(meta_obj["Data"]["text"]["Text"]),
            }
```

### 2.3 Timestamp Unit: 100-Nanosecond Ticks

**Critical:** Edge TTS uses **100-nanosecond ticks** (like .NET's TimeSpan.Ticks).

| Unit | Conversion |
|------|------------|
| 1 second | 10,000,000 ticks |
| 1 millisecond | 10,000 ticks |
| 1 microsecond | 10 ticks |

**Conversion to milliseconds:**

```python
start_ms = offset / 10_000
end_ms = (offset + duration) / 10_000
```

### 2.4 SubMaker Class Implementation

**Source:** edge-tts/submaker.py

```python
from datetime import timedelta
from dataclasses import dataclass

@dataclass
class Subtitle:
    index: int
    start: timedelta
    end: timedelta
    content: str

class SubMaker:
    def __init__(self):
        self.cues: list[Subtitle] = []
    
    def feed(self, msg: TTSChunk) -> None:
        """Feed a WordBoundary event to accumulate subtitles."""
        self.cues.append(
            Subtitle(
                index=len(self.cues) + 1,
                start=timedelta(microseconds=msg["offset"] / 10),
                end=timedelta(microseconds=(msg["offset"] + msg["duration"]) / 10),
                content=msg["text"],
            )
        )
```

### 2.5 MoneyPrinterTurbo Integration

**Source:** [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py)

```python
import edge_tts

async def azure_tts_v1(text: str, voice_name: str, voice_rate: float, voice_file: str) -> SubMaker:
    rate_str = f"{voice_rate:+.0%}"  # e.g., "+10%" or "-5%"
    communicate = edge_tts.Communicate(text, voice_name, rate=rate_str)
    sub_maker = edge_tts.SubMaker()
    
    with open(voice_file, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                sub_maker.feed(chunk)  # Capture timestamps
    
    return sub_maker  # Contains all word timings
```

### 2.6 SRT Generation from SubMaker

**Source:** [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py)

MoneyPrinterTurbo matches SubMaker words to script lines:

```python
from edge_tts.submaker import mktimestamp

def create_subtitle(sub_maker: SubMaker, text: str, subtitle_file: str):
    """Generate SRT file by matching SubMaker words to script lines."""
    
    def formatter(idx: int, start_time: float, end_time: float, sub_text: str) -> str:
        start_t = mktimestamp(start_time).replace(".", ",")  # SRT uses comma
        end_t = mktimestamp(end_time).replace(".", ",")
        return f"{idx}\n{start_t} --> {end_t}\n{sub_text}\n"
    
    # Split script by punctuation
    script_lines = split_by_punctuation(text)
    
    # Match SubMaker words to script lines
    srt_entries = []
    word_index = 0
    
    for line in script_lines:
        line_start = sub_maker.cues[word_index].start
        
        # Find end of this line in SubMaker
        words_in_line = count_words(line)
        line_end = sub_maker.cues[word_index + words_in_line - 1].end
        
        srt_entries.append(formatter(len(srt_entries) + 1, line_start, line_end, line))
        word_index += words_in_line
    
    with open(subtitle_file, "w") as f:
        f.write("\n".join(srt_entries))
```

### 2.7 Offset Compensation for Long Text

**Issue:** When text exceeds ~4096 bytes, Edge TTS splits into multiple SSML requests. Each request resets timestamps to 0.

**Solution:** edge-tts tracks cumulative offset:

```python
class Communicate:
    def __init__(self):
        self.state = {
            "offset_compensation": 0,
            "last_duration_offset": 0,
        }
    
    async def stream(self):
        for chunk in split_text(self.text, max_bytes=4096):
            async for msg in self._stream_chunk(chunk):
                if msg["type"] == "WordBoundary":
                    # Apply compensation
                    msg["offset"] += self.state["offset_compensation"]
                yield msg
            
            # After chunk completes, update compensation
            self.state["offset_compensation"] = self.state["last_duration_offset"]
            self.state["offset_compensation"] += 8_750_000  # ~875ms padding
```

**Note:** The 875ms padding is an estimate. For precise timing on long texts, use ASR post-validation.

---

## 3. ShortGPT Comparison

**Source:** [vendor/ShortGPT/shortGPT/audio/edge_voice_module.py](../../../vendor/ShortGPT/shortGPT/audio/edge_voice_module.py)

ShortGPT **ignores** WordBoundary events:

```python
async def async_generate_voice(self, text, outputfile):
    communicate = edge_tts.Communicate(text, self.voiceName)
    with open(outputfile, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            # ⚠️ WordBoundary events are IGNORED!
    return outputfile
```

**Implication:** ShortGPT relies on separate ASR (Whisper) for caption timing, duplicating work.

---

## 4. Recommended Implementation for content-machine

### 4.1 TypeScript Edge TTS Wrapper

```typescript
interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

interface EdgeTTSResult {
  audioBuffer: Buffer;
  wordTimings: WordTiming[];
  totalDurationMs: number;
}

async function generateWithTimestamps(
  text: string,
  voice: string,
  rate: string = "+0%"
): Promise<EdgeTTSResult> {
  // Option 1: Call Python edge-tts via subprocess
  const result = await runPython('edge_tts_wrapper.py', {
    text,
    voice,
    rate,
  });
  
  return {
    audioBuffer: await fs.readFile(result.audioPath),
    wordTimings: result.timings.map((t: any) => ({
      word: t.text,
      startMs: t.offset / 10_000,
      endMs: (t.offset + t.duration) / 10_000,
    })),
    totalDurationMs: result.totalDuration,
  };
}
```

### 4.2 Python Wrapper Script

```python
#!/usr/bin/env python3
# edge_tts_wrapper.py

import asyncio
import json
import sys
import edge_tts

async def main(text: str, voice: str, rate: str, output_path: str) -> dict:
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    sub_maker = edge_tts.SubMaker()
    
    audio_data = bytearray()
    
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            sub_maker.feed(chunk)
    
    with open(output_path, "wb") as f:
        f.write(audio_data)
    
    return {
        "audioPath": output_path,
        "timings": [
            {
                "text": cue.content,
                "offset": int(cue.start.total_seconds() * 10_000_000),
                "duration": int((cue.end - cue.start).total_seconds() * 10_000_000),
            }
            for cue in sub_maker.cues
        ],
        "totalDuration": sub_maker.cues[-1].end.total_seconds() * 1000 if sub_maker.cues else 0,
    }

if __name__ == "__main__":
    args = json.loads(sys.argv[1])
    result = asyncio.run(main(**args))
    print(json.dumps(result))
```

### 4.3 Scene Alignment

```typescript
interface SceneTimestamps {
  sceneId: string;
  text: string;
  startMs: number;
  endMs: number;
  words: WordTiming[];
}

function alignScenesWithTimings(
  scenes: Scene[],
  wordTimings: WordTiming[]
): SceneTimestamps[] {
  const result: SceneTimestamps[] = [];
  let wordIndex = 0;
  
  for (const scene of scenes) {
    const sceneWords = scene.text.split(/\s+/).length;
    const sceneTimings = wordTimings.slice(wordIndex, wordIndex + sceneWords);
    
    if (sceneTimings.length === 0) {
      throw new Error(`No timings found for scene: ${scene.id}`);
    }
    
    result.push({
      sceneId: scene.id,
      text: scene.text,
      startMs: sceneTimings[0].startMs,
      endMs: sceneTimings[sceneTimings.length - 1].endMs,
      words: sceneTimings,
    });
    
    wordIndex += sceneWords;
  }
  
  return result;
}
```

---

## 5. Accuracy Considerations

| Factor | Impact | Mitigation |
|--------|--------|------------|
| Chunk boundary padding | 875ms estimated gap | Use ASR validation for long texts |
| Speech rate changes | Timestamps adjust | Use consistent rate parameter |
| Multi-byte characters | Potential misalignment | edge-tts handles UTF-8 |
| Long text (>4KB) | Multiple SSML requests | Offset compensation applied |

---

## 6. Implementation Recommendations

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Use Edge TTS timestamps | Yes | Built-in, no ASR needed |
| Fallback to ASR | Only for long texts | Validate offset compensation |
| Python wrapper | Required | edge-tts is Python-only |
| Scene alignment | By word count | Simple, matches script |

---

## 7. References

- [edge-tts GitHub](https://github.com/rany2/edge-tts) — Source library
- [vendor/MoneyPrinterTurbo/app/services/voice.py](../../../vendor/MoneyPrinterTurbo/app/services/voice.py) — Integration pattern
- [vendor/ShortGPT/shortGPT/audio/edge_voice_module.py](../../../vendor/ShortGPT/shortGPT/audio/edge_voice_module.py) — Alternative (no timestamps)
- [SECTION-AUDIO-PIPELINE-20260104.md](../sections/SECTION-AUDIO-PIPELINE-20260104.md) — Audio pipeline overview
