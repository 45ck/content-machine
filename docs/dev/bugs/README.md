# Bug Analysis Index

**Last Updated:** 2026-06-06

This directory contains systematic root-cause analyses and deep-fix documentation for bugs discovered during content-machine development.

---

## Bug Documentation Format

Each bug document follows this structure:

1. **Problem Statement** - What the user saw
2. **Root Cause Analysis** - Multi-layer investigation
3. **Fix Implementation** - Code changes with examples
4. **Test Coverage** - Unit tests added
5. **Verification** - Before/after comparison
6. **Lessons Learned** - Patterns for future prevention

---

## Bug Index

| ID                                                     | Title                          | Status | Severity | Related Commits  |
| ------------------------------------------------------ | ------------------------------ | ------ | -------- | ---------------- |
| [BUG-001](BUG-001-TTS-MARKERS-IN-CAPTIONS-20260606.md) | TTS Markers in Video Captions  | FIXED  | High     | 96eedc2, 1462eae |
| [BUG-002](BUG-002-HOOK-TEXT-DUPLICATION-20260606.md)   | Hook Text Duplication in Audio | FIXED  | Medium   | 7020b15          |
| [BUG-003](BUG-003-ASR-ARTIFACTS-AS-WORDS-20260606.md)  | ASR Artifacts as Caption Words | FIXED  | Medium   | 1462eae          |

---

## Common Patterns

### Multi-Layer Defense

All caption-related bugs were fixed with a defense-in-depth approach:

```
┌─────────────────┐
│  ASR Layer      │  ← isWhisperArtifact() filters during transcription
├─────────────────┤
│  Caption Layer  │  ← sanitizeTimedWords() filters before paging
├─────────────────┤
│  Render Layer   │  ← buildRenderProps() final safety filter
└─────────────────┘
```

### Content-Aware Processing

Script assembly bugs (hook duplication) were fixed by:

- Detecting content overlap between sections
- Case-insensitive text matching
- Conditional section inclusion

### Confidence-Based Filtering

ASR artifacts were addressed by:

- Using Whisper confidence scores
- Empirically tuned thresholds (0.15 for ASR, 0.10 for captions)
- Preserving words without confidence scores

---

## Prevention Guidelines

1. **Always filter ASR output** - Never trust raw transcription
2. **Use confidence scores** - Low confidence = likely artifact
3. **Test with real TTS audio** - Synthetic audio has unique artifacts
4. **Defense in depth** - Multiple filtering layers catch different issues
5. **Pattern evolution** - Keep regex patterns updated for new TTS engines

---

## Related Documentation

- [V&V Framework](../dev/guides/VV-FRAMEWORK-20260105.md) - Validation approach
- [Caption System](../dev/features/feature-caption-system-20260605.md) - Caption architecture
- [Audio Pipeline](../dev/architecture/IMPL-PHASE-2-AUDIO-20260105.md) - TTS/ASR design
