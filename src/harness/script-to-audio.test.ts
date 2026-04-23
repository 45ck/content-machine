import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { writeJsonArtifact } from './artifacts';
import { runScriptToAudio } from './script-to-audio';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cm-harness-audio-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('runScriptToAudio', () => {
  it('writes audio metadata alongside mock audio and timestamps', async () => {
    const dir = await makeTempDir();
    const scriptPath = join(dir, 'script.json');
    const outputPath = join(dir, 'nested', 'audio', 'audio.wav');

    await writeJsonArtifact(scriptPath, {
      schemaVersion: '1.0.0',
      reasoning: 'test',
      hook: 'Hook line',
      cta: 'Call to action',
      scenes: [{ id: 'scene-1', text: 'First scene text', visualDirection: 'visual' }],
    });

    const result = await runScriptToAudio({
      scriptPath,
      voice: 'mock-voice',
      outputPath,
      mock: true,
    });

    expect(result.result.audioPath).toBe(outputPath);
    expect(result.result.timestampsPath).toBe(join(dir, 'nested', 'audio', 'timestamps.json'));
    expect(result.result.outputMetadataPath).toBe(join(dir, 'nested', 'audio', 'audio.json'));
    expect(result.result.wordCount).toBeGreaterThan(0);

    const metadata = JSON.parse(
      await readFile(join(dir, 'nested', 'audio', 'audio.json'), 'utf8')
    ) as {
      audioPath: string;
      timestampsPath: string;
      voice: string;
    };
    expect(metadata.audioPath).toBe(outputPath);
    expect(metadata.timestampsPath).toBe(join(dir, 'nested', 'audio', 'timestamps.json'));
    expect(metadata.voice).toBe('mock-voice');
  });
});
