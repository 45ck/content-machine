# TASK-025: Implement Drift Detection Module

**Type:** Feature  
**Priority:** P2  
**Estimate:** M (4-8 hours)  
**Created:** 2026-01-07  
**Owner:** Unassigned  
**Phase:** Sync Strategies Phase 3

---

## Description

Implement a drift detection module that analyzes timestamp data to identify and characterize sync drift patterns. The module should:

1. Detect **linear drift** (sample rate mismatch)
2. Detect **stepped drift** (sudden jumps)
3. Detect **progressive drift** (accumulating error)
4. Optionally auto-correct detected drift

This module is used by sync strategies and the `cm rate` command.

---

## Acceptance Criteria

- [ ] Given timestamps with linear drift, when analyzing, then detects "linear" pattern with slope
- [ ] Given timestamps with sudden jump, when analyzing, then detects "stepped" pattern with jump location
- [ ] Given drift correction mode "detect", when analyzing, then reports drift without modifying
- [ ] Given drift correction mode "auto", when drift detected, then applies correction to timestamps
- [ ] Given corrected timestamps, when checking output, then drift is reduced below threshold

---

## Required Documentation

- [ ] JSDoc with drift pattern explanations
- [ ] Examples of each drift type

---

## Testing Considerations

### What Needs Testing

- Linear drift detection and slope calculation
- Stepped drift detection and jump identification
- Progressive drift accumulation
- Auto-correction algorithm
- Edge cases with minimal data

### Edge Cases

- Very short audio (<3 words)
- No detectable drift (already good)
- Multiple drift patterns combined
- Drift larger than audio duration

### Risks

- Over-correction making sync worse
- False positive drift detection

---

## Testing Plan

### Unit Tests - `src/audio/sync/drift.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  detectDrift,
  correctDrift,
  analyzeDriftPattern,
  DriftPattern,
  type DriftAnalysis,
} from './drift';

describe('detectDrift', () => {
  describe('linear drift', () => {
    it('detects linear drift with positive slope', () => {
      // Timestamps that drift 10ms per second
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.01, end: 1.3, expectedStart: 1.0 },
        { word: 'c', start: 2.02, end: 2.3, expectedStart: 2.0 },
        { word: 'd', start: 3.03, end: 3.3, expectedStart: 3.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('linear');
      expect(analysis.slope).toBeCloseTo(0.01, 2); // 10ms/s drift
      expect(analysis.severity).toBe('warning');
    });

    it('detects linear drift with negative slope', () => {
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 0.99, end: 1.3, expectedStart: 1.0 },
        { word: 'c', start: 1.98, end: 2.3, expectedStart: 2.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('linear');
      expect(analysis.slope).toBeCloseTo(-0.01, 2);
    });
  });

  describe('stepped drift', () => {
    it('detects sudden jump in timestamps', () => {
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.0, end: 1.3, expectedStart: 1.0 },
        { word: 'c', start: 2.5, end: 2.8, expectedStart: 2.0 }, // 500ms jump
        { word: 'd', start: 3.5, end: 3.8, expectedStart: 3.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('stepped');
      expect(analysis.jumpLocations).toContain(2); // Index of jump
      expect(analysis.jumpMagnitudeMs).toBeCloseTo(500, 0);
    });
  });

  describe('progressive drift', () => {
    it('detects accumulating error', () => {
      // Each word adds 20ms of error
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.02, end: 1.3, expectedStart: 1.0 },
        { word: 'c', start: 2.06, end: 2.3, expectedStart: 2.0 },
        { word: 'd', start: 3.12, end: 3.3, expectedStart: 3.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('progressive');
      expect(analysis.accumulationRate).toBeGreaterThan(0);
    });
  });

  describe('no drift', () => {
    it('returns "none" pattern when drift is within tolerance', () => {
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.001, end: 1.3, expectedStart: 1.0 },
        { word: 'c', start: 2.002, end: 2.3, expectedStart: 2.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('none');
      expect(analysis.severity).toBe('ok');
    });
  });

  describe('severity levels', () => {
    it('assigns "warning" for moderate drift', () => {
      // 50-100ms drift
      const analysis = detectDrift(createLinearDrift(0.05));
      expect(analysis.severity).toBe('warning');
    });

    it('assigns "error" for significant drift', () => {
      // >100ms drift
      const analysis = detectDrift(createLinearDrift(0.15));
      expect(analysis.severity).toBe('error');
    });

    it('assigns "critical" for severe drift', () => {
      // >300ms drift
      const analysis = detectDrift(createLinearDrift(0.35));
      expect(analysis.severity).toBe('critical');
    });
  });
});

describe('correctDrift', () => {
  describe('linear drift correction', () => {
    it('applies slope correction to timestamps', () => {
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.3 },
        { word: 'b', start: 1.1, end: 1.4 }, // 100ms drift
        { word: 'c', start: 2.2, end: 2.5 }, // 200ms drift
      ];

      const corrected = correctDrift(timestamps, { pattern: 'linear', slope: 0.1 });

      expect(corrected[1].start).toBeCloseTo(1.0, 1);
      expect(corrected[2].start).toBeCloseTo(2.0, 1);
    });

    it('preserves word durations during correction', () => {
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.5 },
        { word: 'b', start: 1.1, end: 1.6 },
      ];

      const corrected = correctDrift(timestamps, { pattern: 'linear', slope: 0.1 });

      const originalDuration = 0.5;
      expect(corrected[1].end - corrected[1].start).toBeCloseTo(originalDuration, 2);
    });
  });

  describe('stepped drift correction', () => {
    it('removes sudden jumps from timestamps', () => {
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.3 },
        { word: 'b', start: 1.0, end: 1.3 },
        { word: 'c', start: 2.5, end: 2.8 }, // 500ms jump
        { word: 'd', start: 3.5, end: 3.8 },
      ];

      const corrected = correctDrift(timestamps, {
        pattern: 'stepped',
        jumpLocations: [2],
        jumpMagnitudeMs: 500,
      });

      expect(corrected[2].start).toBeCloseTo(2.0, 1);
      expect(corrected[3].start).toBeCloseTo(3.0, 1);
    });
  });
});

describe('analyzeDriftPattern', () => {
  it('returns comprehensive drift metrics', () => {
    const timestamps = createLinearDrift(0.05);

    const metrics = analyzeDriftPattern(timestamps);

    expect(metrics).toHaveProperty('meanDriftMs');
    expect(metrics).toHaveProperty('maxDriftMs');
    expect(metrics).toHaveProperty('driftDirection');
    expect(metrics).toHaveProperty('pattern');
    expect(metrics).toHaveProperty('correctable');
  });
});

// Helper to create test data
function createLinearDrift(slopePerSecond: number) {
  return Array.from({ length: 10 }, (_, i) => ({
    word: `word${i}`,
    start: i + i * slopePerSecond,
    end: i + 0.3 + i * slopePerSecond,
    expectedStart: i,
  }));
}
```

---

## Implementation Notes

### Types

```typescript
// src/audio/sync/drift.ts

export type DriftPattern = 'none' | 'linear' | 'stepped' | 'progressive' | 'random';
export type DriftSeverity = 'ok' | 'warning' | 'error' | 'critical';

export interface DriftAnalysis {
  pattern: DriftPattern;
  severity: DriftSeverity;

  // Linear drift
  slope?: number; // ms drift per second

  // Stepped drift
  jumpLocations?: number[];
  jumpMagnitudeMs?: number;

  // Progressive drift
  accumulationRate?: number;

  // General metrics
  meanDriftMs: number;
  maxDriftMs: number;
  driftDirection: 'leading' | 'lagging' | 'mixed';

  // Recommendations
  correctable: boolean;
  suggestedAction?: string;
}

export interface DriftCorrectionOptions {
  mode: 'none' | 'detect' | 'auto';
  maxCorrectionMs?: number; // Don't correct more than this
  preserveDurations?: boolean;
}
```

### Detection Algorithm

```typescript
export function detectDrift(
  timestamps: Array<{ start: number; expectedStart?: number }>,
  options?: { toleranceMs?: number }
): DriftAnalysis {
  const tolerance = options?.toleranceMs ?? 30;

  // Calculate drift for each timestamp
  const drifts = timestamps.map((t, i) => {
    const expected = t.expectedStart ?? (/* estimate from average duration */);
    return {
      index: i,
      driftMs: (t.start - expected) * 1000,
    };
  });

  // Check for linear pattern (regression)
  const linearFit = fitLinearRegression(drifts);
  if (linearFit.r2 > 0.9) {
    return {
      pattern: 'linear',
      slope: linearFit.slope,
      // ...
    };
  }

  // Check for stepped pattern (sudden jumps)
  const jumps = detectJumps(drifts, { threshold: 200 });
  if (jumps.length > 0) {
    return {
      pattern: 'stepped',
      jumpLocations: jumps.map(j => j.index),
      jumpMagnitudeMs: Math.max(...jumps.map(j => j.magnitude)),
      // ...
    };
  }

  // Check for progressive pattern
  if (isProgressive(drifts)) {
    return { pattern: 'progressive', /* ... */ };
  }

  // No significant drift
  return { pattern: 'none', severity: 'ok', /* ... */ };
}
```

### Correction Algorithm

```typescript
export function correctDrift(
  timestamps: Array<{ word: string; start: number; end: number }>,
  analysis: DriftAnalysis
): Array<{ word: string; start: number; end: number }> {
  if (!analysis.correctable || analysis.pattern === 'none') {
    return timestamps;
  }

  switch (analysis.pattern) {
    case 'linear':
      return correctLinearDrift(timestamps, analysis.slope!);
    case 'stepped':
      return correctSteppedDrift(timestamps, analysis.jumpLocations!);
    case 'progressive':
      return correctProgressiveDrift(timestamps, analysis.accumulationRate!);
    default:
      return timestamps;
  }
}

function correctLinearDrift(timestamps, slope) {
  return timestamps.map((t, i) => {
    const correction = i * slope;
    const duration = t.end - t.start;
    return {
      word: t.word,
      start: t.start - correction,
      end: t.start - correction + duration,
    };
  });
}
```

---

## Verification Checklist

- [ ] 🔴 All tests written and failing before implementation
- [ ] 🟢 Implementation complete, all tests passing
- [ ] 🔵 Code refactored, tests still passing
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] All unit tests pass (`pnpm test src/audio/sync/drift.test.ts`)
- [ ] Linear regression implementation verified
- [ ] Correction preserves word order
- [ ] JSDoc with examples added
- [ ] Code committed to main branch
- [ ] Task moved to `done/`

---

## Related

- **Depends On:** None (can be developed in parallel)
- **Used By:** TASK-022, TASK-024
- **Implementation Plan:** [IMPL-SYNC-STRATEGIES-20260107](../../docs/architecture/IMPL-SYNC-STRATEGIES-20260107.md)
- **Research:** [RQ-34: Drift Detection Strategies](../../docs/research/investigations/RQ-34-DRIFT-DETECTION-RETIMING-STRATEGIES-20260107.md)
