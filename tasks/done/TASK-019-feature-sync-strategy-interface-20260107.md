# TASK-019: Create Sync Strategy Interface and Factory

**Type:** Feature  
**Priority:** P1  
**Estimate:** M (4-8 hours)  
**Created:** 2026-01-07  
**Owner:** Unassigned  
**Phase:** Sync Strategies Phase 1

---

## Description

Create the `SyncStrategy` interface and `createSyncStrategy()` factory function. This establishes the strategy pattern that allows different sync algorithms to be plugged in.

The interface should define a common contract for:

- Generating word-level timestamps from audio + script
- Reporting confidence and source information
- Supporting optional reconciliation

---

## Acceptance Criteria

- [ ] Given strategy name "standard", when calling `createSyncStrategy()`, then returns `StandardSyncStrategy` instance
- [ ] Given strategy name "audio-first", when calling `createSyncStrategy()`, then returns `AudioFirstSyncStrategy` instance
- [ ] Given unknown strategy name, when calling `createSyncStrategy()`, then throws descriptive error
- [ ] Given any strategy implementation, when calling `generateTimestamps()`, then returns valid `TimestampsOutput`
- [ ] Given strategy with options, when calling factory, then options are passed to strategy constructor

---

## Required Documentation

- [ ] JSDoc comments on interface and all methods
- [ ] Update implementation plan if interface changes

---

## Testing Considerations

### What Needs Testing

- Factory returns correct strategy type
- All strategy types can be instantiated
- Interface contract is enforced
- Options are properly passed through

### Edge Cases

- Null/undefined strategy name
- Case sensitivity of strategy names
- Missing required options for specific strategies

### Risks

- Over-engineering the interface before knowing all use cases

---

## Testing Plan

### Unit Tests - `src/audio/sync/strategy.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { createSyncStrategy, SyncStrategy, SyncStrategyOptions } from './strategy';
import { CMError } from '../../core/errors';

describe('SyncStrategy interface', () => {
  it('has required method generateTimestamps', () => {
    const strategy: SyncStrategy = {
      name: 'test',
      generateTimestamps: vi.fn(),
    };

    expect(typeof strategy.generateTimestamps).toBe('function');
  });
});

describe('createSyncStrategy factory', () => {
  describe('strategy selection', () => {
    it('creates StandardSyncStrategy for "standard"', () => {
      const strategy = createSyncStrategy('standard');
      expect(strategy.name).toBe('standard');
    });

    it('creates AudioFirstSyncStrategy for "audio-first"', () => {
      const strategy = createSyncStrategy('audio-first');
      expect(strategy.name).toBe('audio-first');
    });

    it('creates ForcedAlignSyncStrategy for "forced-align"', () => {
      const strategy = createSyncStrategy('forced-align');
      expect(strategy.name).toBe('forced-align');
    });

    it('throws CMError for unknown strategy', () => {
      expect(() => createSyncStrategy('unknown' as any)).toThrow(CMError);
    });

    it('error message includes available strategies', () => {
      try {
        createSyncStrategy('invalid' as any);
      } catch (e) {
        expect((e as CMError).message).toContain('standard');
        expect((e as CMError).message).toContain('audio-first');
      }
    });
  });

  describe('options passing', () => {
    it('passes options to strategy constructor', () => {
      const options: SyncStrategyOptions = {
        requireWhisper: true,
        reconcile: true,
        asrModel: 'small',
      };

      const strategy = createSyncStrategy('audio-first', options);

      // Strategy should have access to options
      expect((strategy as any).options.requireWhisper).toBe(true);
    });
  });

  describe('case handling', () => {
    it('handles case-insensitive strategy names', () => {
      expect(createSyncStrategy('STANDARD' as any).name).toBe('standard');
      expect(createSyncStrategy('Audio-First' as any).name).toBe('audio-first');
    });
  });
});
```

### Unit Tests - `src/audio/sync/factory.test.ts`

```typescript
describe('strategy factory registration', () => {
  it('all configured strategies are available', () => {
    const strategies = getAvailableStrategies();

    expect(strategies).toContain('standard');
    expect(strategies).toContain('audio-first');
    expect(strategies).toContain('forced-align');
    expect(strategies).toContain('hybrid');
  });

  it('strategies report their availability correctly', () => {
    // Standard should always be available
    expect(isStrategyAvailable('standard')).toBe(true);

    // Forced-align may not be (requires Aeneas)
    // Just check it doesn't throw
    expect(typeof isStrategyAvailable('forced-align')).toBe('boolean');
  });
});
```

---

## Implementation Notes

### Interface Definition

```typescript
// src/audio/sync/strategy.ts

import type { ScriptOutput } from '../../script/schema';

export interface TimestampWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TimestampsResult {
  source: 'whisper' | 'estimation' | 'aeneas' | 'whisperx';
  words: TimestampWord[];
  confidence: number;
  metadata?: {
    model?: string;
    processingTimeMs?: number;
    reconciled?: boolean;
  };
}

export interface SyncStrategyOptions {
  requireWhisper?: boolean;
  reconcile?: boolean;
  asrModel?: 'tiny' | 'base' | 'small' | 'medium';
  driftCorrection?: 'none' | 'detect' | 'auto';
  minConfidence?: number;
}

export interface SyncStrategy {
  readonly name: string;

  generateTimestamps(
    audioPath: string,
    script: ScriptOutput,
    options?: SyncStrategyOptions
  ): Promise<TimestampsResult>;
}
```

### Factory Implementation

```typescript
// src/audio/sync/factory.ts

import { CMError } from '../../core/errors';
import type { SyncStrategy, SyncStrategyOptions } from './strategy';
import { StandardSyncStrategy } from './strategies/standard';
import { AudioFirstSyncStrategy } from './strategies/audio-first';
import { ForcedAlignSyncStrategy } from './strategies/forced-align';

const STRATEGY_MAP: Record<string, new (options?: SyncStrategyOptions) => SyncStrategy> = {
  standard: StandardSyncStrategy,
  'audio-first': AudioFirstSyncStrategy,
  'forced-align': ForcedAlignSyncStrategy,
  // 'hybrid': HybridSyncStrategy, // Future
};

export function createSyncStrategy(name: string, options?: SyncStrategyOptions): SyncStrategy {
  const normalizedName = name.toLowerCase();
  const StrategyClass = STRATEGY_MAP[normalizedName];

  if (!StrategyClass) {
    throw new CMError(
      'INVALID_ARGUMENT',
      `Unknown sync strategy: "${name}". Available: ${Object.keys(STRATEGY_MAP).join(', ')}`,
      { strategy: name, available: Object.keys(STRATEGY_MAP) }
    );
  }

  return new StrategyClass(options);
}

export function getAvailableStrategies(): string[] {
  return Object.keys(STRATEGY_MAP);
}

export function isStrategyAvailable(name: string): boolean {
  // Check if dependencies are available
  // For now, just check if strategy exists
  return name.toLowerCase() in STRATEGY_MAP;
}
```

### Directory Structure

```
src/audio/sync/
├── index.ts          # Public exports
├── strategy.ts       # Interface definition
├── factory.ts        # Factory function
├── presets.ts        # Preset configurations (future)
└── strategies/       # Strategy implementations
    ├── standard.ts
    ├── audio-first.ts
    └── forced-align.ts
```

---

## Verification Checklist

- [ ] 🔴 All tests written and failing before implementation
- [ ] 🟢 Implementation complete, all tests passing
- [ ] 🔵 Code refactored, tests still passing
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] All unit tests pass (`pnpm test src/audio/sync`)
- [ ] JSDoc comments on interface and factory
- [ ] Exports added to `src/audio/sync/index.ts`
- [ ] Code committed to main branch
- [ ] Task moved to `done/`

---

## Related

- **Depends On:** TASK-018 (SyncConfigSchema)
- **Blocks:** TASK-020, TASK-022
- **Implementation Plan:** [IMPL-SYNC-STRATEGIES-20260107](../../docs/dev/architecture/IMPL-SYNC-STRATEGIES-20260107.md)
- **Design Pattern:** Strategy Pattern (GoF)
