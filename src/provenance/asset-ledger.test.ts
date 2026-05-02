import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { buildGenerateShortAssetLedger } from './asset-ledger';

describe('buildGenerateShortAssetLedger', () => {
  it('records generated run artifacts and flags external visual assets for review', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-asset-ledger-'));
    const scriptPath = join(dir, 'script.json');
    const audioPath = join(dir, 'audio.wav');
    const timestampsPath = join(dir, 'timestamps.json');
    const audioMetadataPath = join(dir, 'audio.json');
    const visualsPath = join(dir, 'visuals.json');
    const renderPath = join(dir, 'video.mp4');
    const renderMetadataPath = join(dir, 'render.json');
    const qualitySummaryPath = join(dir, 'quality-summary.json');
    await Promise.all([
      writeFile(scriptPath, '{}', 'utf8'),
      writeFile(audioPath, 'audio', 'utf8'),
      writeFile(timestampsPath, '{}', 'utf8'),
      writeFile(audioMetadataPath, '{}', 'utf8'),
      writeFile(visualsPath, '{}', 'utf8'),
      writeFile(renderPath, 'video', 'utf8'),
      writeFile(renderMetadataPath, '{}', 'utf8'),
      writeFile(qualitySummaryPath, '{}', 'utf8'),
    ]);

    const ledger = await buildGenerateShortAssetLedger({
      topic: 'Show the repo fast',
      archetype: 'listicle',
      laneId: 'stock-b-roll-explainer',
      llmProvider: 'default',
      scriptPath,
      audio: {
        audioPath,
        timestampsPath,
        outputMetadataPath: audioMetadataPath,
        voice: 'af_heart',
        ttsEngine: 'kokoro',
        asrEngine: 'whisper',
      },
      visualsPath,
      visuals: {
        schemaVersion: '1.1.0',
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'generated-dalle',
            assetPath: join(dir, 'scene-1.png'),
            duration: 2,
            assetType: 'image',
            motionStrategy: 'kenburns',
            motionApplied: false,
            generationPrompt: 'abstract machine diagram',
            generationModel: 'dall-e-test',
          },
          {
            sceneId: 'scene-2',
            source: 'stock-pexels',
            assetPath: 'https://example.com/stock.mp4',
            duration: 2,
            assetType: 'video',
            motionStrategy: 'none',
            motionApplied: false,
          },
        ],
        totalAssets: 2,
        fromUserFootage: 0,
        fromStock: 1,
        fallbacks: 0,
        fromGenerated: 1,
        totalGenerationCost: 0,
      },
      render: {
        outputPath: renderPath,
        outputMetadataPath: renderMetadataPath,
      },
      qualitySummaryPath,
      createdAt: '2026-05-02T00:00:00.000Z',
    });

    expect(ledger.summary).toEqual(
      expect.objectContaining({
        assetCount: 10,
        generatedCount: 9,
        externalCount: 1,
        needsReviewCount: 1,
        audioCount: 1,
      })
    );
    expect(ledger.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetId: 'audio:voiceover',
          contentIdRisk: 'none-known',
          fileHash: expect.stringMatching(/^sha256:/),
        }),
        expect.objectContaining({
          assetId: 'visual:scene-1',
          reviewStatus: 'generated-local',
          prompt: 'abstract machine diagram',
        }),
        expect.objectContaining({
          assetId: 'visual:scene-2',
          usageMode: 'downloaded-asset',
          reviewStatus: 'needs-review',
          sourceUrl: 'https://example.com/stock.mp4',
        }),
      ])
    );
  });
});
