import { spawn } from 'child_process';
import { mkdirSync, mkdtempSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface CliRunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function runCli(
  args: string[],
  env?: NodeJS.ProcessEnv,
  timeoutMs = 45000
): Promise<CliRunResult> {
  // Some E2E runs can be killed externally under load (e.g. SIGKILL from the OS).
  // Retrying once makes the suite much less flaky without masking real exit codes.
  const maxAttempts = 2;
  const helperDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(helperDir, '..', '..', '..');
  const tmpRoot = join(repoRoot, '.cache', 'tsx-tmp');

  mkdirSync(tmpRoot, { recursive: true });
  // Use a unique temp directory per invocation so parallel tests can't step on
  // each other via shared TMPDIR/TEMP (ffmpeg/remotion/tsx caches, etc.).
  const tmpDir = mkdtempSync(join(tmpRoot, 'run-'));

  async function runOnce(): Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
    stdout: string;
    stderr: string;
    killed: boolean;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli/index.ts', ...args], {
        env: {
          ...process.env,
          NODE_ENV: 'test',
          TMPDIR: tmpDir,
          TMP: tmpDir,
          TEMP: tmpDir,
          TSX_DISABLE_CACHE: '1',
          ...env,
        },
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let killed = false;

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
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        resolve({ code, signal, stdout, stderr, killed });
      });
    });
  }

  let last: Awaited<ReturnType<typeof runOnce>> | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await runOnce();
    if (last.killed) {
      return { code: 124, stdout: last.stdout, stderr: last.stderr + '\nProcess timed out' };
    }
    const numericCode = typeof last.code === 'number' ? last.code : null;
    if (numericCode !== null) {
      return { code: numericCode, stdout: last.stdout, stderr: last.stderr };
    }
    // Retry only when the process died due to an external signal (e.g. SIGKILL).
    if (attempt < maxAttempts && last.signal) {
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }
    return {
      code: 1,
      stdout: last.stdout,
      stderr: last.stderr + (last.signal ? `\nProcess terminated (${last.signal})` : ''),
    };
  }

  // Unreachable, but keeps TS happy.
  return { code: 1, stdout: last?.stdout ?? '', stderr: last?.stderr ?? '' };
}
