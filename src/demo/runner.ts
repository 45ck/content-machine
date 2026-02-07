import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { generateScript } from '../script/generator';
import { generateAudio } from '../audio/pipeline';
import { matchVisuals } from '../visuals/matcher';
import { renderVideo } from '../render/service';
import { FakeLLMProvider } from '../test/stubs/fake-llm';
import { configureMockLLMProvider } from '../test/fixtures/mock-scenes';

export interface DemoOptions {
  outputPath: string;
  topic?: string;
  durationSeconds?: number;
}

export interface DemoResult {
  outputPath: string;
  artifactsDir: string;
  scriptPath: string;
  audioPath: string;
  timestampsPath: string;
  visualsPath: string;
}

export async function runDemo(options: DemoOptions): Promise<DemoResult> {
  const outputPath = resolve(options.outputPath);
  const artifactsDir = dirname(outputPath);
  const topic = options.topic ?? 'Content Machine demo';
  const durationSeconds = options.durationSeconds ?? 20;

  await mkdir(artifactsDir, { recursive: true });

  const llm = new FakeLLMProvider();
  configureMockLLMProvider(llm, topic);
  const script = await generateScript({
    topic,
    archetype: 'listicle',
    targetDuration: durationSeconds,
    llmProvider: llm,
  });

  const scriptPath = join(artifactsDir, 'script.json');
  await writeFile(scriptPath, JSON.stringify(script, null, 2), 'utf-8');

  const audioPath = join(artifactsDir, 'audio.wav');
  const timestampsPath = join(artifactsDir, 'timestamps.json');
  const audio = await generateAudio({
    script,
    voice: 'af_heart',
    outputPath: audioPath,
    timestampsPath,
    mock: true,
  });

  const visuals = await matchVisuals({
    timestamps: audio.timestamps,
    orientation: 'portrait',
    mock: true,
  });

  const visualsPath = join(artifactsDir, 'visuals.json');
  await writeFile(visualsPath, JSON.stringify(visuals, null, 2), 'utf-8');

  await renderVideo({
    visuals,
    timestamps: audio.timestamps,
    audioPath,
    outputPath,
    orientation: 'portrait',
    fps: 30,
    mock: true,
  });

  return { outputPath, artifactsDir, scriptPath, audioPath, timestampsPath, visualsPath };
}
