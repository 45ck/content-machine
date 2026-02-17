import { describe, expect, it } from 'vitest';
import { chromium, firefox, type BrowserType, type Page } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms: ${label}`)), timeoutMs);
    }),
  ]);
}

describe('Experiment Lab UI (Playwright)', () => {
  interface ScenarioOpts {
    browserType: BrowserType;
    browserName: string;
    requireOverall?: boolean;
    goodBadMode?: boolean;
    runCount?: number;
    configurePage?: (
      page: Page,
      context: {
        aRunId: string;
        bRunId: string;
        runIds: string[];
        experimentId: string;
      }
    ) => Promise<void>;
    expectError?: string;
    assertFeedback?: (context: {
      entries: Array<{ runId?: string; ratings?: Record<string, unknown> }>;
      aRunId: string;
      bRunId: string;
      runIds: string[];
      experimentId: string;
    }) => Promise<void> | void;
  }

  async function runCompareE2E(params: ScenarioOpts) {
    const base = await mkdtemp(join(tmpdir(), `cm-lab-ui-${params.browserName}-`));
    const prevLabRoot = process.env.CM_LAB_ROOT;
    const prevFeedbackStore = process.env.CM_FEEDBACK_STORE_PATH;

    process.env.CM_LAB_ROOT = join(base, 'lab-root');
    process.env.CM_FEEDBACK_STORE_PATH = join(base, 'feedback', 'feedback.jsonl');

    const { startLabServer } = await import('../../src/lab/server/server');
    const { createLabSession } = await import('../../src/lab/session/session');
    const { resolveAllowedRoots } = await import('../../src/lab/security/path');
    const { importLabRunFromPath } = await import('../../src/lab/services/runs');
    const { labExperimentsStorePath } = await import('../../src/lab/paths');
    const { appendExperiment, generateExperimentId, generateVariantId } =
      await import('../../src/lab/stores/experiments-store');
    const { LabExperimentSchema } = await import('../../src/domain');
    const { readFeedbackEntries } = await import('../../src/feedback/store');
    const { renderVideo } = await import('../../src/render/service');

    const allowedRoot = join(base, 'allowed');
    const runCount = Math.max(2, Number(params.runCount ?? 2));
    const runDirs = Array.from({ length: runCount }, (_, index) =>
      join(allowedRoot, `run-${String(index + 1).padStart(2, '0')}`)
    );
    await Promise.all(runDirs.map((runDir) => mkdir(runDir, { recursive: true })));

    // Generate valid MP4s so we can verify metadata loads and linked playback doesn't deadlock.
    // Use mock render mode so this remains fast and deterministic in CI.
    const visuals = {
      schemaVersion: '1.0.0',
      scenes: [{ sceneId: 'scene-1', source: 'mock', assetPath: 'mock://asset', duration: 1 }],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 1,
      fallbacks: 0,
    };

    const timestamps = {
      schemaVersion: '1.0.0',
      allWords: [{ word: 'test', start: 0, end: 0.5 }],
      totalDuration: 1,
      ttsEngine: 'mock',
      asrEngine: 'mock',
    };

    await Promise.all(
      runDirs.map((runDir, index) =>
        renderVideo({
          visuals,
          timestamps,
          audioPath: join(runDir, 'audio.wav'),
          outputPath: join(runDir, 'video.mp4'),
          orientation: 'portrait',
          mock: true,
        }).then(() =>
          writeFile(
            join(runDir, 'script.json'),
            JSON.stringify({ meta: { topic: `${String.fromCharCode(65 + index)} topic` } }),
            'utf-8'
          )
        )
      )
    );

    const allowedRoots = await resolveAllowedRoots([allowedRoot]);
    const session = createLabSession();

    const runs = await Promise.all(
      runDirs.map((runDir) => importLabRunFromPath({ session, allowedRoots, inputPath: runDir }))
    );

    const [baseline, ...variants] = runs;

    const experimentId = generateExperimentId();
    const variantCards = variants.map((_, index) => ({
      variantId: generateVariantId(),
      label: String.fromCharCode(66 + index),
      runId: variants[index].run.runId,
    }));

    const exp = LabExperimentSchema.parse({
      schemaVersion: 1,
      experimentId,
      sessionId: session.sessionId,
      createdAt: new Date().toISOString(),
      name: 'UI E2E',
      hypothesis: 'B should win',
      topic: baseline.run.topic ?? variants[0].run.topic,
      baselineRunId: baseline.run.runId,
      variants: variantCards,
      status: 'queued',
    });
    await appendExperiment(labExperimentsStorePath(), exp);

    const started = await startLabServer({
      host: '127.0.0.1',
      port: 0,
      session,
      allowedRoots,
      task: { type: 'compare', experimentId },
      exitAfterSubmit: 1,
    });

    const serverClosed = new Promise<void>((resolve) => {
      started.server.once('close', () => resolve());
    });

    const browser = await params.browserType.launch();
    try {
      const page = await browser.newPage();

      const route = `#/compare/${encodeURIComponent(experimentId)}${
        params.requireOverall ? '?requireOverall=1' : ''
      }${params.goodBadMode ? `${params.requireOverall ? '&' : '?'}goodBadMode=1` : ''}`;
      const url = `${started.url}${route}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1:has-text("Compare")', { timeout: 10_000 });

      // Verify videos load and linked playback is usable.
      await page.waitForSelector('#videoA', { timeout: 10_000, state: 'attached' });
      await page.waitForSelector('#videoB', { timeout: 10_000, state: 'attached' });
      await page.waitForFunction(
        () => {
          const a = document.getElementById('videoA');
          const b = document.getElementById('videoB');
          if (!(a instanceof HTMLVideoElement) || !(b instanceof HTMLVideoElement)) return false;
          return a.readyState >= 1 && b.readyState >= 1 && a.duration > 0 && b.duration > 0;
        },
        { timeout: 15_000 }
      );

      if (params.configurePage) {
        await params.configurePage(page, {
          aRunId: baseline.run.runId,
          bRunId: variants[0].run.runId,
          runIds: runs.map((run) => run.run.runId),
          experimentId,
        });
      }

      await page.click('#submitCompare');
      if (params.expectError) {
        const errorEl = await page.waitForSelector('#submitMsg .error', { timeout: 10_000 });
        const text = (await errorEl.textContent()) || '';
        expect(text).toContain(params.expectError);
      } else {
        await page.waitForSelector('#submitMsg .success', { timeout: 10_000 });

        const feedback = await readFeedbackEntries(process.env.CM_FEEDBACK_STORE_PATH);
        const entries = feedback.filter((f) => f.experimentId === experimentId);
        expect(entries.length).toBe(runCount);
        if (params.assertFeedback) {
          await params.assertFeedback({
            entries,
            aRunId: baseline.run.runId,
            bRunId: variants[0].run.runId,
            runIds: runs.map((run) => run.run.runId),
            experimentId,
          });
        }

        await withTimeout(serverClosed, 15_000, 'Lab server auto-close after submit');
      }
    } finally {
      await browser.close();
      await started.close();
      await rm(base, { recursive: true, force: true });

      if (prevLabRoot === undefined) delete process.env.CM_LAB_ROOT;
      else process.env.CM_LAB_ROOT = prevLabRoot;
      if (prevFeedbackStore === undefined) delete process.env.CM_FEEDBACK_STORE_PATH;
      else process.env.CM_FEEDBACK_STORE_PATH = prevFeedbackStore;
    }
  }

  it('chromium: optional overall by default', async () => {
    await runCompareE2E({
      browserType: chromium,
      browserName: 'chromium',
      configurePage: async (page) => {
        await page.check('#advancedMode');
        expect(await page.isChecked('#revealMetrics')).toBe(false);
        expect(await page.isVisible('#metricsA')).toBe(false);
        expect(await page.isVisible('#metricsB')).toBe(false);
        await page.uncheck('#quickRateMode');
        await page.uncheck('#swipeMode');
        await page.waitForTimeout(25);
        expect(await page.isChecked('#swipeMode')).toBe(false);
        await page.uncheck('#singleVideoMode');
      },
      assertFeedback: ({ entries, aRunId, bRunId }) => {
        const aEntry = entries.find((entry) => entry.runId === aRunId);
        const bEntry = entries.find((entry) => entry.runId === bRunId);
        expect(aEntry?.ratings?.overall).toBeUndefined();
        expect(bEntry?.ratings?.overall).toBeUndefined();
      },
    });
  }, 60_000);

  it('chromium: requireOverall blocks submission until provided', async () => {
    await runCompareE2E({
      browserType: chromium,
      browserName: 'chromium-require',
      requireOverall: true,
      configurePage: async (page) => {
        await page.check('#advancedMode');
        await page.uncheck('#quickRateMode');
        await page.uncheck('#swipeMode');
        await page.waitForTimeout(25);
        expect(await page.isChecked('#swipeMode')).toBe(false);
        await page.uncheck('#singleVideoMode');
      },
      expectError: 'overall is required',
    });
  }, 60_000);

  it('chromium: swipe interactions do not auto-enable quick mode', async () => {
    await runCompareE2E({
      browserType: chromium,
      browserName: 'chromium-no-auto-quick',
      configurePage: async (page) => {
        await page.check('#advancedMode');
        await page.uncheck('#quickRateMode');
        await page.check('#swipeMode');
        await page.waitForTimeout(25);
        expect(await page.isChecked('#quickRateMode')).toBe(false);
        await page.click('#swipeLeft');
        expect(await page.isChecked('#quickRateMode')).toBe(false);
      },
      assertFeedback: ({ entries, aRunId, bRunId }) => {
        const aEntry = entries.find((entry) => entry.runId === aRunId);
        const bEntry = entries.find((entry) => entry.runId === bRunId);
        expect(aEntry?.ratings?.overall).toBeDefined();
        expect(bEntry?.ratings?.overall).toBeDefined();
      },
    });
  }, 60_000);

  it('chromium: auto-advance moves through multiple variants by default', async () => {
    await runCompareE2E({
      browserType: chromium,
      browserName: 'chromium-auto-advance',
      runCount: 3,
      configurePage: async (page) => {
        const visible = async () => {
          return page.$$eval('.run-card', (cards) =>
            cards
              .filter((card) => !card.classList.contains('run-card-hidden'))
              .map((card) => ({
                prefix: card.getAttribute('data-run-prefix') || '',
                runId: card.getAttribute('data-run-id') || '',
              }))
          );
        };

        await page.check('#advancedMode');
        await page.uncheck('#quickRateMode');
        await page.check('#singleVideoMode');
        await page.check('#autoAdvanceSwipe');
        await page.check('#autoplaySwipe');
        expect(await page.isChecked('#singleVideoMode')).toBe(true);
        expect(await page.isChecked('#autoAdvanceSwipe')).toBe(true);
        await page.waitForTimeout(50);

        let visibleCards = await visible();
        expect(visibleCards.length).toBe(1);
        const firstVariant = visibleCards.find((card) => card.prefix !== 'a')?.prefix;
        expect(typeof firstVariant).toBe('string');
        expect(firstVariant).toBeTruthy();

        if (firstVariant === 'c' && (await page.isVisible('#deckPrev'))) {
          await page.click('#deckPrev');
          await page.waitForTimeout(25);
          visibleCards = await visible();
          expect(await page.isEnabled('#deckPrev')).toBe(false);
          const maybeFirst = visibleCards.find((card) => card.prefix !== 'a')?.prefix;
          expect(maybeFirst).toBe('b');
          visibleCards = await visible();
        }

        await page.click('#swipeRight');
        await page.waitForTimeout(80);
        visibleCards = await visible();
        const secondVariant = visibleCards.find((card) => card.prefix !== 'a')?.prefix;
        expect(typeof secondVariant).toBe('string');
        expect(secondVariant).toBeTruthy();
        expect(secondVariant).not.toEqual(firstVariant);

        const state1 = await page.evaluate(() => {
          const card = Array.from(document.querySelectorAll('.run-card')).find((el) => {
            const prefix = el.getAttribute('data-run-prefix') || '';
            return prefix !== 'a' && !el.classList.contains('run-card-hidden');
          });
          const video = card ? card.querySelector('video') : null;
          return {
            activePrefix: card ? card.getAttribute('data-run-prefix') : null,
            activePlaying: video ? !video.paused : null,
            activeTime: video ? Number(video.currentTime) : null,
          };
        });
        expect(state1.activePlaying).toBe(true);
        expect(state1.activeTime).toBeGreaterThan(0);

        await page.click('#swipeLeft');
        await page.waitForTimeout(80);
        visibleCards = await visible();
        expect(visibleCards.length).toBe(1);
        expect(visibleCards.find((card) => card.prefix !== 'a')).toBeTruthy();
      },
      assertFeedback: ({ entries, runIds }) => {
        const aEntry = entries.find((entry) => entry.runId === runIds[0]);
        const variantEntries = entries.filter(
          (entry) => runIds.slice(1).includes(entry.runId || '') && entry.ratings
        );
        const variantScores = variantEntries
          .map((entry) => entry.ratings && entry.ratings.overall)
          .filter((n) => Number.isFinite(n))
          .sort((a, b) => Number(a) - Number(b));

        expect(aEntry?.ratings?.overall).toBe(50);
        expect(variantScores).toEqual([20, 80]);
      },
    });
  }, 60_000);

  it('chromium: good/bad mode disables tie and submits with inferred scores', async () => {
    await runCompareE2E({
      browserType: chromium,
      browserName: 'chromium-good-bad',
      goodBadMode: true,
      configurePage: async (page) => {
        await page.check('#advancedMode');
        await page.uncheck('#quickRateMode');
        await page.check('#swipeMode');
        await page.check('#goodBadMode');
        await page.waitForTimeout(25);
        expect(await page.isChecked('#goodBadMode')).toBe(true);
        expect(await page.isVisible('#swipeTie')).toBe(false);
        await page.click('#swipeRight');
      },
      assertFeedback: ({ entries, aRunId, bRunId }) => {
        const aEntry = entries.find((entry) => entry.runId === aRunId);
        const bEntry = entries.find((entry) => entry.runId === bRunId);
        expect(aEntry?.ratings?.overall).toBe(20);
        expect(bEntry?.ratings?.overall).toBe(80);
      },
    });
  }, 60_000);

  it.runIf(existsSync(firefox.executablePath()))(
    'firefox: optional overall by default',
    async () => {
      await runCompareE2E({
        browserType: firefox,
        browserName: 'firefox',
        configurePage: async (page) => {
          await page.check('#advancedMode');
          await page.uncheck('#quickRateMode');
          await page.uncheck('#swipeMode');
          await page.waitForTimeout(25);
          expect(await page.isChecked('#swipeMode')).toBe(false);
          await page.uncheck('#singleVideoMode');
        },
        assertFeedback: ({ entries, aRunId, bRunId }) => {
          const aEntry = entries.find((entry) => entry.runId === aRunId);
          const bEntry = entries.find((entry) => entry.runId === bRunId);
          expect(aEntry?.ratings?.overall).toBeUndefined();
          expect(bEntry?.ratings?.overall).toBeUndefined();
        },
      });
    },
    60_000
  );
});
