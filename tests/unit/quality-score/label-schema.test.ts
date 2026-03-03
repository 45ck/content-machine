import { describe, it, expect } from 'vitest';
import { QualityLabelSchema } from '../../../src/quality-score/label-schema';

describe('QualityLabelSchema', () => {
  const validLabel = {
    videoId: 'test-video-001',
    source: 'youtube' as const,
    durationS: 45.5,
    overallQuality: 4,
    subscores: {
      hookEffectiveness: 5,
      clarityValue: 4,
      captionReadability: 3,
      audioCleanliness: 4,
      pacingNatural: 4,
      productionCoherence: 3,
      captionSync: 4,
      visualComposition: 3,
      sceneContinuity: 4,
      policyRisk: 1,
    },
    tags: {
      niche: 'tech',
      format: 'tutorial',
      language: 'en',
    },
  };

  it('should accept a valid quality label', () => {
    const result = QualityLabelSchema.parse(validLabel);
    expect(result.videoId).toBe('test-video-001');
    expect(result.overallQuality).toBe(4);
  });

  it('should reject overall quality outside 1-5 range', () => {
    expect(() => QualityLabelSchema.parse({ ...validLabel, overallQuality: 0 })).toThrow();
    expect(() => QualityLabelSchema.parse({ ...validLabel, overallQuality: 6 })).toThrow();
  });

  it('should reject non-integer ordinal scores', () => {
    expect(() =>
      QualityLabelSchema.parse({
        ...validLabel,
        subscores: { ...validLabel.subscores, hookEffectiveness: 3.5 },
      })
    ).toThrow();
  });

  it('should accept optional notes and labeledBy fields', () => {
    const result = QualityLabelSchema.parse({
      ...validLabel,
      notes: 'Great hook but poor CTA',
      labeledBy: 'reviewer-a',
    });
    expect(result.notes).toBe('Great hook but poor CTA');
    expect(result.labeledBy).toBe('reviewer-a');
  });

  it('should default language to en', () => {
    const noLang = { ...validLabel, tags: { niche: 'cooking', format: 'listicle' } };
    const result = QualityLabelSchema.parse(noLang);
    expect(result.tags.language).toBe('en');
  });

  it('should require source to be youtube or internal', () => {
    expect(() => QualityLabelSchema.parse({ ...validLabel, source: 'tiktok' })).toThrow();
  });

  it('should accept new subscores (captionSync, visualComposition, sceneContinuity, policyRisk)', () => {
    const result = QualityLabelSchema.parse(validLabel);
    expect(result.subscores.captionSync).toBe(4);
    expect(result.subscores.visualComposition).toBe(3);
    expect(result.subscores.sceneContinuity).toBe(4);
    expect(result.subscores.policyRisk).toBe(1);
  });

  it('should reject new subscores outside 1-5 range', () => {
    expect(() =>
      QualityLabelSchema.parse({
        ...validLabel,
        subscores: { ...validLabel.subscores, policyRisk: 0 },
      })
    ).toThrow();
  });

  it('should default defects to empty array', () => {
    const result = QualityLabelSchema.parse(validLabel);
    expect(result.defects).toEqual([]);
  });

  it('should accept defects array', () => {
    const result = QualityLabelSchema.parse({
      ...validLabel,
      defects: ['caption_density_overflow', 'audio_overlap_detected'],
    });
    expect(result.defects).toEqual(['caption_density_overflow', 'audio_overlap_detected']);
  });

  it('should accept publishDecision', () => {
    const result = QualityLabelSchema.parse({ ...validLabel, publishDecision: 'good' });
    expect(result.publishDecision).toBe('good');
  });

  it('should reject invalid publishDecision', () => {
    expect(() => QualityLabelSchema.parse({ ...validLabel, publishDecision: 'maybe' })).toThrow();
  });
});
