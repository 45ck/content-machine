/**
 * Render Schema Tests
 * Updated for SYSTEM-DESIGN §7.4 render command
 */
import { describe, it, expect } from 'vitest';
import {
  CaptionStyleSchema,
  RenderPropsSchema,
  RenderOutputSchema,
  RENDER_SCHEMA_VERSION,
  type CaptionStyle,
  type RenderProps,
  type RenderOutput,
} from './schema';

describe('CaptionStyleSchema', () => {
  it('should validate correct caption style', () => {
    const style: CaptionStyle = {
      fontFamily: 'Bangers',
      fontSize: 130,
      fontWeight: '900',
      color: '#FFFFFF',
      highlightColor: '#FF0000',
      highlightCurrentWord: true,
      strokeColor: '#000000',
      strokeWidth: 4,
      position: 'center',
      animation: 'bounce',
    };
    
    const result = CaptionStyleSchema.safeParse(style);
    expect(result.success).toBe(true);
  });

  it('should apply defaults', () => {
    const style = {};
    
    const result = CaptionStyleSchema.safeParse(style);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fontFamily).toBe('Inter');
      expect(result.data.fontSize).toBe(48);
      expect(result.data.fontWeight).toBe('bold');
      expect(result.data.color).toBe('#FFFFFF');
      expect(result.data.highlightColor).toBe('#FFE135');
      expect(result.data.highlightCurrentWord).toBe(true);
      expect(result.data.strokeWidth).toBe(3);
      expect(result.data.position).toBe('center');
      expect(result.data.animation).toBe('pop');
    }
  });

  it('should validate all animation types', () => {
    const animations = ['none', 'pop', 'bounce', 'karaoke', 'typewriter'];
    
    for (const animation of animations) {
      const style = { animation };
      const result = CaptionStyleSchema.safeParse(style);
      expect(result.success).toBe(true);
    }
  });

  it('should validate all position types', () => {
    const positions = ['bottom', 'center', 'top'];
    
    for (const position of positions) {
      const style = { position };
      const result = CaptionStyleSchema.safeParse(style);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid animation', () => {
    const style = { animation: 'slide' };
    
    const result = CaptionStyleSchema.safeParse(style);
    expect(result.success).toBe(false);
  });
});

describe('RenderPropsSchema', () => {
  it('should validate correct render props with scenes', () => {
    const props: RenderProps = {
      schemaVersion: RENDER_SCHEMA_VERSION,
      scenes: [
        {
          sceneId: 'scene-001',
          source: 'stock-pexels',
          assetPath: 'assets/scene-001.mp4',
          duration: 5.0,
        },
      ],
      words: [
        { word: 'Hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.6, end: 1.0 },
      ],
      audioPath: '/path/to/audio.wav',
      duration: 5.0,
      width: 1080,
      height: 1920,
      fps: 30,
    };
    
    const result = RenderPropsSchema.safeParse(props);
    expect(result.success).toBe(true);
  });

  it('should validate render props with clips (legacy)', () => {
    const props: RenderProps = {
      schemaVersion: RENDER_SCHEMA_VERSION,
      clips: [
        {
          id: 'clip-001',
          url: 'https://example.com/video.mp4',
          duration: 5.0,
          width: 1080,
          height: 1920,
          startTime: 0,
          endTime: 5.0,
          source: 'pexels',
          sourceId: '12345',
          searchQuery: 'developer',
        },
      ],
      words: [
        { word: 'Hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.6, end: 1.0 },
      ],
      audioPath: '/path/to/audio.wav',
      duration: 5.0,
      width: 1080,
      height: 1920,
      fps: 30,
    };
    
    const result = RenderPropsSchema.safeParse(props);
    expect(result.success).toBe(true);
  });

  it('should allow optional captionStyle and archetype', () => {
    const props: RenderProps = {
      schemaVersion: RENDER_SCHEMA_VERSION,
      scenes: [],
      words: [],
      audioPath: '/path/to/audio.wav',
      duration: 30.0,
      width: 1080,
      height: 1920,
      fps: 30,
      archetype: 'educational',
      captionStyle: {
        fontFamily: 'Inter',
        fontSize: 60,
        fontWeight: 'bold',
        color: '#FFFFFF',
        highlightColor: '#FFE135',
        highlightCurrentWord: false,
        strokeColor: '#000000',
        strokeWidth: 2,
        position: 'bottom',
        animation: 'none',
      },
    };
    
    const result = RenderPropsSchema.safeParse(props);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.archetype).toBe('educational');
      expect(result.data.captionStyle?.position).toBe('bottom');
    }
  });

  it('should reject zero duration', () => {
    const props = {
      schemaVersion: RENDER_SCHEMA_VERSION,
      scenes: [],
      words: [],
      audioPath: '/path/to/audio.wav',
      duration: 0,
      width: 1080,
      height: 1920,
      fps: 30,
    };
    
    const result = RenderPropsSchema.safeParse(props);
    expect(result.success).toBe(false);
  });
});

describe('RenderOutputSchema', () => {
  it('should validate correct render output', () => {
    const output: RenderOutput = {
      schemaVersion: RENDER_SCHEMA_VERSION,
      outputPath: '/path/to/output.mp4',
      duration: 30.5,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 15000000,
      codec: 'h264',
    };
    
    const result = RenderOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it('should allow optional archetype', () => {
    const output: RenderOutput = {
      schemaVersion: RENDER_SCHEMA_VERSION,
      outputPath: '/path/to/output.mp4',
      duration: 30.5,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 15000000,
      codec: 'h264',
      archetype: 'listicle',
    };
    
    const result = RenderOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.archetype).toBe('listicle');
    }
  });

  it('should reject zero file size', () => {
    const output = {
      schemaVersion: RENDER_SCHEMA_VERSION,
      outputPath: '/path/to/output.mp4',
      duration: 30.5,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: -1,
      codec: 'h264',
    };
    
    const result = RenderOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });
});
