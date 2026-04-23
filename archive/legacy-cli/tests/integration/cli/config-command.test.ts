import { describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCli } from './helpers';

function assertPureJson(stdout: string): any {
  const trimmed = stdout.trim();
  expect(trimmed.startsWith('{')).toBe(true);
  expect(trimmed.endsWith('}')).toBe(true);
  return JSON.parse(trimmed);
}

describe('cm config', () => {
  it('cm --config ... config show --json prints resolved config', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'config-command', 'show-json');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const configPath = join(outDir, 'config.toml');
    writeFileSync(
      configPath,
      [
        '[defaults]',
        'archetype = "versus"',
        'orientation = "landscape"',
        'voice = "am_adam"',
        '',
        '[render]',
        'fps = 60',
        '',
      ].join('\n'),
      'utf-8'
    );

    const fakeHome = join(outDir, 'home');
    mkdirSync(fakeHome, { recursive: true });

    const result = await runCli(
      ['--config', configPath, 'config', 'show', '--json'],
      { HOME: fakeHome },
      60_000
    );

    expect(result.code).toBe(0);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('config:show');
    expect(parsed.errors).toEqual([]);

    expect(parsed.outputs.config.defaults.archetype).toBe('versus');
    expect(parsed.outputs.config.defaults.orientation).toBe('landscape');
    expect(parsed.outputs.config.defaults.voice).toBe('am_adam');
    expect(parsed.outputs.config.render.fps).toBe(60);

    expect(parsed.outputs.files.projectConfigPath).toBe(configPath);
    expect(parsed.outputs.files.loadedConfigPaths).toContain(configPath);
  }, 90_000);
});
