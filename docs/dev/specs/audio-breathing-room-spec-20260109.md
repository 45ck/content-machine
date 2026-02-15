# Audio Breathing Room Specification

**Status:** Draft  
**Author:** Claude (via PHOENIX LOOP interview)  
**Date:** 2026-01-09  
**Plan Reference:** `INSTRUCTIONS_PHOENIX_LOOP.md` (Loop #7)

## 1. Overview

### 1.1 Problem Statement

The audio quality score is at 88% with breathing room at 60%. Generated speech lacks natural pauses after punctuation, making the output feel rushed and robotic. This affects viewer engagement and comprehension.

### 1.2 Goals

- Improve breathing room metric from 60% to 90%+
- Add context-aware pause hints at script generation time
- Maintain or improve caption sync quality (currently 99.4%)
- Pass 90% audio quality gate for video output

### 1.3 Non-Goals

- Transition smoothness (separate Loop #8)
- Audio crossfades between scenes (separate issue)
- Visual-audio sync at scene boundaries (separate issue)
- Changing TTS engine (kokoro-js remains)

## 2. Technical Design

### 2.1 Architecture

```
+-----------------+      +------------------+      +------------------+
|  Script stage   | ---> |   Audio stage    | ---> |   Quality gate   |
|  + pause hints  |      | + pause insert   |      |  >= 90% (audio)  |
+-----------------+      +------------------+      +------------------+

LLM generates pause metadata per sentence. Audio stage experiments with:
1) SSML <break> (if supported), 2) post-process WAV (insert silence), 3) adjust TTS rate.
```

### 2.2 Pipeline Integration

**Affected stages:**

- `src/script/` - Add pause hint generation to LLM prompts
- `src/audio/` - Implement pause insertion (approach TBD via experiment)
- `src/score/` - Breathing room metric validation

**Unchanged stages:**

- `src/visuals/` - No impact
- `src/render/` - No impact (receives audio with pauses already applied)

### 2.3 Schema Changes

**Experiment: two approaches to evaluate**

**Option A: Extend script schema**

```typescript
// In ScriptOutputSchema
sentences: z.array(
  z.object({
    text: z.string(),
    pauseAfterMs: z.number().optional(), // NEW: 0-1000ms
    emphasis: z.enum(['normal', 'strong']).optional(),
  })
);
```

**Option B: Inline markup**

```text
This is important. [pause:400] The next point is...
```

Decision: prototype both, measure which integrates cleaner with ASR reconciliation.

### 2.4 Dependencies

- kokoro-js TTS engine (verify SSML support)
- Whisper ASR (must handle silence correctly)
- Existing sync strategies (standard, audio-first, forced-align)

## 3. Content & Quality

### 3.1 Archetype Support

All archetypes affected equally:

- **listicle**: Pauses between list items
- **versus**: Pauses at comparison transitions
- **howto**: Pauses between steps
- **myth**: Pauses at myth/reality boundary
- **story**: Pauses for dramatic effect
- **hot-take**: Pauses for emphasis

### 3.2 Quality Metrics

| Metric          | Current | Target | Gate          |
| --------------- | ------- | ------ | ------------- |
| Audio Quality   | 88%     | 95%+   | 90%           |
| Breathing Room  | 60%     | 90%+   | -             |
| Caption Quality | 99.4%   | 99%+   | No regression |
| Sync Quality    | 95%     | 95%+   | No regression |

### 3.3 Edge Cases

1. Very short sentences: may not need pauses (< 3 words)
2. Rapid-fire lists: shorter pauses to maintain energy
3. Questions: longer pause after for emphasis
4. Dramatic statements: context-dependent longer pauses
5. Code/technical terms: no pause mid-term

## 4. Implementation

### 4.1 Phases

**Phase 1: Experimentation Setup**

- Create test harness for pause approaches
- Generate baseline audio samples (no pauses)
- Implement metric for measuring pause presence

**Phase 2: Approach Prototyping**

- Prototype A: SSML `<break>` tags in TTS input
- Prototype B: Post-process WAV with silence insertion
- Prototype C: TTS rate/speed adjustments

**Phase 3: Measurement & Selection**

- Generate 10+ samples with each approach
- Measure breathing room score
- Manual review (listen test)
- Check for regressions in caption sync

**Phase 4: LLM Pause Hints**

- Update script prompts to generate pause hints
- Experiment with schema approach vs inline markup
- Validate LLM output quality

**Phase 5: Integration & Quality Gate**

- Integrate winning approach into pipeline
- Add 90% quality gate
- Update PHOENIX LOOP tracker

### 4.2 Technical Decisions

| Decision             | Choice              | Rationale                                            |
| -------------------- | ------------------- | ---------------------------------------------------- |
| Pause source         | LLM at script time  | Context-aware, understands semantics                 |
| Validation           | Prototype + listen  | Quality requires human judgment                      |
| Complexity tolerance | Quality wins        | Willing to add complexity for measurable improvement |
| Scope                | One issue at a time | Clean A/B testing, isolated changes                  |

### 4.3 Open Questions

1. Does kokoro-js support SSML `<break>` tags natively?
2. How does silence affect ASR word boundary detection?
3. What’s the optimal pause duration by punctuation type?
4. Should pause hints be in `script.json` or a separate file?

## 5. Quality

### 5.1 Testing Strategy

**Unit tests:**

- Pause hint generation from LLM
- Pause insertion logic (all three approaches)
- Breathing room metric calculation

**Integration tests:**

- Full pipeline with pauses enabled
- Caption sync verification after pause insertion
- Quality gate enforcement

**Manual validation:**

- Listen to 10+ generated videos
- Compare before/after on the same script
- Check for awkward pauses or timing issues

### 5.2 Success Metrics

- Breathing room: 60% -> 90%+
- Audio quality: 88% -> 95%+
- No regression in caption quality (99.4%)
- Manual review: "Sounds natural"

### 5.3 LLM Evaluation

May need promptfoo eval for pause hint generation:

- Are pauses placed at semantically appropriate locations?
- Are pause durations reasonable (150-600ms)?
- Does the LLM handle edge cases (lists, questions)?

## 6. Risks and Mitigations

| Risk                               | Likelihood | Impact | Mitigation                                          |
| ---------------------------------- | ---------- | ------ | --------------------------------------------------- |
| SSML not supported by kokoro       | Medium     | High   | Fallback to post-process approach                   |
| Pauses break ASR reconciliation    | Medium     | High   | Test sync quality before/after extensively          |
| Pauses too long (2+ seconds)       | Low        | Medium | Cap max pause at 600ms in validation                |
| LLM generates inconsistent hints   | Medium     | Medium | Add Zod validation, fallback to heuristics          |
| Render failures from length change | Low        | High   | Ensure Remotion compositions handle variable length |
| Caption desync from pauses         | Medium     | High   | Re-run reconciliation after pause insertion         |

## 7. Interview Notes

**Key decisions from interview:**

1. Approach: prototype multiple approaches, measure, pick best
2. Pause timing: context-aware via LLM, not fixed durations
3. Deal-breakers: timing misalignment and abrupt transitions are unacceptable
4. Schema: experiment with both extension and inline markup
5. Quality gate: 90% minimum to release video
6. Validation: manual review of 10+ videos
7. Scope: breathing room first, transitions in a separate loop
8. Time budget: deep dive (1+ day) for comprehensive experimentation
9. Housekeeping: commit Pexels fix first to keep changes isolated

**Failure modes to guard against:**

- Silent gaps too long (kills engagement)
- Caption desync (pauses break ASR reconciliation)
- Render failures (audio length changes cause composition errors)
