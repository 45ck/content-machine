import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type CliRun = {
  child: ReturnType<typeof spawn>;
  stdout: string;
  stderr: string;
};

function repoRoot(): string {
  const helperDir = dirname(fileURLToPath(import.meta.url));
  return join(helperDir, '..', '..', '..');
}

async function waitForJsonEnvelope(proc: CliRun, timeoutMs: number): Promise<any> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      return JSON.parse(proc.stdout);
    } catch {
      await new Promise((r) => setTimeout(r, 25));
    }
  }
  throw new Error(`Timed out waiting for JSON envelope. stderr:\n${proc.stderr}`);
}

async function waitForExit(proc: CliRun, timeoutMs: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.child.kill('SIGTERM');
      reject(new Error(`Timed out waiting for CLI to exit. stderr:\n${proc.stderr}`));
    }, timeoutMs);

    proc.child.once('close', (code) => {
      clearTimeout(timer);
      resolve(typeof code === 'number' ? code : 1);
    });
  });
}

function spawnCli(args: string[], env: NodeJS.ProcessEnv): CliRun {
  const root = repoRoot();
  const tmp = join(root, '.cache', 'tsx-tmp');

  const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli/index.ts', ...args], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      TMPDIR: tmp,
      TMP: tmp,
      TEMP: tmp,
      TSX_DISABLE_CACHE: '1',
      ...env,
    },
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const run: CliRun = { child, stdout: '', stderr: '' };
  child.stdout.on('data', (chunk) => {
    run.stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    run.stderr += chunk.toString();
  });

  return run;
}

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

describe('cm lab (E2E)', () => {
  it('starts compare one-shot in JSON mode and auto-exits after submit', async () => {
    const base = await mkdtemp(join(tmpdir(), 'cm-lab-cli-'));
    const allowedRoot = join(base, 'allowed');
    const aDir = join(allowedRoot, 'runA');
    const bDir = join(allowedRoot, 'runB');

    await mkdir(aDir, { recursive: true });
    await mkdir(bDir, { recursive: true });

    await writeFile(join(aDir, 'video.mp4'), Buffer.from('0123456789abcdef'));
    await writeFile(join(bDir, 'video.mp4'), Buffer.from('fedcba9876543210'));
    await writeFile(
      join(aDir, 'script.json'),
      JSON.stringify({ meta: { topic: 'A topic' } }),
      'utf-8'
    );
    await writeFile(
      join(bDir, 'script.json'),
      JSON.stringify({ meta: { topic: 'B topic' } }),
      'utf-8'
    );

    const env = {
      CM_LAB_ROOT: join(base, 'lab-root'),
      CM_FEEDBACK_STORE_PATH: join(base, 'feedback', 'feedback.jsonl'),
    };

    const proc = spawnCli(
      [
        '--json',
        'lab',
        'compare',
        aDir,
        bDir,
        '--no-open',
        '--port',
        '0',
        '--allow-root',
        allowedRoot,
      ],
      env
    );

    try {
      const envelope = await waitForJsonEnvelope(proc, 10_000);
      expect(envelope.command).toBe('lab');
      expect(envelope.errors).toEqual([]);

      const url = String(envelope.outputs.url);
      const experimentId = String(envelope.outputs.experimentId);
      const baselineRunId = String(envelope.outputs.baselineRunId);
      const variantRunId = String(envelope.outputs.variantRunId);

      const configRes = await fetch(new URL('/api/config', url));
      expect(configRes.status).toBe(200);
      const config = await readJson(configRes);
      const token = String(config.token);

      const expRes = await fetch(
        new URL(`/api/experiments/${encodeURIComponent(experimentId)}`, url)
      );
      expect(expRes.status).toBe(200);
      const exp = await readJson(expRes);
      expect(Array.isArray(exp.variants)).toBe(true);
      expect(exp.variants.length).toBeGreaterThan(0);

      const variantId = String(exp.variants[0].variantId);

      const submitRes = await fetch(
        new URL(`/api/experiments/${encodeURIComponent(experimentId)}/submit`, url),
        {
          method: 'POST',
          headers: {
            'X-CM-LAB-TOKEN': token,
            'X-CM-LAB-REQUEST-ID': 'req_1',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            winnerVariantId: variantId,
            reason: 'B wins',
            perRun: [
              {
                runId: baselineRunId,
                variantId: 'baseline',
                ratings: { overall: 70, captions: 60 },
              },
              { runId: variantRunId, variantId, ratings: { overall: 80, captions: 85 } },
            ],
          }),
        }
      );
      expect(submitRes.status).toBe(200);
      const submit = await readJson(submitRes);
      expect(Array.isArray(submit.feedbackIds)).toBe(true);
      expect(submit.feedbackIds.length).toBe(2);

      const code = await waitForExit(proc, 5_000);
      expect(code).toBe(0);

      const { readFeedbackEntries } = await import('../../../src/feedback/store');
      const entries = await readFeedbackEntries(env.CM_FEEDBACK_STORE_PATH);
      const forExp = entries.filter((e) => e.experimentId === experimentId);
      expect(forExp.length).toBe(2);
    } finally {
      proc.child.kill('SIGTERM');
      await rm(base, { recursive: true, force: true });
    }
  }, 30_000);
});
