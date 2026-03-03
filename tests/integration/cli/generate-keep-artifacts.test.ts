import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('cm generate --keep-artifacts', () => {
  it('writes script/audio/timestamps/visuals artifacts next to output', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'generate-keep-artifacts');
    mkdirSync(outDir, { recursive: true });
    const outVideo = join(outDir, 'video.mp4');

    const result = await runCli(
      ['generate', 'Redis', '--mock', '--keep-artifacts', '-o', outVideo],
      undefined,
      180000
    );

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(outVideo);

    expect(existsSync(join(outDir, 'audio.wav'))).toBe(true);
    expect(existsSync(join(outDir, 'timestamps.json'))).toBe(true);
    expect(existsSync(join(outDir, 'script.json'))).toBe(true);
    expect(existsSync(join(outDir, 'visuals.json'))).toBe(true);
  }, 240_000);

  it('writes template.resolved.json when a template is used', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'generate-keep-artifacts-template');
    mkdirSync(outDir, { recursive: true });
    const outVideo = join(outDir, 'video.mp4');

    const result = await runCli(
      [
        'generate',
        'Redis',
        '--mock',
        '--keep-artifacts',
        '--template',
        'tiktok-captions',
        '-o',
        outVideo,
      ],
      undefined,
      180000
    );

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(outVideo);

    const resolvedPath = join(outDir, 'template.resolved.json');
    expect(existsSync(resolvedPath)).toBe(true);

    const resolved = JSON.parse(readFileSync(resolvedPath, 'utf-8')) as any;
    expect(resolved.schemaVersion).toBe('1.0.0');
    expect(resolved.resolved?.id).toBe('tiktok-captions');
    expect(resolved.resolved?.compositionId).toBe('ShortVideo');
  }, 240_000);
});
