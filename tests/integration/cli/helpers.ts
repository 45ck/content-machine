import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
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
  const helperDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(helperDir, '..', '..', '..');
  const tempRoot = join(repoRoot, '.tmp', 'tests', `cli-${process.pid}`);
  mkdirSync(tempRoot, { recursive: true });

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli/index.ts', ...args], {
      env: {
        ...process.env,
        TMPDIR: tempRoot,
        TMP: tempRoot,
        TEMP: tempRoot,
        NODE_ENV: 'test',
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
    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        resolve({ code: 124, stdout, stderr: stderr + '\nProcess timed out' });
      } else {
        resolve({
          code: typeof code === 'number' ? code : 1,
          stdout,
          stderr,
        });
      }
    });
  });
}
