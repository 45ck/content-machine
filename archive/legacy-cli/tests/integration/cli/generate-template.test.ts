import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

function parseJson(stdout: string): any {
  const trimmed = stdout.trim();
  expect(trimmed.startsWith('{')).toBe(true);
  expect(trimmed.endsWith('}')).toBe(true);
  return JSON.parse(trimmed);
}

describe('cm generate --template', () => {
  it('applies template defaults when flags are not explicitly set', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'generate-template-defaults');
    mkdirSync(outDir, { recursive: true });
    const timeoutMs = 180000;

    const videoPath = join(outDir, 'video.mp4');
    const templatePath = join(outDir, 'template.json');

    writeFileSync(
      templatePath,
      JSON.stringify(
        {
          schemaVersion: '1.0.0',
          id: 'test-template',
          name: 'Test Template',
          compositionId: 'ShortVideo',
          defaults: { archetype: 'versus', orientation: 'square', fps: 60, captionPreset: 'neon' },
        },
        null,
        2
      ),
      'utf-8'
    );

    const result = await runCli(
      ['generate', 'Redis', '--mock', '--template', templatePath, '--output', videoPath, '--json'],
      undefined,
      timeoutMs
    );

    expect(result.code).toBe(0);
    const parsed = parseJson(result.stdout);
    expect(parsed.command).toBe('generate');
    expect(parsed.args.template).toBe(templatePath);
    expect(parsed.args.resolvedTemplateId).toBe('test-template');
    expect(parsed.args.archetype).toBe('versus');
    expect(parsed.args.orientation).toBe('square');
    expect(parsed.args.fps).toBe('60');
    expect(parsed.args.captionPreset).toBe('neon');
    expect(parsed.outputs.width).toBe(1080);
    expect(parsed.outputs.height).toBe(1080);
    expect(parsed.outputs.fps).toBe(60);
    expect(parsed.outputs.videoPath).toBe(videoPath);
  }, 240_000);

  it('does not override explicitly-provided flags', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'generate-template-overrides');
    mkdirSync(outDir, { recursive: true });
    const timeoutMs = 180000;

    const videoPath = join(outDir, 'video.mp4');
    const templatePath = join(outDir, 'template.json');

    writeFileSync(
      templatePath,
      JSON.stringify(
        {
          schemaVersion: '1.0.0',
          id: 'test-template',
          name: 'Test Template',
          compositionId: 'ShortVideo',
          defaults: { archetype: 'versus', orientation: 'square', fps: 60, captionPreset: 'neon' },
        },
        null,
        2
      ),
      'utf-8'
    );

    const result = await runCli(
      [
        'generate',
        'Redis',
        '--mock',
        '--template',
        templatePath,
        '--output',
        videoPath,
        '--archetype',
        'listicle',
        '--orientation',
        'portrait',
        '--fps',
        '30',
        '--caption-preset',
        'tiktok',
        '--json',
      ],
      undefined,
      timeoutMs
    );

    expect(result.code).toBe(0);
    const parsed = parseJson(result.stdout);
    expect(parsed.args.archetype).toBe('listicle');
    expect(parsed.args.orientation).toBe('portrait');
    expect(parsed.args.fps).toBe('30');
    expect(parsed.args.captionPreset).toBe('tiktok');
    expect(parsed.outputs.width).toBe(1080);
    expect(parsed.outputs.height).toBe(1920);
    expect(parsed.outputs.fps).toBe(30);
    expect(parsed.outputs.videoPath).toBe(videoPath);
  }, 240_000);
});
