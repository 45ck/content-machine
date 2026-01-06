import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface CliRunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function runCli(args: string[], env?: NodeJS.ProcessEnv): Promise<CliRunResult> {
  const helperDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(helperDir, '..', '..', '..');
  const tsxCli = join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, 'src/cli/index.ts', ...args], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ...env,
      },
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      resolve({
        code: typeof code === 'number' ? code : 1,
        stdout,
        stderr,
      });
    });
  });
}
