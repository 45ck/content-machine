import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AssetLedgerRequestSchema, runAssetLedger } from './asset-ledger';

async function readJson(path: string) {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

describe('AssetLedgerRequestSchema', () => {
  it('rejects empty ledger requests', () => {
    expect(() => AssetLedgerRequestSchema.parse({ outputPath: '/tmp/asset-ledger.json' })).toThrow(
      'Provide existingLedgerPath'
    );
  });
});

describe('runAssetLedger', () => {
  it('merges existing assets with generated artifact entries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-harness-asset-ledger-'));
    const audioPath = join(dir, 'audio.wav');
    const renderPath = join(dir, 'video.mp4');
    const existingLedgerPath = join(dir, 'existing-asset-ledger.json');
    const outputPath = join(dir, 'asset-ledger.json');
    await Promise.all([
      writeFile(audioPath, 'voiceover', 'utf8'),
      writeFile(renderPath, 'video', 'utf8'),
      writeFile(
        existingLedgerPath,
        JSON.stringify({
          schemaVersion: '1.0.0',
          assets: [
            {
              assetId: 'external:music-bed',
              assetType: 'music',
              kind: 'music-bed',
              usageMode: 'downloaded-asset',
              reviewStatus: 'needs-review',
              contentIdRisk: 'unknown',
              sourceUrl: 'https://example.com/music.wav',
            },
          ],
          warnings: [],
        }),
        'utf8'
      ),
    ]);

    const result = await runAssetLedger({
      existingLedgerPath,
      outputPath,
      createdAt: '2026-05-02T00:00:00.000Z',
      assets: [
        {
          assetId: 'external:music-bed',
          assetType: 'music',
          kind: 'music-bed',
          usageMode: 'downloaded-asset',
          reviewStatus: 'approved',
          rightsStatus: 'licensed',
          licenseName: 'CC0',
          contentIdRisk: 'none-known',
          sourceUrl: 'https://example.com/music.wav',
        },
      ],
      artifacts: {
        audioPath,
        renderPath,
      },
    });

    const ledger = await readJson(outputPath);
    expect(result.result).toEqual(
      expect.objectContaining({
        outputPath,
        assetCount: 3,
        generatedCount: 2,
        externalCount: 1,
        needsReviewCount: 0,
        audioCount: 2,
      })
    );
    expect(result.warnings).toEqual([]);
    expect(ledger.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetId: 'external:music-bed',
          reviewStatus: 'approved',
          licenseName: 'CC0',
        }),
        expect.objectContaining({
          assetId: 'audio:voiceover',
          fileHash: expect.stringMatching(/^sha256:/),
          contentIdRisk: 'none-known',
        }),
        expect.objectContaining({
          assetId: 'render:video',
          fileHash: expect.stringMatching(/^sha256:/),
        }),
      ])
    );
  });
});
