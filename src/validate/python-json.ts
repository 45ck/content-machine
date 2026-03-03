import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CMError } from '../core/errors';

function detectPython(): string {
  if (process.env.CM_PYTHON) return process.env.CM_PYTHON;
  const candidates = [
    resolve(process.cwd(), '.venv', 'Scripts', 'python.exe'),
    resolve(process.cwd(), '.venv', 'bin', 'python3'),
    resolve(process.cwd(), '.venv', 'bin', 'python'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

function tryParseJsonFromOutput(output: string): unknown {
  const text = output.trim();
  if (!text) {
    throw new Error('empty output');
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    // Some tools print logs before JSON. Find the first valid JSON payload suffix.
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (ch !== '{' && ch !== '[') continue;
      try {
        return JSON.parse(text.slice(i)) as unknown;
      } catch {
        // keep scanning
      }
    }
    throw new Error('no JSON payload found');
  }
}

/** Spawns a Python script and parses its stdout as JSON. */
export function runPythonJson(params: {
  errorCode: string;
  pythonPath?: string;
  scriptPath: string;
  args: readonly string[];
  timeoutMs?: number;
}): Promise<unknown> {
  const pythonPath = params.pythonPath ?? detectPython();
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
        const parsed = tryParseJsonFromOutput(stdout);
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
