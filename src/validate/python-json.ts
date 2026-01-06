import { spawn } from 'node:child_process';
import { CMError } from '../core/errors';

export function runPythonJson(params: {
  errorCode: string;
  pythonPath?: string;
  scriptPath: string;
  args: readonly string[];
  timeoutMs?: number;
}): Promise<unknown> {
  const pythonPath = params.pythonPath ?? 'python';
  const timeoutMs = params.timeoutMs ?? 30_000;

  return new Promise((resolvePromise, reject) => {
    const child = spawn(pythonPath, [params.scriptPath, ...params.args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill();
      reject(
        new CMError(params.errorCode, `Python timed out after ${timeoutMs}ms`, {
          pythonPath,
          scriptPath: params.scriptPath,
        })
      );
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(
        new CMError(params.errorCode, `Failed to start python: ${String(error)}`, {
          pythonPath,
          scriptPath: params.scriptPath,
        })
      );
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(stdout) as unknown;
        if (code === 0) {
          resolvePromise(parsed);
          return;
        }
        reject(
          new CMError(params.errorCode, `Python script failed with code ${code ?? 'unknown'}`, {
            pythonPath,
            scriptPath: params.scriptPath,
            code,
            stderr: stderr.trim() || undefined,
            stdout: stdout.trim() || undefined,
          })
        );
      } catch {
        reject(
          new CMError(params.errorCode, 'Python script did not return valid JSON', {
            pythonPath,
            scriptPath: params.scriptPath,
            code,
            stderr: stderr.trim() || undefined,
            stdout: stdout.trim() || undefined,
          })
        );
      }
    });
  });
}

