import { describe, it, expect } from 'vitest';
import { MOTION_STRATEGIES } from '../../../../src/visuals/motion/types';

describe('motion strategy types', () => {
  it('defines all strategy metadata', () => {
    expect(Object.keys(MOTION_STRATEGIES)).toEqual(['none', 'kenburns', 'depthflow', 'veo']);
    expect(MOTION_STRATEGIES.none.costPerClip).toBe(0);
    expect(MOTION_STRATEGIES.kenburns.dependencies).toContain('ffmpeg');
    expect(MOTION_STRATEGIES.depthflow.dependencies).toContain('depthflow');
    expect(MOTION_STRATEGIES.veo.dependencies).toContain('GOOGLE_API_KEY');
  });
});
