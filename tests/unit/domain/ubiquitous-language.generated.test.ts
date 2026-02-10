import { describe, expect, test } from 'vitest';

import {
  UBIQUITOUS_LANGUAGE_TERMS,
  UBIQUITOUS_TERM_IDS,
  type UbiquitousTermId,
} from '../../../src/domain/ubiquitous-language.generated';

describe('ubiquitous language generated registry', () => {
  test('exports stable, non-empty term ids', () => {
    expect(UBIQUITOUS_TERM_IDS.length).toBeGreaterThan(0);
    expect(new Set(UBIQUITOUS_TERM_IDS).size).toBe(UBIQUITOUS_TERM_IDS.length);
  });

  test('contains a few core terms', () => {
    const mustHave: UbiquitousTermId[] = [
      'script-archetype',
      'render-template',
      'pipeline-workflow',
    ];
    for (const id of mustHave) {
      expect(UBIQUITOUS_LANGUAGE_TERMS[id].id).toBe(id);
      expect(UBIQUITOUS_LANGUAGE_TERMS[id].canonicalName.length).toBeGreaterThan(0);
      expect(UBIQUITOUS_LANGUAGE_TERMS[id].definition.length).toBeGreaterThan(0);
    }
  });
});
