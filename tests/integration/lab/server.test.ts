import { describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

describe('Experiment Lab server (integration)', () => {
  it('imports runs, serves video ranges, submits compare idempotently, and polls feedback', async () => {
    const base = await mkdtemp(join(tmpdir(), 'cm-lab-int-'));
    process.env.CM_LAB_ROOT = join(base, 'lab-root');
    process.env.CM_FEEDBACK_STORE_PATH = join(base, 'feedback', 'feedback.jsonl');

    const { startLabServer } = await import('../../../src/lab/server/server');
    const { createLabSession } = await import('../../../src/lab/session/session');
    const { resolveAllowedRoots } = await import('../../../src/lab/security/path');
    const { defaultFeedbackStorePath, readFeedbackEntries } =
      await import('../../../src/feedback/store');

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

    await writeFile(
      join(aDir, 'sync-report.json'),
      JSON.stringify({
        rating: 88,
        ratingLabel: 'Good',
        metrics: { meanDriftMs: 10, maxDriftMs: 40 },
      }),
      'utf-8'
    );
    await writeFile(
      join(aDir, 'caption-report.json'),
      JSON.stringify({
        captionQuality: {
          overall: { score: 0.9 },
          coverage: { coverageRatio: 0.8 },
          ocrConfidence: { mean: 0.95 },
        },
      }),
      'utf-8'
    );

    const allowedRoots = await resolveAllowedRoots([allowedRoot]);
    const session = createLabSession();
    const started = await startLabServer({
      host: '127.0.0.1',
      port: 0,
      session,
      allowedRoots,
      task: null,
      exitAfterSubmit: 0,
    });

    const u = (path: string) => new URL(path, started.url).toString();
    const tokenHeaders = { 'X-CM-LAB-TOKEN': session.token, 'Content-Type': 'application/json' };

    try {
      const configRes = await fetch(u('/api/config'));
      expect(configRes.status).toBe(200);
      const config = await readJson(configRes);
      expect(config.sessionId).toBe(session.sessionId);

      const importARes = await fetch(u('/api/runs/import'), {
        method: 'POST',
        headers: tokenHeaders,
        body: JSON.stringify({ path: aDir }),
      });
      expect(importARes.status).toBe(200);
      const importA = await readJson(importARes);
      expect(typeof importA.runId).toBe('string');

      const importBRes = await fetch(u('/api/runs/import'), {
        method: 'POST',
        headers: tokenHeaders,
        body: JSON.stringify({ path: bDir }),
      });
      expect(importBRes.status).toBe(200);
      const importB = await readJson(importBRes);

      const runARes = await fetch(u(`/api/runs/${encodeURIComponent(importA.runId)}`));
      expect(runARes.status).toBe(200);
      const runA = await readJson(runARes);
      expect(runA.topic).toBe('A topic');

      const headRes = await fetch(u(`/api/runs/${encodeURIComponent(importA.runId)}/video`), {
        method: 'HEAD',
      });
      expect(headRes.status).toBe(200);
      expect(headRes.headers.get('accept-ranges')).toBe('bytes');
      expect(headRes.headers.get('content-type')).toContain('video/mp4');

      const rangeRes = await fetch(u(`/api/runs/${encodeURIComponent(importA.runId)}/video`), {
        headers: { range: 'bytes=0-3' },
      });
      expect(rangeRes.status).toBe(206);
      expect(rangeRes.headers.get('content-range')).toMatch(/^bytes 0-3\/\d+$/);
      const bytes = Buffer.from(await rangeRes.arrayBuffer());
      expect(bytes.toString('utf-8')).toBe('0123');

      const createExpRes = await fetch(u('/api/experiments'), {
        method: 'POST',
        headers: tokenHeaders,
        body: JSON.stringify({
          name: 'Test compare',
          baselineRunId: importA.runId,
          variants: [{ label: 'B', runId: importB.runId }],
        }),
      });
      expect(createExpRes.status).toBe(200);
      const created = await readJson(createExpRes);
      expect(typeof created.experimentId).toBe('string');

      const expRes = await fetch(u(`/api/experiments/${encodeURIComponent(created.experimentId)}`));
      expect(expRes.status).toBe(200);
      const exp = await readJson(expRes);
      expect(Array.isArray(exp.variants)).toBe(true);
      expect(exp.variants.length).toBeGreaterThan(0);

      const requestId = 'req_test_1';
      const submitBody = {
        requestId,
        winnerVariantId: exp.variants[0].variantId,
        reason: 'B looks better',
        perRun: [
          {
            runId: importA.runId,
            variantId: 'baseline',
            ratings: { overall: 70, captions: 60 },
            notes: 'A notes',
          },
          {
            runId: importB.runId,
            variantId: exp.variants[0].variantId,
            ratings: { overall: 80, captions: 85 },
            notes: 'B notes',
          },
        ],
      };

      const submit1Res = await fetch(
        u(`/api/experiments/${encodeURIComponent(created.experimentId)}/submit`),
        {
          method: 'POST',
          headers: { ...tokenHeaders, 'X-CM-LAB-REQUEST-ID': requestId },
          body: JSON.stringify(submitBody),
        }
      );
      expect(submit1Res.status).toBe(200);
      const submit1 = await readJson(submit1Res);
      expect(Array.isArray(submit1.feedbackIds)).toBe(true);
      expect(submit1.feedbackIds.length).toBe(2);

      const submit2Res = await fetch(
        u(`/api/experiments/${encodeURIComponent(created.experimentId)}/submit`),
        {
          method: 'POST',
          headers: { ...tokenHeaders, 'X-CM-LAB-REQUEST-ID': requestId },
          body: JSON.stringify(submitBody),
        }
      );
      expect(submit2Res.status).toBe(200);
      const submit2 = await readJson(submit2Res);
      expect(submit2.feedbackIds).toEqual(submit1.feedbackIds);

      const entries = await readFeedbackEntries(defaultFeedbackStorePath());
      const forExp = entries.filter((e) => e.experimentId === created.experimentId);
      expect(forExp.length).toBe(2);

      const poll1Res = await fetch(
        u(`/api/feedback?since=0&sessionId=${encodeURIComponent(session.sessionId)}&limit=50`)
      );
      expect(poll1Res.status).toBe(200);
      const poll1 = await readJson(poll1Res);
      expect(Array.isArray(poll1.items)).toBe(true);
      expect(poll1.items.length).toBe(2);
      expect(typeof poll1.nextCursor).toBe('string');

      const poll2Res = await fetch(
        u(
          `/api/feedback?since=${encodeURIComponent(poll1.nextCursor)}&sessionId=${encodeURIComponent(session.sessionId)}`
        )
      );
      expect(poll2Res.status).toBe(200);
      const poll2 = await readJson(poll2Res);
      expect(poll2.items).toEqual([]);

      const badCursorRes = await fetch(
        u(`/api/feedback?since=1&sessionId=${encodeURIComponent(session.sessionId)}`)
      );
      expect(badCursorRes.status).toBe(400);
      const badCursor = await readJson(badCursorRes);
      expect(badCursor.error.code).toBe('INVALID_CURSOR');
    } finally {
      await started.close();
      await rm(base, { recursive: true, force: true });
      delete process.env.CM_LAB_ROOT;
      delete process.env.CM_FEEDBACK_STORE_PATH;
    }
  });
});
