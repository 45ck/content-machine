# Deep Dive: chuk-mcp-remotion (chuk-motion)

**Date:** 2026-01-02  
**Repo:** `vendor/render/chuk-mcp-remotion/`  
**GitHub:** https://github.com/chrishayuk/chuk-motion  
**Priority:** ⭐ CRITICAL - MCP + Remotion Integration

---

## Executive Summary

**chuk-motion** is a comprehensive MCP server for AI-powered video generation with Remotion. It provides a **design-system-first approach** with 51 video components, 7 themes, and complete design token system.

### Why This Matters

This is a **major discovery** - it solves the MCP + Remotion integration problem with:
- ✅ 51 production-ready video components
- ✅ MCP tools for AI agent integration
- ✅ Design token system (colors, typography, spacing, motion)
- ✅ Multi-platform safe margins (YouTube, TikTok, Instagram, LinkedIn)
- ✅ Track-based timeline system
- ✅ Python-based (complements our TypeScript approach)

---

## Architecture Analysis

### High-Level Flow

```
AI Agent → MCP Server → ProjectManager → Component Builder → Remotion → MP4
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
           Design       Component     Timeline
           Tokens       Registry      Builder
```

### Component Library (51 Total)

#### Charts (6 components)
- PieChart, BarChart, HorizontalBarChart
- LineChart, AreaChart, DonutChart

#### Scenes (2 components)
- TitleScene (4 variants, 5 animations)
- EndScreen (4 variants)

#### Overlays (3 components)
- LowerThird, TextOverlay, SubscribeButton

#### Code Display (3 components)
- CodeBlock, TypingCode, CodeDiff

#### Layouts (17 components)
- AsymmetricLayout, Container, DialogueFrame
- Grid, Mosaic, PiP, SplitScreen
- ThreeByThreeGrid, Timeline, Vertical
- And more...

#### Text Animations (6 components)
- TypewriterText, StaggerText, WavyText
- TrueFocus, DecryptedText, FuzzyText

#### Demo Realism (4 components)
- BeforeAfterSlider, BrowserFrame
- DeviceFrame, Terminal

#### Content (5 components)
- DemoBox, ImageContent, StylizedWebPage
- VideoContent, WebPage

#### Transitions (2 components)
- LayoutTransition, PixelTransition

---

## Design Token System

### Four Token Categories

#### 1. Colors (`tokens/colors.py`)
- 7 theme palettes optimized for video
- Dark/light mode support
- Semantic colors (success, warning, error)

#### 2. Typography (`tokens/typography.py`)
- Font scales for 720p, 1080p, 4K
- Primary and code font stacks
- Video-optimized readability

#### 3. Spacing (`tokens/spacing.py`)
- 10-step spacing scale (4px - 120px)
- **Platform safe margins** (critical!)

| Platform | Top | Bottom | Left | Right |
|----------|-----|--------|------|-------|
| LinkedIn Feed | 40px | 40px | 24px | 24px |
| Instagram Stories | 100px | 120px | 24px | 24px |
| TikTok | 100px | 180px | 24px | 80px |
| YouTube | 20px | 20px | 20px | 20px |

#### 4. Motion (`tokens/motion.py`)
- Spring configurations
- Easing curves (ease-out, ease-in-out, bounce)
- Duration presets

---

## Themes

7 built-in themes optimized for video:

| Theme | Primary Color | Use Case |
|-------|---------------|----------|
| Tech | Blue (#0066FF) | Tech reviews, coding tutorials |
| Finance | Green (#00C853) | Stock analysis, investing |
| Education | Purple (#7C4DFF) | Educational content |
| Gaming | Neon Green (#00E676) | Gaming, esports |
| Minimal | Grayscale | Professional, documentaries |
| Lifestyle | Pink (#FF6B9D) | Vlogs, wellness |
| Business | Navy (#1565C0) | Corporate, B2B |

---

## MCP Tools

### Project Management
- `remotion_create_project(name, theme, fps, width, height)`
- `remotion_get_project_info()`
- `remotion_list_projects()`

### Component Tools (50+)
```python
# Charts
remotion_add_pie_chart(data, title, duration, track, gap_before)
remotion_add_bar_chart(...)

# Scenes
remotion_add_title_scene(text, subtitle, variant, animation, duration)
remotion_add_end_screen(cta_text, variant, duration)

# Text Animations
remotion_add_typewriter_text(text, font_size, type_speed, duration)
remotion_add_stagger_text(text, stagger_by, animation_type, duration)

# Layouts
remotion_add_grid(children, layout, duration)
remotion_add_split_screen(left, right, variant, duration)
```

### Discovery Tools
- `remotion_list_components(category)`
- `remotion_search_components(query)`
- `remotion_get_component_schema(name)`
- `remotion_list_themes()`

### Token Tools
- `remotion_list_color_tokens()`
- `remotion_list_typography_tokens()`
- `remotion_list_motion_tokens()`
- `remotion_list_spacing_tokens()`

---

## Track-Based Timeline

Professional multi-track composition:

```python
# Main track: Sequential auto-stacking
remotion_add_title_scene(...)  # Starts at 0s
remotion_add_pie_chart(...)    # Auto-stacks after title

# Overlay track: Layers on top
remotion_add_text_overlay(..., track="overlay", offset=5.0)

# Background track: Behind main content
remotion_add_background(..., track="background")
```

**Default Tracks:**
- `main` (layer 0) - Primary content
- `overlay` (layer 10) - Text overlays, UI elements
- `background` (layer -10) - Background media

---

## Time String Format

All duration/timing parameters support flexible strings:

```python
duration="2s"       # 2 seconds
duration="500ms"    # 500 milliseconds
duration="1m"       # 1 minute
gap_before="1.5s"   # 1.5 second gap
```

---

## Project Structure

```
chuk-motion/
├── src/chuk_motion/
│   ├── server.py              # Main MCP server
│   ├── video_manager.py       # High-level video management
│   ├── tokens/                # Design tokens
│   │   ├── colors.py
│   │   ├── typography.py
│   │   ├── motion.py
│   │   └── spacing.py
│   ├── themes/                # Theme system
│   │   └── youtube_themes.py
│   ├── components/            # 51 components
│   │   ├── charts/
│   │   ├── overlays/
│   │   ├── code/
│   │   ├── layouts/
│   │   ├── animations/
│   │   ├── text_animations/
│   │   ├── frames/
│   │   ├── transitions/
│   │   └── content/
│   ├── generator/             # TSX generation
│   │   ├── component_builder.py
│   │   ├── composition_builder.py
│   │   └── timeline.py
│   └── render/                # Video rendering
│       ├── project_exporter.py
│       └── video_renderer.py
├── remotion-templates/        # Base templates
└── remotion-projects/         # Generated projects
```

---

## What We Can Adopt

### Direct Adoption ✅

1. **Design token system** - Colors, typography, spacing, motion
2. **Platform safe margins** - Critical for multi-platform
3. **Component patterns** - Text animations, layouts, transitions
4. **Theme system** - Easy visual customization
5. **Timeline abstraction** - Track-based composition

### Integration Approach 🔧

Since this is Python and we're TypeScript-focused:

**Option 1: Run as MCP Server**
- Keep chuk-motion as a Python MCP server
- Call from our TypeScript codebase via MCP

**Option 2: Port Patterns**
- Port design tokens to TypeScript
- Implement similar component architecture in Remotion

**Option 3: Hybrid**
- Use chuk-motion for component generation
- Use short-video-maker-gyori for pipeline orchestration

---

## Comparison with short-video-maker-gyori

| Feature | short-video-maker-gyori | chuk-motion |
|---------|------------------------|-------------|
| Language | TypeScript | Python |
| Components | Basic scenes | 51 components |
| Design System | None | Full token system |
| Themes | None | 7 themes |
| Platform margins | None | 7 platforms |
| MCP Tools | 2 tools | 50+ tools |
| Timeline | Scene-based | Track-based |
| TTS | Kokoro | None |
| Captions | Whisper | None |
| Stock footage | Pexels | None |

**Insight:** These are complementary, not competing:
- **short-video-maker-gyori** = Pipeline + TTS + Captions + Footage
- **chuk-motion** = Components + Design System + Composition

---

## Key Patterns to Extract

### 1. Component Schema Pattern

Each component has:
- Zod-like schema for props
- Theme integration
- Animation presets
- Responsive sizing

### 2. Design Token Application

```python
# Components reference tokens, not hard-coded values
color = theme.colors.primary
font_size = tokens.typography.heading_1
padding = tokens.spacing.md
animation = tokens.motion.ease_out
```

### 3. Platform-Aware Rendering

```python
# Apply safe margins based on target platform
margins = tokens.spacing.safe_margins.tiktok
# { top: 100, bottom: 180, left: 24, right: 80 }
```

---

## Lessons Learned

1. **Design tokens are essential** - Enables consistent, themeable videos
2. **Platform safe margins are critical** - Content gets cropped without them
3. **Track-based timeline is powerful** - Enables complex compositions
4. **Component library pays off** - 51 components = rapid video creation
5. **MCP discovery tools help** - AI can explore available components

---

## Next Steps

1. [ ] Extract design token definitions
2. [ ] Port platform safe margins to TypeScript
3. [ ] Study component implementation patterns
4. [ ] Evaluate hybrid integration approach
5. [ ] Test MCP server compatibility

---

**Status:** Major discovery. Recommend hybrid integration approach.
