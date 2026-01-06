import { spawn } from 'child_process';
import { join } from 'path';

export interface CliRunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function runCli(args: string[], env?: NodeJS.ProcessEnv): Promise<CliRunResult> {
  const tsxCli = join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, 'src/cli/index.ts', ...args], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
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
