import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

function assertPureJson(stdout: string): any {
  const trimmed = stdout.trim();
  expect(trimmed.startsWith('{')).toBe(true);
  expect(trimmed.endsWith('}')).toBe(true);
  return JSON.parse(trimmed);
}

describe('on-demand assets', () => {
  it('cm generate --preflight fails on missing explicit hook clip', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'on-demand-assets', 'generate-hook');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const hooksDir = join(outDir, 'hooks');
    const outVideo = join(outDir, 'video.mp4');

    const result = await runCli(
      [
        'generate',
        'Redis',
        '--mock',
        '--preflight',
        '--json',
        '--hook',
        'no-crunch',
        '--hook-library',
        'transitionalhooks',
        '--hooks-dir',
        hooksDir,
        '-o',
        outVideo,
      ],
      undefined,
      60000
    );

    expect(result.code).toBe(2);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('generate');
    expect(parsed.outputs.preflightPassed).toBe(false);
    expect(parsed.errors.some((e: any) => e.code === 'FILE_NOT_FOUND')).toBe(true);
  }, 90_000);

  it('cm render --preflight emits JSON and does not create output video', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'on-demand-assets', 'render-preflight');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
    const timeoutMs = 120000;

    const scriptPath = join(outDir, 'script.json');
    const audioPath = join(outDir, 'audio.wav');
    const timestampsPath = join(outDir, 'timestamps.json');
    const visualsPath = join(outDir, 'visuals.json');
    const outVideo = join(outDir, 'video.mp4');

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
        '--preflight',
        '--json',
        '--mock',
        '-i',
        visualsPath,
        '--audio',
        audioPath,
        '--timestamps',
        timestampsPath,
        '-o',
        outVideo,
      ],
      undefined,
      timeoutMs
    );

    expect(renderResult.code).toBe(0);
    const parsed = assertPureJson(renderResult.stdout);
    expect(parsed.command).toBe('render');
    expect(parsed.outputs.preflightPassed).toBe(true);
    expect(existsSync(outVideo)).toBe(false);
  }, 120_000);

  it('cm hooks download fails in offline mode (JSON)', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'on-demand-assets', 'hooks-offline');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const hooksDir = join(outDir, 'hooks');

    const result = await runCli(
      ['hooks', 'download', 'no-crunch', '--hooks-dir', hooksDir, '--offline', '--json'],
      undefined,
      60000
    );

    expect(result.code).toBe(1);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('hooks:download');
    expect(parsed.errors[0].code).toBe('OFFLINE');
  }, 90_000);
});
