/**
 * Alignment Sections Tests
 *
 * Tests for buildAlignmentSections which converts script to spoken sections.
 * Critical: Hook should NOT be duplicated if scene 1 already contains it.
 */
import { describe, it, expect } from 'vitest';
import { buildAlignmentSections } from '../../../src/audio/pipeline';
import type { ScriptOutput } from '../../../src/script/schema';

function createMockScript(overrides: Partial<ScriptOutput> = {}): ScriptOutput {
  return {
    schemaVersion: '1.0.0',
    scenes: [
      { id: 'scene-001', text: 'First scene text', visualDirection: 'test' },
      { id: 'scene-002', text: 'Second scene text', visualDirection: 'test' },
    ],
    title: 'Test Video',
    ...overrides,
  };
}

describe('buildAlignmentSections', () => {
  describe('hook deduplication', () => {
    it('does NOT add hook when hook exactly matches scene 1', () => {
      const script = createMockScript({
        hook: 'First scene text',
        scenes: [{ id: 'scene-001', text: 'First scene text', visualDirection: 'test' }],
      });

      const sections = buildAlignmentSections(script);

      // Should only have the scene, not a separate hook
      expect(sections.length).toBe(1);
      expect(sections[0].id).toBe('scene-001');
    });

    it('does NOT add hook when scene 1 starts with hook text', () => {
      // This is the common LLM pattern: hook is part of scene 1
      const script = createMockScript({
        hook: 'Want to level up your JavaScript game?',
        scenes: [
          {
            id: 'scene-001',
            text: 'Want to level up your JavaScript game? Here are 5 tips you need!',
            visualDirection: 'test',
          },
        ],
      });

      const sections = buildAlignmentSections(script);

      // Should only have the scene, not a separate hook
      expect(sections.length).toBe(1);
      expect(sections[0].id).toBe('scene-001');
      expect(sections[0].text).toContain('Here are 5 tips');
    });

    it('does NOT add hook when scene 1 contains hook text', () => {
      const script = createMockScript({
        hook: 'level up your JavaScript',
        scenes: [
          {
            id: 'scene-001',
            text: 'Want to level up your JavaScript game today?',
            visualDirection: 'test',
          },
        ],
      });

      const sections = buildAlignmentSections(script);

      // Should only have the scene, not a separate hook
      expect(sections.length).toBe(1);
      expect(sections[0].id).toBe('scene-001');
    });

    it('adds hook as separate section when NOT in scene 1', () => {
      const script = createMockScript({
        hook: 'This is a completely different hook',
        scenes: [
          { id: 'scene-001', text: 'First scene about something else', visualDirection: 'test' },
        ],
      });

      const sections = buildAlignmentSections(script);

      // Should have both hook and scene
      expect(sections.length).toBe(2);
      expect(sections[0].id).toBe('hook');
      expect(sections[0].text).toBe('This is a completely different hook');
      expect(sections[1].id).toBe('scene-001');
    });

    it('skips hook when hook is empty', () => {
      const script = createMockScript({
        hook: '',
        scenes: [{ id: 'scene-001', text: 'Scene text', visualDirection: 'test' }],
      });

      const sections = buildAlignmentSections(script);

      expect(sections.length).toBe(1);
      expect(sections[0].id).toBe('scene-001');
    });

    it('skips hook when hook is undefined', () => {
      const script = createMockScript({
        hook: undefined,
        scenes: [{ id: 'scene-001', text: 'Scene text', visualDirection: 'test' }],
      });

      const sections = buildAlignmentSections(script);

      expect(sections.length).toBe(1);
      expect(sections[0].id).toBe('scene-001');
    });
  });

  describe('cta deduplication', () => {
    it('does NOT add cta when cta matches last scene', () => {
      const script = createMockScript({
        scenes: [
          { id: 'scene-001', text: 'Content', visualDirection: 'test' },
          { id: 'scene-002', text: 'Follow for more tips!', visualDirection: 'test' },
        ],
        cta: 'Follow for more tips!',
      });

      const sections = buildAlignmentSections(script);

      // Should only have scenes, not a separate CTA
      expect(sections.length).toBe(2);
      expect(sections[0].id).toBe('scene-001');
      expect(sections[1].id).toBe('scene-002');
    });

    it('adds cta when NOT in last scene', () => {
      const script = createMockScript({
        scenes: [
          { id: 'scene-001', text: 'Content', visualDirection: 'test' },
          { id: 'scene-002', text: 'More content', visualDirection: 'test' },
        ],
        cta: 'Different call to action!',
      });

      const sections = buildAlignmentSections(script);

      expect(sections.length).toBe(3);
      expect(sections[2].id).toBe('cta');
      expect(sections[2].text).toBe('Different call to action!');
    });
  });

  describe('full script flow', () => {
    it('handles complete script with hook, scenes, and cta', () => {
      const script = createMockScript({
        hook: 'Unique hook text',
        scenes: [
          { id: 'scene-001', text: 'Scene 1 content', visualDirection: 'test' },
          { id: 'scene-002', text: 'Scene 2 content', visualDirection: 'test' },
        ],
        cta: 'Unique CTA text',
      });

      const sections = buildAlignmentSections(script);

      expect(sections.length).toBe(4);
      expect(sections[0].id).toBe('hook');
      expect(sections[1].id).toBe('scene-001');
      expect(sections[2].id).toBe('scene-002');
      expect(sections[3].id).toBe('cta');
    });

    it('normalizes whitespace when comparing texts', () => {
      const script = createMockScript({
        hook: 'Hook   with   extra    spaces',
        scenes: [{ id: 'scene-001', text: 'Hook with extra spaces', visualDirection: 'test' }],
      });

      const sections = buildAlignmentSections(script);

      // After normalization, texts should match, so no separate hook
      expect(sections.length).toBe(1);
      expect(sections[0].id).toBe('scene-001');
    });
  });
});
