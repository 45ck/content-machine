# Nano Banana Pro Prompt Engineering Reference

**Date:** 2026-01-07  
**Version:** 1.0  
**Source:** Vendored prompt libraries analysis

---

## Overview

This reference documents battle-tested prompt patterns for Nano Banana Pro (Gemini 2.5 Flash Image / Gemini 3 Pro Image) extracted from the 8 vendored prompt library repositories.

## Prompt Structure Patterns

### Pattern 1: JSON Schema Prompt (Most Consistent)

For complex compositions, use structured JSON:

```json
{
  "subject": {
    "description": "Young woman in modern streetwear",
    "face": { "preserve_original": true },
    "pose": "casual, confident stance",
    "clothing": {
      "top": "oversized cream sweater",
      "bottom": "high-waisted jeans"
    }
  },
  "environment": {
    "setting": "urban coffee shop",
    "lighting": "warm afternoon sun through windows",
    "atmosphere": "cozy, inviting"
  },
  "photography": {
    "camera_style": "35mm film aesthetic",
    "lens": "50mm f/1.8",
    "depth_of_field": "shallow, soft bokeh",
    "color_grading": "warm, nostalgic tones"
  },
  "composition": {
    "aspect_ratio": "9:16",
    "framing": "medium shot, rule of thirds"
  }
}
```

### Pattern 2: Narrative Prompt (Quick Generation)

For fast iteration:

```text
Create a [STYLE] photograph of [SUBJECT] in [ENVIRONMENT].
Camera: [LENS/ANGLE]. Lighting: [LIGHTING TYPE].
Mood: [EMOTIONAL TONE]. Quality: [RESOLUTION/DETAIL LEVEL].
```

Example:

```text
Create a cinematic photograph of a software developer working at night.
Camera: Wide angle, slightly low. Lighting: Monitor glow with ambient city lights.
Mood: Focused, peaceful. Quality: 8K, photorealistic.
```

### Pattern 3: Reference-Based Edit

When modifying an uploaded reference:

```text
Keep the facial features of the person in the uploaded image exactly consistent.
[Specific changes to make]
Preserve: [Elements to keep unchanged]
Change only: [Elements allowed to change]
```

---

## Category-Specific Prompts

### Professional Headshots

```text
Keep the facial features of the person in the uploaded image exactly consistent.
Dress them in a professional navy blue business suit with a white shirt.
Background: Clean, solid dark gray studio photography backdrop with subtle gradient.
Photography Style: Shot on a Sony A7III with an 85mm f/1.4 lens.
Lighting: Classic three-point lighting setup with soft key light.
Details: Natural skin texture with visible pores, not airbrushed.
Add natural catchlights to the eyes.
Final image: Ultra-realistic 8k professional headshot.
```

### Product Photography

```text
Identify the main product in the uploaded photo.
Recreate it as a premium e-commerce product shot.
Subject Isolation: Cleanly extract the product, remove any hands or clutter.
Background: Pure white studio background (RGB 255, 255, 255).
Add subtle, natural contact shadow at the base.
Lighting: Soft commercial studio lighting highlighting texture and material.
Retouching: Fix any lens distortion, improve sharpness, color-correct.
```

### Video Thumbnail

```text
Design a viral video thumbnail.
Subject: [PERSON/TOPIC] on the left side, pointing toward the right.
Expression: Excited, surprised, exaggerated.
Right side: [PRODUCT/TOPIC IMAGE] with bold yellow arrow connecting.
Text: "[HOOK TEXT]" in massive pop-style font with white outline and drop shadow.
Background: Bright, blurred, high saturation and contrast.
Aspect ratio: 16:9.
```

### Title Card / Infographic

```text
Design a clean, modern title card for a short-form video.
Title: "[YOUR TITLE]" in bold sans-serif typography.
Style: Minimalist, high contrast, suitable for TikTok.
Colors: [PRIMARY COLOR] background with [CONTRAST COLOR] text.
Aspect ratio: 9:16.
No faces, no photos, just clean typography and shapes.
```

### 3D Character / Avatar

```text
Transform the person in the uploaded photo into a cute 3D Pop Mart style blind box character.
Likeness: Keep key features recognizable: [hair color, glasses, hairstyle].
Style: C4D rendering, occlusion render, cute Q-version, soft studio lighting, pastel colors.
Background: Simple, solid matte color background (soft blue).
Detail: Smooth plastic toy texture with slight glossy finish.
Facing forward, friendly expression.
```

### Scene/Environment Generation

```text
A [TIME OF DAY] scene at [LOCATION].
Environment: [DETAILED DESCRIPTION OF SETTING].
Atmosphere: [MOOD/WEATHER].
Camera: [LENS] lens, [ANGLE] angle, [DISTANCE] shot.
Lighting: [LIGHT SOURCE] creating [SHADOW TYPE] shadows.
Style: [PHOTOGRAPHIC STYLE - cinematic/documentary/editorial].
Aspect ratio: 9:16 vertical.
```

---

## Character Consistency Techniques

### Technique 1: Character Reference Sheet

Generate a reference sheet first, then use it for all scenes:

```text
Create a character reference sheet showing the same person in multiple views.
Layout: Front view, 3/4 view, side profile arranged horizontally.
Background: Pure white studio background.
Lighting: Even, flat lighting to show all details.
Expression: Neutral in all views.
Purpose: Reference for maintaining consistency across multiple scenes.
```

### Technique 2: Face Lock Prompt

Include in every scene prompt:

```text
"facelock_identity": true
"accuracy": "100%"
Keep the facial features exactly as shown in the reference image.
Only change: [pose/expression/environment/clothing].
Never change: bone structure, skin tone, facial proportions.
```

### Technique 3: Style Bible

Create once, reference in all prompts:

```json
{
  "style_bible": {
    "lighting": "warm golden hour, soft shadows",
    "color_palette": ["#F5E6D3", "#8B4513", "#2F4F4F"],
    "camera": "35mm film, slight grain",
    "mood": "nostalgic, authentic",
    "clothing_style": "modern casual, earth tones"
  }
}
```

---

## Aspect Ratio Quick Reference

| Platform          | Ratio | Resolution | Use Case             |
| ----------------- | ----- | ---------- | -------------------- |
| TikTok/Reels      | 9:16  | 1080×1920  | Full-screen vertical |
| YouTube Shorts    | 9:16  | 1080×1920  | Full-screen vertical |
| Instagram Feed    | 4:5   | 1080×1350  | Feed posts           |
| YouTube Thumbnail | 16:9  | 1920×1080  | Thumbnails           |
| Square            | 1:1   | 1080×1080  | Versatile            |

---

## Advanced Patterns

### Cinematic Keyframe Generator

```text
<role>
Award-winning trailer director + cinematographer + storyboard artist.
</role>

<input>
User provides: one reference image.
</input>

<rules>
1. Analyze full composition: identify ALL key subjects
2. Strict continuity: same subjects, wardrobe, environment across all shots
3. Only action, expression, blocking, framing, angle may change
4. Do NOT introduce new characters/objects
</rules>

<output>
Generate 9-12 keyframes for a 10-20 second sequence.
Each frame: KF number + shot type + suggested duration.
Maintain consistent color grade across all frames.
</output>
```

### Split View Render (Product Showcase)

```text
Create a 3D render of [PRODUCT].
Object must float freely in mid-air, gently tilted.
Background: Soft, minimalist dark background, 1080×1080.

Left Half — Full Realism:
Accurate materials, colors, textures, reflections.
Completely opaque, no wireframe.

Right Half — Hard Cut Wireframe Interior:
Vertical, sharp, crisp cut line.
Wireframe lines: white (80%) + [dominant color from product] (20%).
Engineering-style, thin, precise lines.

Render only ONE object in entire frame.
No duplicates, no reflections showing second object.
```

### Fisheye Wide-Angle Selfie

```text
A hyper-realistic fisheye wide-angle selfie.
Lens: vintage 35mm fisheye, heavy barrel distortion.
No camera or phone visible in hands.
Subject: [PERSON] taking selfie with [CHARACTER/OBJECT].
Everyone making wild, exaggerated faces, squinting from flash.
Lighting: Harsh, direct on-camera flash with hard shadows.
Texture: Authentic film grain, slight motion blur on edges.
Mood: Candid, amateur snapshot, chaotic behind-the-scenes.
```

---

## Error Prevention

### Common Mistakes to Avoid

| Mistake                 | Problem              | Fix                                |
| ----------------------- | -------------------- | ---------------------------------- |
| Vague subject           | Inconsistent results | Be specific about every element    |
| Missing aspect ratio    | Wrong dimensions     | Always specify 9:16 for shorts     |
| No lighting direction   | Flat images          | Specify light source and quality   |
| Generic style           | Boring output        | Reference specific camera/film/era |
| Missing negative prompt | Unwanted elements    | Add what to exclude                |

### Negative Prompt Template

```text
Negative: [List elements to avoid]
- No watermarks, no text overlays, no logos
- No extra limbs, no distorted faces
- No blurry details, no low resolution
- No [specific unwanted elements]
```

---

## Content Machine Integration

### Scene Type → Prompt Template Mapping

| Scene Type  | Template            | Key Elements                      |
| ----------- | ------------------- | --------------------------------- |
| Hook/Intro  | Thumbnail style     | Exaggerated expression, bold text |
| Explanation | Infographic style   | Clean layout, icons, minimal      |
| Example     | Product photo style | Isolated subject, white bg        |
| Comparison  | Split view          | Side-by-side, clear labels        |
| Story       | Cinematic scene     | Environment, mood, lighting       |
| Outro       | Title card          | CTA text, brand colors            |

### Archetype-Specific Prompts

#### Listicle

```text
Create an infographic showing "[LIST ITEM]".
Style: Clean, modern, suitable for educational content.
Include: Numbered badge (e.g., "#1"), clear icon, short text label.
Colors: [BRAND COLORS].
Aspect ratio: 9:16.
```

#### Versus

```text
Create a split-screen comparison image.
Left side: [OPTION A] with label.
Right side: [OPTION B] with label.
Center: "VS" in bold, dynamic typography.
Style: Clean, balanced, fair representation of both.
```

#### How-To

```text
Create a step-by-step visual for "[STEP]".
Show: Action being performed clearly.
Include: Step number, brief instruction text.
Style: Clean, instructional, easy to follow.
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                 NANO BANANA PRO CHEAT SHEET                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STRUCTURE:                                                 │
│  [Subject] + [Environment] + [Camera] + [Lighting] +        │
│  [Style] + [Aspect Ratio]                                   │
│                                                             │
│  CONSISTENCY:                                               │
│  "Keep facial features exactly consistent"                  │
│  + reference image + preserve/change lists                  │
│                                                             │
│  QUALITY KEYWORDS:                                          │
│  8K, photorealistic, ultra-detailed, cinematic,             │
│  professional, high-fidelity, premium                       │
│                                                             │
│  CAMERA STYLES:                                             │
│  35mm film, Sony A7III, Canon 5D, Hasselblad,               │
│  iPhone, point-and-shoot, DSLR, mirrorless                  │
│                                                             │
│  LIGHTING:                                                  │
│  golden hour, studio, flash, natural, dramatic,             │
│  soft, hard, rim, three-point, ambient                      │
│                                                             │
│  AVOID:                                                     │
│  Vague descriptions, missing aspect ratio,                  │
│  no lighting info, generic style terms                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## References

- Vendored: `vendor/prompt-libraries/awesome-nanobanana-pro/`
- Vendored: `vendor/prompt-libraries/awesome-nano-banana-pro-prompts/`
- [Gemini Image Generation Docs](https://ai.google.dev/gemini-api/docs/image-generation)
- [Official Prompting Guide](https://blog.google/products/gemini/prompting-tips-nano-banana-pro/)
