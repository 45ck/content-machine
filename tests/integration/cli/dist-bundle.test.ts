import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

function getRepoRoot(): string {
  const helperDir = dirname(fileURLToPath(import.meta.url));
  return join(helperDir, '..', '..', '..');
}

function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let killed = false;
    const timeoutMs = options.timeoutMs ?? 60_000;
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        resolve({ code: 124, stdout, stderr: stderr + '\nProcess timed out' });
      } else {
        resolve({ code: typeof code === 'number' ? code : 1, stdout, stderr });
      }
    });
  });
}

describe('dist CLI bundle', () => {
  it('runs `cm --help` without ESM require errors', async () => {
    const repoRoot = getRepoRoot();
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

    const build = await runCommand(npmCmd, ['run', 'build'], {
      cwd: repoRoot,
      env: { ...process.env, NODE_ENV: 'test' },
      timeoutMs: 120_000,
    });
    expect(build.code).toBe(0);

    const run = await runCommand(process.execPath, ['dist/cli/index.cjs', '--help'], {
      cwd: repoRoot,
      env: { ...process.env, NODE_ENV: 'test' },
      timeoutMs: 60_000,
    });

    expect(run.code).toBe(0);
    expect(run.stdout).toContain('Usage: cm');
    expect(run.stderr).not.toContain('ERR_REQUIRE_ESM');
  }, 180_000);
});
