# Transcript Format Specification

## 📋 JSON Structure

```json
{
  "total_duration": 12.0,
  "format": "vertical",
  "resolution": "1080x1920",
  "theme": "innovation",
  "segments": [
    {
      "start": 0.0,
      "end": 3.5,
      "text": "Your quote text here",
      "audio_file": "audio/quote1.mp3",
      "emphasis": "high"
    }
  ]
}
```

## 🔑 Field Definitions

### Top Level (Required)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `total_duration` | number | Total video length in seconds | `12.0` |
| `format` | string | Video orientation | `"vertical"` or `"horizontal"` |
| `resolution` | string | Video resolution | `"1080x1920"` or `"1920x1080"` |
| `theme` | string | Content theme (optional hint for AI) | `"innovation"`, `"growth"`, `"auto"` |
| `target_demographic` | string | **Target TikTok audience** | See demographics below |
| `segments` | array | List of timed text segments | See below |

### Segment Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `start` | number | ✅ Yes | Start time in seconds | `0.0` |
| `end` | number | ✅ Yes | End time in seconds | `3.5` |
| `text` | string | ✅ Yes | The quote/text to display | `"Innovation distinguishes"` |
| `audio_file` | string | ❌ No | Path to audio file (null if no audio) | `"audio/quote1.mp3"` or `null` |
| `emphasis` | string | ❌ No | Visual emphasis level | `"high"`, `"medium"`, `"low"` |

## 📐 Format Options

### Vertical (9:16) - Mobile/Shorts
```json
{
  "format": "vertical",
  "resolution": "1080x1920"
}
```
Use for: YouTube Shorts, TikTok, Instagram Reels

### Horizontal (16:9) - Landscape
```json
{
  "format": "horizontal",
  "resolution": "1920x1080"
}
```
Use for: YouTube landscape, standard video

## 🎯 Target Demographics (TikTok Optimized)

**IMPORTANT**: All scenes are optimized for TikTok virality. Demographics control visual style, pacing, and effects.

| Demographic | Audience | Visual Style | Best For |
|-------------|----------|--------------|----------|
| `"hustle-bro"` | 18-25 Men | Black/gold, aggressive zooms, intense effects | Entrepreneurship, finance, competition |
| `"girlboss"` | 18-25 Women | Rose/lavender, elegant pans, soft glows | Empowerment, career growth, confidence |
| `"tech-bro"` | 22-35 Men | Dark mode, terminal fonts, code aesthetic | Software, startups, tech content |
| `"wellness-fem"` | 20-35 Women | Soft purple/peach, calm movements, gentle | Self-care, mindfulness, healing |
| `"zoomer-chaos"` | 13-22 All | Maximum chaos, glitch everything, brain rot | Memes, pure dopamine, ADHD content |
| `"linkedin-pro"` | 30-45 All | Clean charts, professional, authoritative | Business, thought leadership |
| `"fitness-grind"` | 18-30 All | Red/black, powerful impacts, muscle emphasis | Gym motivation, discipline |
| `"auto"` | Auto-detect | AI chooses based on content | Let AI decide |

### Examples:
```json
{"target_demographic": "hustle-bro"}   // Gold colors, aggressive energy
{"target_demographic": "girlboss"}     // Soft pastels, empowerment vibes
{"target_demographic": "tech-bro"}     // Terminal aesthetic, code blocks
```

## 🎨 Theme Hints

| Theme | AI Will Create | Best For |
|-------|----------------|----------|
| `"growth"` | Rising graphs, ascending elements | Progress, improvement stories |
| `"cycle"` | Circular flows, loops | Recurring patterns, habits |
| `"flow"` | Sequential arrows, progression | Step-by-step processes |
| `"conflict"` | Opposing sides, contrasts | Comparisons, debates |
| `"innovation"` | Diverging paths, breakthroughs | Leader vs follower, innovation |
| `"auto"` | AI decides based on content | Let AI choose (recommended) |

## 🔊 Audio File Options

### No Audio
```json
{
  "audio_file": null
}
```

### With Audio File
```json
{
  "audio_file": "audio/quote1.mp3"
}
```
Supported formats: `.mp3`, `.wav`, `.m4a`

### Background Music (Top Level)
```json
{
  "total_duration": 12.0,
  "background_music": "music/background.mp3",
  "segments": [...]
}
```

## ⏱️ Timing Rules

1. **Start at 0.0**: First segment should start at `0.0`
2. **No gaps**: Each segment `start` should match previous `end`
3. **No overlaps**: Segments shouldn't overlap
4. **Match duration**: Last segment `end` should equal `total_duration`

### ✅ Good Example:
```json
{
  "total_duration": 10.0,
  "segments": [
    {"start": 0.0, "end": 3.0, "text": "First"},
    {"start": 3.0, "end": 7.0, "text": "Second"},
    {"start": 7.0, "end": 10.0, "text": "Third"}
  ]
}
```

### ❌ Bad Example:
```json
{
  "total_duration": 10.0,
  "segments": [
    {"start": 0.0, "end": 3.0, "text": "First"},
    {"start": 3.5, "end": 7.0, "text": "Second"},  // Gap!
    {"start": 6.5, "end": 10.0, "text": "Third"}   // Overlap!
  ]
}
```

## 📝 Creating Transcripts

### Method 1: Manual JSON
Create a `.json` file with the structure above.

### Method 2: Interactive Builder
```bash
python transcript_builder.py
# Choose option 1 (Interactive)
```

### Method 3: From SRT File
```bash
python transcript_builder.py subtitles.srt transcript.json
```

### Method 4: Simple Quotes
```bash
python transcript_builder.py
# Choose option 2 (Simple quotes)
```

## 🎨 Optional Fields

### Emphasis Levels
```json
{
  "emphasis": "high"    // Bigger, brighter, more dramatic
  "emphasis": "medium"  // Normal treatment
  "emphasis": "low"     // Subtle, secondary
}
```

### Style Hints (Experimental)
```json
{
  "style_hints": {
    "color_scheme": "warm",
    "energy": "high",
    "camera_movement": "dynamic"
  }
}
```

## 📚 Complete Examples

### Example 1: Minimal (No Audio)
```json
{
  "total_duration": 6.0,
  "format": "vertical",
  "resolution": "1080x1920",
  "theme": "auto",
  "segments": [
    {"start": 0.0, "end": 2.0, "text": "Dream big"},
    {"start": 2.0, "end": 4.0, "text": "Work hard"},
    {"start": 4.0, "end": 6.0, "text": "Stay humble"}
  ]
}
```

### Example 2: With Audio
```json
{
  "total_duration": 15.0,
  "format": "horizontal",
  "resolution": "1920x1080",
  "theme": "growth",
  "background_music": "music/inspiring.mp3",
  "segments": [
    {
      "start": 0.0,
      "end": 5.0,
      "text": "The only way to do great work",
      "audio_file": "voiceover/part1.mp3",
      "emphasis": "high"
    },
    {
      "start": 5.0,
      "end": 10.0,
      "text": "is to love what you do",
      "audio_file": "voiceover/part2.mp3",
      "emphasis": "high"
    },
    {
      "start": 10.0,
      "end": 15.0,
      "text": "- Steve Jobs",
      "audio_file": "voiceover/part3.mp3",
      "emphasis": "medium"
    }
  ]
}
```

### Example 3: Multi-line Text
```json
{
  "segments": [
    {
      "start": 0.0,
      "end": 5.0,
      "text": "This is a longer quote\nthat spans multiple lines\nfor better readability"
    }
  ]
}
```

## 🚀 Quick Start Templates

Save these as starting points:

**Vertical 3-quote:**
```json
{
  "total_duration": 9.0,
  "format": "vertical",
  "resolution": "1080x1920",
  "theme": "auto",
  "segments": [
    {"start": 0.0, "end": 3.0, "text": "Quote 1", "audio_file": null},
    {"start": 3.0, "end": 6.0, "text": "Quote 2", "audio_file": null},
    {"start": 6.0, "end": 9.0, "text": "Quote 3", "audio_file": null}
  ]
}
```

**Horizontal with audio:**
```json
{
  "total_duration": 12.0,
  "format": "horizontal",
  "resolution": "1920x1080",
  "theme": "growth",
  "segments": [
    {"start": 0.0, "end": 4.0, "text": "Quote 1", "audio_file": "audio/1.mp3"},
    {"start": 4.0, "end": 8.0, "text": "Quote 2", "audio_file": "audio/2.mp3"},
    {"start": 8.0, "end": 12.0, "text": "Quote 3", "audio_file": "audio/3.mp3"}
  ]
}
```
