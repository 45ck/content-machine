# TASK-018: Add SyncConfigSchema to Configuration System

**Type:** Feature  
**Priority:** P1  
**Estimate:** S (2-4 hours)  
**Created:** 2026-01-07  
**Owner:** Unassigned  
**Phase:** Sync Strategies Phase 1

---

## Description

Add the `SyncConfigSchema` Zod schema to the configuration system to support configurable sync strategies. This is the foundation for all sync strategy features.

The schema should support:

- Strategy selection (standard, audio-first, forced-align, hybrid)
- ASR configuration (require whisper, model selection)
- Reconciliation settings
- Drift correction modes
- Quality gate settings for the generate command

---

## Acceptance Criteria

- [ ] Given config file with `[sync]` section, when loading config, then sync options are parsed correctly
- [ ] Given missing `[sync]` section, when loading config, then sensible defaults are applied
- [ ] Given invalid sync strategy, when validating config, then clear error message is returned
- [ ] Given environment variable `CM_SYNC_STRATEGY`, when loading config, then it overrides config file
- [ ] Given CLI flag `--sync-strategy`, when running command, then it overrides config and env var

---

## Required Documentation

- [ ] Update `docs/reference/SYNC-CONFIG-REFERENCE-20260107.md` if schema changes
- [ ] Add JSDoc comments to schema definition
- [ ] Update `.content-machine.example.toml` with sync section

---

## Testing Considerations

### What Needs Testing

- Schema validation with all valid values
- Schema validation with invalid values
- Default value application
- Environment variable override
- Config merging order (defaults → file → env → CLI)

### Edge Cases

- Empty `[sync]` section (should use all defaults)
- Partial `[sync]` section (should merge with defaults)
- Invalid enum values
- Out-of-range numeric values

### Risks

- Breaking existing config loading if not careful with optional fields

---

## Testing Plan

### Unit Tests - `src/core/config.test.ts`

```typescript
describe('SyncConfigSchema', () => {
  describe('defaults', () => {
    it('applies default strategy when not specified', () => {
      const result = SyncConfigSchema.parse({});
      expect(result.strategy).toBe('standard');
    });

    it('applies default requireWhisper as false', () => {
      const result = SyncConfigSchema.parse({});
      expect(result.requireWhisper).toBe(false);
    });

    it('applies default driftCorrection as none', () => {
      const result = SyncConfigSchema.parse({});
      expect(result.driftCorrection).toBe('none');
    });

    it('applies all defaults for empty object', () => {
      const result = SyncConfigSchema.parse({});
      expect(result).toEqual({
        strategy: 'standard',
        requireWhisper: false,
        asrModel: 'base',
        reconcileToScript: false,
        minSimilarity: 0.7,
        driftCorrection: 'none',
        maxDriftMs: 80,
        validateTimestamps: true,
        autoRepair: true,
        qualityCheck: false,
        minRating: 75,
        autoRetry: false,
        maxRetries: 2,
      });
    });
  });

  describe('validation', () => {
    it('accepts valid strategy values', () => {
      for (const strategy of ['standard', 'audio-first', 'forced-align', 'hybrid']) {
        const result = SyncConfigSchema.safeParse({ strategy });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid strategy value', () => {
      const result = SyncConfigSchema.safeParse({ strategy: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('accepts valid drift correction modes', () => {
      for (const mode of ['none', 'detect', 'auto']) {
        const result = SyncConfigSchema.safeParse({ driftCorrection: mode });
        expect(result.success).toBe(true);
      }
    });

    it('rejects minSimilarity outside 0-1 range', () => {
      expect(SyncConfigSchema.safeParse({ minSimilarity: -0.1 }).success).toBe(false);
      expect(SyncConfigSchema.safeParse({ minSimilarity: 1.5 }).success).toBe(false);
    });

    it('rejects minRating outside 0-100 range', () => {
      expect(SyncConfigSchema.safeParse({ minRating: -1 }).success).toBe(false);
      expect(SyncConfigSchema.safeParse({ minRating: 101 }).success).toBe(false);
    });
  });

  describe('partial config', () => {
    it('merges partial config with defaults', () => {
      const result = SyncConfigSchema.parse({
        strategy: 'audio-first',
        reconcileToScript: true,
      });

      expect(result.strategy).toBe('audio-first');
      expect(result.reconcileToScript).toBe(true);
      expect(result.driftCorrection).toBe('none'); // default
    });
  });
});

describe('loadConfig with sync section', () => {
  it('loads sync config from TOML file', async () => {
    const toml = `
[sync]
strategy = "audio-first"
reconcile_to_script = true
`;
    // Mock file system
    const config = await loadConfig({ configContent: toml });
    expect(config.sync.strategy).toBe('audio-first');
    expect(config.sync.reconcileToScript).toBe(true);
  });

  it('overrides with environment variable', async () => {
    process.env.CM_SYNC_STRATEGY = 'forced-align';
    const config = await loadConfig();
    expect(config.sync.strategy).toBe('forced-align');
    delete process.env.CM_SYNC_STRATEGY;
  });
});
```

---

## Implementation Notes

### Schema Definition

Add to `src/core/config.ts`:

```typescript
export const SyncConfigSchema = z.object({
  strategy: z.enum(['standard', 'audio-first', 'forced-align', 'hybrid']).default('standard'),
  requireWhisper: z.boolean().default(false),
  asrModel: z.enum(['tiny', 'base', 'small', 'medium']).default('base'),
  reconcileToScript: z.boolean().default(false),
  minSimilarity: z.number().min(0).max(1).default(0.7),
  driftCorrection: z.enum(['none', 'detect', 'auto']).default('none'),
  maxDriftMs: z.number().default(80),
  validateTimestamps: z.boolean().default(true),
  autoRepair: z.boolean().default(true),
  qualityCheck: z.boolean().default(false),
  minRating: z.number().min(0).max(100).default(75),
  autoRetry: z.boolean().default(false),
  maxRetries: z.number().default(2),
});

export type SyncConfig = z.infer<typeof SyncConfigSchema>;
```

### Integration with Full Config

Add to `FullConfigSchema`:

```typescript
export const FullConfigSchema = z.object({
  // ... existing fields
  sync: SyncConfigSchema.default({}),
});
```

### TOML Key Mapping

TOML uses snake_case, TypeScript uses camelCase. Handle in config loader:

```typescript
function transformTOMLKeys(obj: Record<string, unknown>): Record<string, unknown> {
  // reconcile_to_script → reconcileToScript
  // ... etc
}
```

---

## Verification Checklist

- [ ] 🔴 All tests written and failing before implementation
- [ ] 🟢 Implementation complete, all tests passing
- [ ] 🔵 Code refactored, tests still passing
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] All unit tests pass (`pnpm test src/core/config.test.ts`)
- [ ] JSDoc comments added to schema
- [ ] Example config file updated
- [ ] Code committed to main branch
- [ ] Task moved to `done/`

---

## Related

- **Depends On:** None (foundation task)
- **Blocks:** TASK-019, TASK-020, TASK-021, TASK-022, TASK-023
- **Implementation Plan:** [IMPL-SYNC-STRATEGIES-20260107](../../docs/dev/architecture/IMPL-SYNC-STRATEGIES-20260107.md)
- **Research:** [RQ-30: Sync Pipeline Architecture](../../docs/research/investigations/RQ-30-SYNC-PIPELINE-ARCHITECTURE-20260107.md)
