import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { runCli } from './helpers';

function assertPureJson(stdout: string): any {
  const trimmed = stdout.trim();
  expect(trimmed.startsWith('{')).toBe(true);
  expect(trimmed.endsWith('}')).toBe(true);
  return JSON.parse(trimmed);
}

describe('cm demo', () => {
  it('renders a mock mp4 without API keys', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'demo-command', 'basic');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const fakeHome = join(outDir, 'home');
    mkdirSync(fakeHome, { recursive: true });

    const outputPath = join(outDir, 'demo.mp4');

    const result = await runCli(
      ['--json', 'demo', '--output', outputPath],
      { HOME: fakeHome, OPENAI_API_KEY: '', PEXELS_API_KEY: '' },
      90_000
    );

    expect(result.code).toBe(0);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('demo');
    expect(parsed.outputs.outputPath).toBe(outputPath);
    expect(existsSync(outputPath)).toBe(true);
    expect(statSync(outputPath).size).toBeGreaterThan(100);
  }, 90_000);
});
