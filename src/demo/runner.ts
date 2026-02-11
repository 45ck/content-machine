import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { generateScript } from '../script/generator';
import { generateAudio } from '../audio/pipeline';
import { matchVisuals } from '../visuals/matcher';
import { renderVideo } from '../render/service';
import { FakeLLMProvider } from '../test/stubs/fake-llm';
import { configureMockLLMProvider } from '../test/fixtures/mock-scenes';
import { ArchetypeIdSchema } from '../domain/ids';
import { DEFAULT_ARTIFACT_FILENAMES } from '../domain/repo-facts.generated';

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

/**
 * Run the pipeline in mock mode and write its intermediate artifacts next to the output.
 *
 * Intended for smoke testing and local demos without API keys.
 */
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
    archetype: ArchetypeIdSchema.parse('listicle'),
    targetDuration: durationSeconds,
    llmProvider: llm,
  });

  const scriptPath = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.script);
  await writeFile(scriptPath, JSON.stringify(script, null, 2), 'utf-8');

  const audioPath = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.audio);
  const timestampsPath = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.timestamps);
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

  const visualsPath = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.visuals);
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
