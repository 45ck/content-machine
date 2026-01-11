import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { SCRIPT_SCHEMA_VERSION } from '../../../src/script/schema';
import { VISUALS_SCHEMA_VERSION } from '../../../src/visuals/schema';

function assertPureJson(stdout: string): any {
  const trimmed = stdout.trim();
  expect(trimmed.startsWith('{')).toBe(true);
  expect(trimmed.endsWith('}')).toBe(true);
  return JSON.parse(trimmed);
}

describe('on-demand assets', () => {
  it('cm generate --preflight respects CM_WHISPER_DIR (does not use default cache)', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'on-demand-assets', 'generate-whisper-dir');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    // Ensure the default whisper cache *appears* installed, so this test proves CM_WHISPER_DIR is respected.
    const defaultWhisperDir = join(process.cwd(), '.cache', 'whisper');
    mkdirSync(defaultWhisperDir, { recursive: true });
    const defaultModelPath = join(defaultWhisperDir, 'ggml-base.bin');
    if (!existsSync(defaultModelPath)) {
      writeFileSync(defaultModelPath, 'stub', 'utf-8');
    }
    const defaultBinaryPath = join(
      defaultWhisperDir,
      process.platform === 'win32' ? 'main.exe' : 'main'
    );
    if (!existsSync(defaultBinaryPath)) {
      writeFileSync(defaultBinaryPath, 'stub', 'utf-8');
    }

    const scriptPath = join(outDir, 'script.json');
    const visualsPath = join(outDir, 'visuals.json');
    const outVideo = join(outDir, 'video.mp4');

    writeFileSync(
      scriptPath,
      JSON.stringify(
        {
          schemaVersion: SCRIPT_SCHEMA_VERSION,
          scenes: [{ id: 'scene-001', text: 'hello world', visualDirection: 'mock' }],
          reasoning: 'fixture',
        },
        null,
        2
      ),
      'utf-8'
    );

    writeFileSync(
      visualsPath,
      JSON.stringify(
        {
          schemaVersion: VISUALS_SCHEMA_VERSION,
          scenes: [{ sceneId: 'scene-001', source: 'mock', assetPath: 'mock', duration: 1 }],
          totalAssets: 1,
          fromUserFootage: 0,
          fromStock: 0,
          fallbacks: 0,
        },
        null,
        2
      ),
      'utf-8'
    );

    const missingWhisperDir = join(outDir, 'whisper');

    const result = await runCli(
      [
        'generate',
        'Redis',
        '--preflight',
        '--json',
        '--script',
        scriptPath,
        '--visuals',
        visualsPath,
        '--hook',
        'none',
        '-o',
        outVideo,
      ],
      { CM_WHISPER_DIR: missingWhisperDir },
      60000
    );

    expect(result.code).toBe(1);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('generate');
    expect(parsed.outputs.preflightPassed).toBe(false);
    expect(parsed.errors.some((e: any) => e.code === 'DEPENDENCY_MISSING')).toBe(true);
  }, 90_000);

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

  it('cm generate --preflight does not download hooks (even with --download-hook) when offline', async () => {
    const outDir = join(
      process.cwd(),
      'tests',
      '.tmp',
      'on-demand-assets',
      'generate-hook-offline'
    );
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const hooksDir = join(outDir, 'hooks');

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
        '--download-hook',
        '--offline',
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

  it('cm --offline hooks download fails (global offline)', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'on-demand-assets', 'hooks-offline-global');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const hooksDir = join(outDir, 'hooks');

    const result = await runCli(
      ['--offline', 'hooks', 'download', 'no-crunch', '--hooks-dir', hooksDir, '--json'],
      undefined,
      60000
    );

    expect(result.code).toBe(1);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('hooks:download');
    expect(parsed.errors[0].code).toBe('OFFLINE');
  }, 90_000);

  it('cm --offline setup whisper --json fails fast (no downloads)', async () => {
    const outDir = join(
      process.cwd(),
      'tests',
      '.tmp',
      'on-demand-assets',
      'setup-whisper-offline'
    );
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const whisperDir = join(outDir, 'whisper');

    const result = await runCli(
      ['--offline', 'setup', 'whisper', '--json', '--model', 'base', '--dir', whisperDir],
      undefined,
      60000
    );

    expect(result.code).toBe(1);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('setup:whisper');
    expect(parsed.errors[0].code).toBe('OFFLINE');
  }, 90_000);
});
