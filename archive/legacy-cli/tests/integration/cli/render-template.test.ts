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

describe('cm render --template', () => {
  it('applies template defaults when flags are not explicitly set', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'render-template-defaults');
    mkdirSync(outDir, { recursive: true });
    const timeoutMs = 120000;

    const scriptPath = join(outDir, 'script.json');
    const audioPath = join(outDir, 'audio.wav');
    const timestampsPath = join(outDir, 'timestamps.json');
    const visualsPath = join(outDir, 'visuals.json');
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
          defaults: { orientation: 'square', fps: 60, captionPreset: 'neon' },
        },
        null,
        2
      ),
      'utf-8'
    );

    const scriptResult = await runCli(
      ['script', '--topic', 'Redis', '--mock', '-o', scriptPath],
      undefined,
      timeoutMs
    );
    expect(scriptResult.code).toBe(0);

    const audioResult = await runCli(
      [
        'audio',
        '--input',
        scriptPath,
        '--mock',
        '--output',
        audioPath,
        '--timestamps',
        timestampsPath,
      ],
      undefined,
      timeoutMs
    );
    expect(audioResult.code).toBe(0);

    const visualsResult = await runCli(
      ['visuals', '--input', timestampsPath, '--mock', '--output', visualsPath],
      undefined,
      timeoutMs
    );
    expect(visualsResult.code).toBe(0);

    const renderResult = await runCli(
      [
        'render',
        '--input',
        visualsPath,
        '--timestamps',
        timestampsPath,
        '--audio',
        audioPath,
        '--mock',
        '--template',
        templatePath,
        '--output',
        videoPath,
        '--json',
      ],
      undefined,
      timeoutMs
    );

    expect(renderResult.code).toBe(0);
    const parsed = parseJson(renderResult.stdout);
    expect(parsed.command).toBe('render');
    expect(parsed.args.template).toBe(templatePath);
    expect(parsed.args.resolvedTemplateId).toBe('test-template');
    expect(parsed.args.captionPreset).toBe('neon');
    expect(parsed.outputs.width).toBe(1080);
    expect(parsed.outputs.height).toBe(1080);
    expect(parsed.outputs.fps).toBe(60);
  }, 120_000);

  it('does not override explicitly-provided flags', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'render-template-overrides');
    mkdirSync(outDir, { recursive: true });
    const timeoutMs = 120000;

    const scriptPath = join(outDir, 'script.json');
    const audioPath = join(outDir, 'audio.wav');
    const timestampsPath = join(outDir, 'timestamps.json');
    const visualsPath = join(outDir, 'visuals.json');
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
          defaults: { orientation: 'square', fps: 60, captionPreset: 'neon' },
        },
        null,
        2
      ),
      'utf-8'
    );

    const scriptResult = await runCli(
      ['script', '--topic', 'Redis', '--mock', '-o', scriptPath],
      undefined,
      timeoutMs
    );
    expect(scriptResult.code).toBe(0);

    const audioResult = await runCli(
      [
        'audio',
        '--input',
        scriptPath,
        '--mock',
        '--output',
        audioPath,
        '--timestamps',
        timestampsPath,
      ],
      undefined,
      timeoutMs
    );
    expect(audioResult.code).toBe(0);

    const visualsResult = await runCli(
      ['visuals', '--input', timestampsPath, '--mock', '--output', visualsPath],
      undefined,
      timeoutMs
    );
    expect(visualsResult.code).toBe(0);

    const renderResult = await runCli(
      [
        'render',
        '--input',
        visualsPath,
        '--timestamps',
        timestampsPath,
        '--audio',
        audioPath,
        '--mock',
        '--template',
        templatePath,
        '--output',
        videoPath,
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

    expect(renderResult.code).toBe(0);
    const parsed = parseJson(renderResult.stdout);
    expect(parsed.args.orientation).toBe('portrait');
    expect(parsed.outputs.width).toBe(1080);
    expect(parsed.outputs.height).toBe(1920);
    expect(parsed.outputs.fps).toBe(30);
    expect(parsed.args.captionPreset).toBe('tiktok');
  }, 120_000);
});
