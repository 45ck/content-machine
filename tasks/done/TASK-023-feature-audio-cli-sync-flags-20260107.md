# TASK-023: Add Sync Strategy CLI Flags to cm audio

**Type:** Feature  
**Priority:** P1  
**Estimate:** S (2-4 hours)  
**Created:** 2026-01-07  
**Owner:** Unassigned  
**Phase:** Sync Strategies Phase 2

---

## Description

Add CLI flags to the `cm audio` command for configuring sync strategies:

- `--sync-strategy <strategy>` - Select sync strategy
- `--reconcile` - Enable ASR→script reconciliation
- `--require-whisper` - Require whisper.cpp (fail if unavailable)
- `--drift-correction <mode>` - Drift correction mode

These flags should override configuration file settings and integrate with the existing audio pipeline.

---

## Acceptance Criteria

- [ ] Given `--sync-strategy audio-first`, when running cm audio, then AudioFirstSyncStrategy is used
- [ ] Given `--reconcile`, when running cm audio, then reconciliation is enabled
- [ ] Given `--require-whisper` without whisper installed, when running cm audio, then fails with clear error
- [ ] Given no flags, when running cm audio, then uses defaults from config or standard strategy
- [ ] Given `cm audio --help`, when viewing output, then all sync flags are documented
- [ ] Given JSON output mode, when running with sync flags, then strategy info is included in output

---

## Required Documentation

- [ ] Update CLI help text with examples
- [ ] Update `docs/reference/SYNC-CONFIG-REFERENCE-20260107.md` if needed

---

## Testing Considerations

### What Needs Testing

- Flag parsing and validation
- Flag to strategy mapping
- Override precedence (CLI > env > config)
- Help text accuracy
- JSON output format

### Edge Cases

- Invalid strategy name
- Conflicting flags
- Missing dependencies for requested strategy

### Risks

- Breaking existing CLI behavior
- Help text out of sync with actual behavior

---

## Testing Plan

### Unit Tests - `src/cli/commands/audio.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audioCommand } from './audio';

describe('audio command sync flags', () => {
  describe('--sync-strategy', () => {
    it('accepts valid strategy names', () => {
      const cmd = audioCommand;

      // Parse without executing
      for (const strategy of ['standard', 'audio-first', 'forced-align']) {
        const parsed = cmd.parse(
          ['node', 'cm', 'audio', '-i', 'script.json', '--sync-strategy', strategy],
          { from: 'user' }
        );

        expect(parsed.opts().syncStrategy).toBe(strategy);
      }
    });

    it('shows error for invalid strategy', () => {
      // Commander should reject invalid values
      expect(() => {
        audioCommand.parse(
          ['node', 'cm', 'audio', '-i', 'script.json', '--sync-strategy', 'invalid'],
          { from: 'user' }
        );
      }).toThrow();
    });
  });

  describe('--reconcile', () => {
    it('sets reconcile flag to true', () => {
      const parsed = audioCommand.parse(
        ['node', 'cm', 'audio', '-i', 'script.json', '--reconcile'],
        { from: 'user' }
      );

      expect(parsed.opts().reconcile).toBe(true);
    });

    it('defaults to false when not specified', () => {
      const parsed = audioCommand.parse(['node', 'cm', 'audio', '-i', 'script.json'], {
        from: 'user',
      });

      expect(parsed.opts().reconcile).toBeFalsy();
    });
  });

  describe('--require-whisper', () => {
    it('sets requireWhisper flag to true', () => {
      const parsed = audioCommand.parse(
        ['node', 'cm', 'audio', '-i', 'script.json', '--require-whisper'],
        { from: 'user' }
      );

      expect(parsed.opts().requireWhisper).toBe(true);
    });
  });

  describe('--drift-correction', () => {
    it('accepts valid drift correction modes', () => {
      for (const mode of ['none', 'detect', 'auto']) {
        const parsed = audioCommand.parse(
          ['node', 'cm', 'audio', '-i', 'script.json', '--drift-correction', mode],
          { from: 'user' }
        );

        expect(parsed.opts().driftCorrection).toBe(mode);
      }
    });
  });

  describe('flag combinations', () => {
    it('accepts multiple sync flags together', () => {
      const parsed = audioCommand.parse(
        [
          'node',
          'cm',
          'audio',
          '-i',
          'script.json',
          '--sync-strategy',
          'audio-first',
          '--reconcile',
          '--drift-correction',
          'detect',
        ],
        { from: 'user' }
      );

      expect(parsed.opts().syncStrategy).toBe('audio-first');
      expect(parsed.opts().reconcile).toBe(true);
      expect(parsed.opts().driftCorrection).toBe('detect');
    });
  });
});

describe('audio command help', () => {
  it('includes sync strategy in help text', () => {
    const helpText = audioCommand.helpInformation();

    expect(helpText).toContain('--sync-strategy');
    expect(helpText).toContain('standard');
    expect(helpText).toContain('audio-first');
  });

  it('includes reconcile in help text', () => {
    const helpText = audioCommand.helpInformation();

    expect(helpText).toContain('--reconcile');
  });
});
```

### Integration Tests - `tests/integration/cli-audio-sync.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { execSync } from 'child_process';

describe('cm audio sync integration', () => {
  it('uses specified sync strategy', () => {
    // Create test fixtures
    const result = execSync(
      'node dist/cli/index.js audio ' +
        '-i test-fixtures/script.json ' +
        '--sync-strategy audio-first ' +
        '--json',
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(result);
    expect(output.data.strategy).toBe('audio-first');
  });
});
```

---

## Implementation Notes

### Updated Command Definition

```typescript
// src/cli/commands/audio.ts

export const audioCommand = new Command('audio')
  .description('Generate voiceover audio with word-level timestamps')
  .requiredOption('-i, --input <path>', 'Input script.json path')
  .option('-o, --output <path>', 'Output audio.wav path', 'audio.wav')
  .option('-t, --timestamps <path>', 'Output timestamps.json path', 'timestamps.json')
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
  .option('--mock', 'Use mock TTS (for testing)')
  // New sync strategy options
  .option(
    '--sync-strategy <strategy>',
    'Sync strategy: standard, audio-first, forced-align',
    'standard'
  )
  .option('--reconcile', 'Reconcile ASR transcription to original script text')
  .option('--require-whisper', 'Require whisper.cpp (fail if unavailable)')
  .option('--drift-correction <mode>', 'Drift correction: none, detect, auto', 'none')
  .action(async (options: AudioOptions) => {
    // ... existing code ...

    // Create sync strategy from options
    const strategy = createSyncStrategy(options.syncStrategy, {
      reconcile: options.reconcile,
      requireWhisper: options.requireWhisper,
      driftCorrection: options.driftCorrection,
    });

    // Pass strategy to pipeline
    const result = await generateAudio(script, {
      ...existingOptions,
      syncStrategy: strategy,
    });

    // ... rest of handler ...
  });
```

### Updated AudioOptions Interface

```typescript
interface AudioOptions {
  input: string;
  output: string;
  timestamps: string;
  voice: string;
  mock: boolean;
  // New sync options
  syncStrategy: 'standard' | 'audio-first' | 'forced-align';
  reconcile: boolean;
  requireWhisper: boolean;
  driftCorrection: 'none' | 'detect' | 'auto';
}
```

### JSON Output Format Update

Add strategy info to JSON envelope:

```typescript
buildJsonEnvelope({
  command: 'audio',
  args: {
    input: options.input,
    output: options.output,
    syncStrategy: options.syncStrategy,
    reconcile: options.reconcile,
  },
  outputs: {
    audioPath: result.audioPath,
    timestampsPath: options.timestamps,
    wordCount: result.timestamps.words.length,
    source: result.timestamps.source,
    reconciled: result.timestamps.metadata?.reconciled,
  },
  // ...
});
```

---

## Verification Checklist

- [ ] 🔴 All tests written and failing before implementation
- [ ] 🟢 Implementation complete, all tests passing
- [ ] 🔵 Code refactored, tests still passing
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] All unit tests pass (`pnpm test src/cli/commands/audio.test.ts`)
- [ ] `cm audio --help` shows new flags
- [ ] Existing tests still pass (no regression)
- [ ] JSON output includes sync info
- [ ] Code committed to main branch
- [ ] Task moved to `done/`

---

## Related

- **Depends On:** TASK-019, TASK-020, TASK-022
- **Blocks:** TASK-024 (Generate integration)
- **Implementation Plan:** [IMPL-SYNC-STRATEGIES-20260107](../../docs/dev/architecture/IMPL-SYNC-STRATEGIES-20260107.md)
- **Reference:** [SYNC-CONFIG-REFERENCE-20260107](../../docs/reference/SYNC-CONFIG-REFERENCE-20260107.md)
