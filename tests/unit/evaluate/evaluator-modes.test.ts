import { describe, it, expect } from 'vitest';
import { resolveChecks } from '../../../src/evaluate/evaluator';

describe('resolveChecks', () => {
  describe('fast mode', () => {
    it('enables only validate, score, audioSignal, and freeze', () => {
      const resolved = resolveChecks('fast', {});

      expect(resolved.validate).toBe(true);
      expect(resolved.score).toBe(true);
      expect(resolved.audioSignal).toBe(true);
      expect(resolved.freeze).toBe(true);
      expect(resolved.rate).toBe(false);
      expect(resolved.captionQuality).toBe(false);
      expect(resolved.temporalQuality).toBe(false);
      expect(resolved.semanticFidelity).toBe(false);
      expect(resolved.safety).toBe(false);
      expect(resolved.dnsmos).toBe(false);
      expect(resolved.flowConsistency).toBe(false);
    });
  });

  describe('balanced mode', () => {
    it('adds temporal and rate checks to fast mode', () => {
      const resolved = resolveChecks('balanced', {});

      expect(resolved.validate).toBe(true);
      expect(resolved.score).toBe(true);
      expect(resolved.audioSignal).toBe(true);
      expect(resolved.freeze).toBe(true);
      expect(resolved.temporalQuality).toBe(true);
      expect(resolved.rate).toBe(true);
      expect(resolved.captionQuality).toBe(true);
      expect(resolved.semanticFidelity).toBe(false);
      expect(resolved.safety).toBe(false);
      expect(resolved.dnsmos).toBe(false);
      expect(resolved.flowConsistency).toBe(false);
    });
  });

  describe('quality mode', () => {
    it('enables all checks', () => {
      const resolved = resolveChecks('quality', {});

      expect(resolved.validate).toBe(true);
      expect(resolved.score).toBe(true);
      expect(resolved.audioSignal).toBe(true);
      expect(resolved.freeze).toBe(true);
      expect(resolved.temporalQuality).toBe(true);
      expect(resolved.rate).toBe(true);
      expect(resolved.captionQuality).toBe(true);
      expect(resolved.semanticFidelity).toBe(true);
      expect(resolved.safety).toBe(true);
      expect(resolved.dnsmos).toBe(true);
      expect(resolved.flowConsistency).toBe(true);
    });
  });

  describe('explicit overrides', () => {
    it('allows enabling semanticFidelity in fast mode', () => {
      const resolved = resolveChecks('fast', { semanticFidelity: true });

      expect(resolved.validate).toBe(true);
      expect(resolved.score).toBe(true);
      expect(resolved.audioSignal).toBe(true);
      expect(resolved.freeze).toBe(true);
      expect(resolved.semanticFidelity).toBe(true);
      expect(resolved.rate).toBe(false);
      expect(resolved.temporalQuality).toBe(false);
    });

    it('allows disabling checks in quality mode', () => {
      const resolved = resolveChecks('quality', {
        semanticFidelity: false,
        safety: false,
      });

      expect(resolved.validate).toBe(true);
      expect(resolved.rate).toBe(true);
      expect(resolved.semanticFidelity).toBe(false);
      expect(resolved.safety).toBe(false);
      expect(resolved.dnsmos).toBe(true);
    });

    it('allows disabling rate in balanced mode', () => {
      const resolved = resolveChecks('balanced', { rate: false });

      expect(resolved.validate).toBe(true);
      expect(resolved.temporalQuality).toBe(true);
      expect(resolved.rate).toBe(false);
    });

    it('allows enabling multiple checks in fast mode', () => {
      const resolved = resolveChecks('fast', {
        semanticFidelity: true,
        safety: true,
        temporalQuality: true,
      });

      expect(resolved.validate).toBe(true);
      expect(resolved.score).toBe(true);
      expect(resolved.temporalQuality).toBe(true);
      expect(resolved.semanticFidelity).toBe(true);
      expect(resolved.safety).toBe(true);
      expect(resolved.rate).toBe(false);
    });
  });

  describe('no mode specified', () => {
    it('applies only explicit checks when no mode is given', () => {
      const resolved = resolveChecks(undefined, {
        validate: true,
        semanticFidelity: true,
      });

      expect(resolved.validate).toBe(true);
      expect(resolved.semanticFidelity).toBe(true);
      expect(resolved.rate).toBeUndefined();
      expect(resolved.score).toBeUndefined();
    });

    it('returns empty object when no mode and no explicit checks', () => {
      const resolved = resolveChecks(undefined, {});

      expect(Object.keys(resolved)).toHaveLength(0);
    });
  });

  describe('explicit undefined values', () => {
    it('ignores undefined values in explicit checks', () => {
      const resolved = resolveChecks('fast', {
        semanticFidelity: undefined,
        rate: undefined,
      });

      expect(resolved.semanticFidelity).toBe(false);
      expect(resolved.rate).toBe(false);
    });
  });
});
