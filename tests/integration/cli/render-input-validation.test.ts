import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('cm render input validation', () => {
  it('fails fast with a Fix: hint when given a non-visuals.json input', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'render-input-validation');
    mkdirSync(outDir, { recursive: true });

    const audioPath = join(outDir, 'audio.wav');
    const timestampsPath = join(outDir, 'timestamps.json');
    const videoPath = join(outDir, 'video.mp4');

    // Minimal valid timestamps payload (enough for schema + render preflight).
    writeFileSync(
      timestampsPath,
      JSON.stringify(
        {
          schemaVersion: '1.0.0',
          allWords: [{ word: 'hi', start: 0, end: 0.1 }],
          totalDuration: 0.1,
          ttsEngine: 'mock',
          asrEngine: 'mock',
        },
        null,
        2
      ),
      'utf-8'
    );

    // Render requires an audio path; mock mode shouldn't need a real WAV.
    writeFileSync(audioPath, '', 'utf-8');

    const badVisualsPath = join(process.cwd(), 'test-fixtures', 'script.json');

    const result = await runCli(
      [
        'render',
        '--input',
        badVisualsPath,
        '--timestamps',
        timestampsPath,
        '--audio',
        audioPath,
        '--mock',
        '--output',
        videoPath,
      ],
      undefined,
      60000
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('ERROR:');
    expect(result.stderr).toContain('Fix:');
    expect(result.stderr).toContain('cm visuals');
  });
});
