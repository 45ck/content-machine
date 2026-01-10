/**
 * Render Audio Mix Resolution Tests
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, basename, relative } from 'path';
import type { AudioMixOutput } from '../audio/mix/schema';
import { prepareAudioMixForRender } from './audio-mix';

describe('prepareAudioMixForRender', () => {
  const tempDir = join(process.cwd(), 'tests', '.tmp', 'audio-mix');

  beforeEach(() => {
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should drop missing assets and keep remote sources', () => {
    const localFile = join(tempDir, 'bed.wav');
    writeFileSync(localFile, Buffer.from('fake'));

    const mix: AudioMixOutput = {
      schemaVersion: '1.0.0',
      voicePath: 'audio.wav',
      totalDuration: 2.5,
      layers: [
        {
          type: 'music',
          path: 'bed.wav',
          start: 0,
          end: 2.5,
        },
        {
          type: 'sfx',
          path: 'missing.wav',
          start: 0.8,
          duration: 0.3,
        },
        {
          type: 'ambience',
          path: 'https://cdn.example.com/ambience.mp3',
          start: 0,
          end: 2.5,
        },
      ],
      warnings: [],
    };

    const result = prepareAudioMixForRender({
      mix,
      audioPath: 'audio.wav',
      mixBaseDir: tempDir,
    });

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].destPath).toBe(`audio/music/${basename(localFile)}`);
    expect(result.mix.layers).toHaveLength(2);
    expect(result.mix.layers.some((layer) => layer.path.includes('ambience.mp3'))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('missing.wav'))).toBe(true);
  });

  it('should resolve assets relative to cwd when mixBaseDir misses them', () => {
    const cwdAssetDir = join(tempDir, 'cwd-assets');
    mkdirSync(cwdAssetDir, { recursive: true });
    const localFile = join(cwdAssetDir, 'bed.wav');
    writeFileSync(localFile, Buffer.from('fake'));

    const relativePath = relative(process.cwd(), localFile);
    const mix: AudioMixOutput = {
      schemaVersion: '1.0.0',
      voicePath: 'audio.wav',
      totalDuration: 1.2,
      layers: [
        {
          type: 'music',
          path: relativePath,
          start: 0,
          end: 1.2,
        },
      ],
      warnings: [],
    };

    const result = prepareAudioMixForRender({
      mix,
      audioPath: 'audio.wav',
      mixBaseDir: join(tempDir, 'base'),
    });

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].sourcePath).toBe(localFile);
  });

  it('should create unique bundle paths for duplicate basenames', () => {
    const dirA = join(tempDir, 'sfx-a');
    const dirB = join(tempDir, 'sfx-b');
    mkdirSync(dirA, { recursive: true });
    mkdirSync(dirB, { recursive: true });

    const fileA = join(dirA, 'hit.wav');
    const fileB = join(dirB, 'hit.wav');
    writeFileSync(fileA, Buffer.from('a'));
    writeFileSync(fileB, Buffer.from('b'));

    const mix: AudioMixOutput = {
      schemaVersion: '1.0.0',
      voicePath: 'audio.wav',
      totalDuration: 1.0,
      layers: [
        {
          type: 'sfx',
          path: join('sfx-a', 'hit.wav'),
          start: 0.1,
          duration: 0.2,
        },
        {
          type: 'sfx',
          path: join('sfx-b', 'hit.wav'),
          start: 0.6,
          duration: 0.2,
        },
      ],
      warnings: [],
    };

    const result = prepareAudioMixForRender({
      mix,
      audioPath: 'audio.wav',
      mixBaseDir: tempDir,
    });

    expect(result.assets).toHaveLength(2);
    const destPaths = result.assets.map((asset) => asset.destPath);
    expect(new Set(destPaths).size).toBe(destPaths.length);
    const layerPaths = result.mix.layers.map((layer) => layer.path);
    expect(new Set(layerPaths).size).toBe(layerPaths.length);
  });
});
