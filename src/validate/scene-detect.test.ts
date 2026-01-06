import { describe, expect, it } from 'vitest';
import { parseSceneDetectJson } from './scene-detect';

describe('parseSceneDetectJson', () => {
  it('parses a pyscenedetect payload', () => {
    const parsed = parseSceneDetectJson({
      detector: 'pyscenedetect',
      cutTimesSeconds: [0.5, 1.25, '2.5', -1, 'nan'],
    });
    expect(parsed.detector).toBe('pyscenedetect');
    expect(parsed.cutTimesSeconds).toEqual([0.5, 1.25, 2.5]);
  });
});

