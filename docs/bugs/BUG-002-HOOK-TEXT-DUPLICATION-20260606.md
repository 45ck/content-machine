# BUG-002: Hook Text Duplication in Audio

**Date:** 2026-06-06  
**Status:** FIXED (prior commit 7020b15)  
**Severity:** Medium (audio quality issue)  
**Root Cause:** Script assembly logic

---

## Problem Statement

The hook text was being spoken twice in generated audio:
1. First as the explicit "hook" section
2. Second as part of "scene 1" content (which often repeats the hook)

**Example Output:**
```
Audio: "These 5 morning habits will change your life. These 5 morning habits..."
       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^^^^^^^^^^
       Hook (explicit)                               Scene 1 (repeated)
```

---

## Root Cause Analysis

### The Script Structure Problem

Scripts follow an archetype pattern where:
- **Hook:** Opening attention-grabber (e.g., "These 5 morning habits will change your life")
- **Scene 1:** Often begins with the same or similar text for narrative flow

When the audio pipeline assembled sections naively:
```typescript
// BUGGY: Naive assembly
sections = [
  { text: script.hook },           // "5 morning habits..."
  { text: script.scenes[0].text }, // "5 morning habits..." (repeated!)
  { text: script.scenes[1].text },
  // ...
];
```

### LLM Script Generation Pattern

The LLM naturally includes the hook in scene 1 because:
1. Scene 1 should flow from the hook
2. Repetition is natural in spoken content
3. No explicit instruction to avoid duplication

---

## Fix Implementation

**Location:** `src/audio/pipeline.ts` - `buildAlignmentSections()`

```typescript
export function buildAlignmentSections(script: ScriptOutput): AlignmentSection[] {
  const sections: AlignmentSection[] = [];
  
  // Check if hook is already included in first scene
  const firstSceneText = script.scenes[0]?.narration || '';
  const hookText = script.hook || '';
  
  // Only add hook as separate section if NOT duplicated in scene 1
  if (hookText && !firstSceneText.toLowerCase().includes(hookText.toLowerCase())) {
    sections.push({
      type: 'hook',
      text: hookText,
      order: 0,
    });
  }
  
  // Add scenes
  script.scenes.forEach((scene, index) => {
    sections.push({
      type: 'scene',
      text: scene.narration,
      order: index + 1,
      sceneIndex: index,
    });
  });
  
  // Similar deduplication for CTA...
  const lastSceneText = script.scenes[script.scenes.length - 1]?.narration || '';
  const ctaText = script.cta || '';
  
  if (ctaText && !lastSceneText.toLowerCase().includes(ctaText.toLowerCase())) {
    sections.push({
      type: 'cta',
      text: ctaText,
      order: script.scenes.length + 1,
    });
  }
  
  return sections;
}
```

### Deduplication Logic

| Condition | Action |
|-----------|--------|
| `scene1.includes(hook)` | Skip separate hook section |
| `!scene1.includes(hook)` | Add hook as separate section |
| `lastScene.includes(cta)` | Skip separate CTA section |
| `!lastScene.includes(cta)` | Add CTA as separate section |

---

## Test Coverage

**Unit Tests (`tests/unit/audio/pipeline.test.ts`):**

```typescript
describe('buildAlignmentSections', () => {
  it('deduplicates hook when included in scene 1', () => {
    const script = {
      hook: '5 morning habits',
      scenes: [
        { narration: '5 morning habits will change your life' },
        { narration: 'First, wake up early' },
      ],
      cta: 'Follow for more',
    };
    
    const sections = buildAlignmentSections(script);
    
    // Hook should NOT be separate section
    expect(sections.filter(s => s.type === 'hook')).toHaveLength(0);
    expect(sections.filter(s => s.type === 'scene')).toHaveLength(2);
  });
  
  it('includes hook when NOT in scene 1', () => {
    const script = {
      hook: 'Wait for it...',
      scenes: [
        { narration: 'Here are 5 tips' },
      ],
    };
    
    const sections = buildAlignmentSections(script);
    
    // Hook SHOULD be separate section
    expect(sections.filter(s => s.type === 'hook')).toHaveLength(1);
  });
});
```

---

## Verification

### Before Fix
```
Timestamps:
  [0.0s] "These"
  [0.2s] "5"
  [0.3s] "morning"
  [0.5s] "habits"
  [1.0s] "These"      <- DUPLICATE
  [1.2s] "5"          <- DUPLICATE
  [1.3s] "morning"    <- DUPLICATE
```

### After Fix
```
Timestamps:
  [0.0s] "These"
  [0.2s] "5"
  [0.3s] "morning"
  [0.5s] "habits"
  [0.8s] "will"       <- Continues naturally
  [1.0s] "change"
```

---

## Edge Cases Handled

1. **Case-insensitive matching:** `hook.toLowerCase().includes()`
2. **Partial inclusion:** Hook "5 tips" inside scene "Here are 5 tips for you"
3. **Empty hook/CTA:** Gracefully handled with `|| ''` default
4. **Single scene scripts:** Works correctly

---

## Why Demo Files Showed the Bug

The demo files (`output/mode-page-12words/`) were generated at **4:36 PM**.

The fix (commit 7020b15) was applied at **5:51 PM**.

The code is correct; the demo files are stale artifacts from before the fix.

---

## Lessons Learned

1. **Content-Aware Assembly:** Don't naively concatenate script sections
2. **LLM Output Patterns:** Expect natural repetition in generated content
3. **Bidirectional Deduplication:** Apply to both hook→scene1 AND lastScene→CTA
4. **Case-Insensitive Matching:** Natural language varies in capitalization

---

## Related Files

- [src/audio/pipeline.ts](../../src/audio/pipeline.ts) - Section assembly logic
- [src/script/generator.ts](../../src/script/generator.ts) - Script generation
- [tests/unit/audio/pipeline.test.ts](../../tests/unit/audio/pipeline.test.ts) - Tests
