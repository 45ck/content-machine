# BUG-002: Hook Text Duplication in Audio

**Date:** 2026-01-06  
**Status:** FIXED (prior commit 7020b15)  
**Severity:** Medium (audio quality issue)  
**Root Cause:** Script assembly logic

---

## Problem Statement

The hook text was being spoken twice in generated audio:

1. First as the explicit "hook" unit
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

When the audio pipeline assembled alignment units naively:

```typescript
// BUGGY: Naive assembly
units = [
  { text: script.hook }, // "5 morning habits..."
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

**Location:** `src/audio/alignment.ts` - `buildAlignmentUnits()`

```typescript
export function buildAlignmentUnits(script: ScriptOutput): SpokenUnit[] {
  const units: SpokenUnit[] = [];

  const hookText = script.hook ?? '';
  const firstSceneText = script.scenes[0]?.text ?? '';

  // Only add hook as separate unit if NOT duplicated in scene 1
  if (hookText && !firstSceneText.toLowerCase().includes(hookText.toLowerCase())) {
    units.push({ id: 'hook', text: hookText });
  }

  // Add scenes
  script.scenes.forEach((scene) => {
    units.push({ id: scene.id, text: scene.text });
  });

  // Similar deduplication for CTA
  const lastSceneText = script.scenes[script.scenes.length - 1]?.text ?? '';
  const ctaText = script.cta ?? '';

  if (ctaText && !lastSceneText.toLowerCase().includes(ctaText.toLowerCase())) {
    units.push({ id: 'cta', text: ctaText });
  }

  return units;
}
```

### Deduplication Logic

| Condition                  | Action                    |
| -------------------------- | ------------------------- |
| `scene1.includes(hook)`    | Skip separate hook unit   |
| `!scene1.includes(hook)`   | Add hook as separate unit |
| `lastScene.includes(cta)`  | Skip separate CTA unit    |
| `!lastScene.includes(cta)` | Add CTA unit              |

---

## Test Coverage

**Unit Tests (`tests/unit/audio/alignment-units.test.ts`):**

```typescript
describe('buildAlignmentUnits', () => {
  it('deduplicates hook when included in scene 1', () => {
    const script = {
      hook: '5 morning habits',
      scenes: [
        { id: 'scene-001', text: '5 morning habits will change your life' },
        { id: 'scene-002', text: 'First, wake up early' },
      ],
      cta: 'Follow for more',
    };

    const units = buildAlignmentUnits(script);

    // Hook should NOT be separate unit
    expect(units.filter((unit) => unit.id === 'hook')).toHaveLength(0);
    expect(units.filter((unit) => unit.id.startsWith('scene-'))).toHaveLength(2);
  });

  it('includes hook when NOT in scene 1', () => {
    const script = {
      hook: 'Wait for it...',
      scenes: [{ id: 'scene-001', text: 'Here are 5 tips' }],
    };

    const units = buildAlignmentUnits(script);

    // Hook SHOULD be separate unit
    expect(units.filter((unit) => unit.id === 'hook')).toHaveLength(1);
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

1. **Content-Aware Assembly:** Don't naively concatenate alignment units
2. **LLM Output Patterns:** Expect natural repetition in generated content
3. **Bidirectional Deduplication:** Apply to both hook/scene1 AND lastScene/CTA
4. **Case-Insensitive Matching:** Natural language varies in capitalization

---

## Related Files

- [src/audio/alignment.ts](../../src/audio/alignment.ts) - Alignment unit assembly logic
- [src/script/generator.ts](../../src/script/generator.ts) - Script generation
- [tests/unit/audio/alignment-units.test.ts](../../tests/unit/audio/alignment-units.test.ts) - Tests
