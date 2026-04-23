import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { AudioOutputSchema, ScriptOutputSchema, type AudioOutput } from '../domain';
import { generateAudio } from '../audio/pipeline';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';

export const ScriptToAudioRequestSchema = z
  .object({
    scriptPath: z.string().min(1),
    voice: z.string().min(1).default('af_heart'),
    outputDir: z.string().min(1).optional(),
    outputPath: z.string().min(1).optional(),
    timestampsPath: z.string().min(1).optional(),
    outputMetadataPath: z.string().min(1).optional(),
    ttsEngine: z.enum(['kokoro', 'elevenlabs']).optional(),
    asrEngine: z.enum(['whisper', 'gemini', 'elevenlabs-forced-alignment']).optional(),
    speed: z.number().positive().optional(),
    ttsSpeed: z.number().positive().optional(),
    mock: z.boolean().default(false),
    requireWhisper: z.boolean().default(false),
    whisperModel: z.enum(['tiny', 'base', 'small', 'medium', 'large']).optional(),
    reconcile: z.boolean().default(false),
  })
  .strict();

export type ScriptToAudioRequest = z.input<typeof ScriptToAudioRequestSchema>;

/** Generate audio and timestamps artifacts from an existing script artifact. */
export async function runScriptToAudio(request: ScriptToAudioRequest): Promise<
  HarnessToolResult<{
    audioPath: string;
    timestampsPath: string;
    outputMetadataPath: string;
    duration: number;
    wordCount: number;
    voice: string;
    ttsEngine: string;
    asrEngine: string;
  }>
> {
  const normalized = ScriptToAudioRequestSchema.parse(request);
  const script = await readJsonArtifact(
    normalized.scriptPath,
    ScriptOutputSchema,
    'script artifact'
  );
  const outputDir = resolve(normalized.outputDir ?? 'output/content-machine/audio');
  const audioPath = resolve(normalized.outputPath ?? join(outputDir, 'audio.wav'));

  const timestampsPath = resolve(
    normalized.timestampsPath ?? join(dirname(audioPath), 'timestamps.json')
  );
  const outputMetadataPath = resolve(
    normalized.outputMetadataPath ?? join(dirname(audioPath), 'audio.json')
  );

  const audioOutput: AudioOutput = AudioOutputSchema.parse(
    await generateAudio({
      script,
      voice: normalized.voice,
      ttsEngine: normalized.ttsEngine,
      asrEngine: normalized.asrEngine,
      speed: normalized.speed ?? normalized.ttsSpeed,
      outputPath: audioPath,
      timestampsPath,
      mock: normalized.mock,
      requireWhisper: normalized.requireWhisper,
      whisperModel: normalized.whisperModel,
      reconcile: normalized.reconcile,
    })
  );

  await writeJsonArtifact(outputMetadataPath, audioOutput);

  return {
    result: {
      audioPath: audioOutput.audioPath,
      timestampsPath: audioOutput.timestampsPath,
      outputMetadataPath,
      duration: audioOutput.duration,
      wordCount: audioOutput.wordCount,
      voice: audioOutput.voice,
      ttsEngine: audioOutput.timestamps.ttsEngine,
      asrEngine: audioOutput.timestamps.asrEngine,
    },
    artifacts: [
      artifactFile(audioOutput.audioPath, 'Generated audio artifact'),
      artifactFile(audioOutput.timestampsPath, 'Generated timestamps artifact'),
      artifactFile(outputMetadataPath, 'Audio stage metadata artifact'),
      ...(audioOutput.audioMixPath
        ? [artifactFile(audioOutput.audioMixPath, 'Generated audio mix artifact')]
        : []),
    ],
  };
}
