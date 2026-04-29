import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadVideoEvaluatorAdapter, resolveVideoEvaluatorEntrypoints } from './video-evaluator';

function makeEvaluatorFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'cm-video-evaluator-'));
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'package.json'), '{"type":"module"}\n');
  writeFileSync(
    join(root, 'dist', 'index.js'),
    [
      'export async function runLayoutSafetyReview(input) {',
      '  return { reportPath: `${input.outputDir}/layout-safety.report.json`, report: { issues: [] } };',
      '}',
    ].join('\n')
  );
  return root;
}

describe('video-evaluator adapter', () => {
  it('resolves package first and explicit built root second', () => {
    const root = makeEvaluatorFixture();
    const entrypoints = resolveVideoEvaluatorEntrypoints({
      explicitRoot: root,
      searchFrom: join(tmpdir(), 'cm-no-sibling', 'content-machine'),
    });

    expect(entrypoints[0]).toMatchObject({
      source: 'package',
      specifier: '@45ck/video-evaluator',
    });
    expect(entrypoints[1]?.source).toBe('explicit-root');
    expect(entrypoints[1]?.specifier).toContain('/dist/index.js');
  });

  it('loads layout safety review from an explicit built root', async () => {
    const root = makeEvaluatorFixture();
    const adapter = await loadVideoEvaluatorAdapter({
      explicitRoot: root,
      packageName: '@missing/video-evaluator-test',
      searchFrom: join(tmpdir(), 'cm-no-sibling', 'content-machine'),
    });

    const result = await adapter?.runLayoutSafetyReview?.({
      videoPath: '/tmp/demo.mp4',
      outputDir: '/tmp/out',
    });

    expect(adapter?.entrypoint.source).toBe('explicit-root');
    expect(result?.report.issues).toEqual([]);
  });
});
