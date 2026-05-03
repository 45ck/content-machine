import { mkdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  BoundarySnapOutputSchema,
  HighlightApprovalOutputSchema,
  TimestampsOutputSchema,
  VisualsOutputSchema,
  type BoundarySnapOutput,
  type HighlightApprovalOutput,
  type HighlightCandidate,
  type TimestampsOutput,
  type VisualsOutput,
  type WordTimestamp,
} from '../domain';
import { execFfmpeg } from '../core/video/ffmpeg';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import {
  artifactDirectory,
  artifactFile,
  type HarnessArtifact,
  type HarnessToolResult,
} from './json-stdio';

export const LongformClipExtractRequestSchema = z
  .object({
    sourceMediaPath: z.string().min(1),
    approvalPath: z.string().min(1),
    boundarySnapPath: z.string().min(1).optional(),
    timestampsPath: z.string().min(1).optional(),
    outputDir: z.string().min(1).default('output/content-machine/longform-clips'),
    candidateIds: z.array(z.string().min(1)).optional(),
    extractVideo: z.boolean().default(true),
    extractAudio: z.boolean().default(true),
    writeTimestamps: z.boolean().default(true),
    writeVisuals: z.boolean().default(true),
    videoMode: z.enum(['copy', 'h264']).default('copy'),
    audioSampleRate: z.number().int().positive().default(48000),
    ffmpegPath: z.string().min(1).optional(),
  })
  .strict();

export type LongformClipExtractRequest = z.input<typeof LongformClipExtractRequestSchema>;

type ClipRange = {
  candidateId: string;
  start: number;
  end: number;
  duration: number;
  wordStartIndex: number;
  wordEndIndex: number;
  text: string;
};

type ExtractedClipResult = {
  candidateId: string;
  clipDir: string;
  start: number;
  end: number;
  duration: number;
  videoPath: string | null;
  audioPath: string | null;
  timestampsPath: string | null;
  visualsPath: string | null;
  planPath: string;
};

function dedupeArtifacts(artifacts: HarnessArtifact[]): HarnessArtifact[] {
  const unique = new Map<string, HarnessArtifact>();
  for (const artifact of artifacts) {
    unique.set(`${artifact.kind}:${artifact.path}`, artifact);
  }
  return [...unique.values()];
}

function formatSeconds(value: number): string {
  return Math.max(0, value).toFixed(3);
}

function requirePositiveDuration(start: number, end: number, candidateId: string): ClipRange {
  const duration = end - start;
  if (duration <= 0) {
    const error = new Error(`Candidate ${candidateId} has non-positive clip duration`);
    (error as Error & { code?: string }).code = 'INVALID_CLIP_RANGE';
    throw error;
  }

  return {
    candidateId,
    start,
    end,
    duration,
    wordStartIndex: 0,
    wordEndIndex: 0,
    text: '',
  };
}

function selectApprovedCandidates(
  approval: HighlightApprovalOutput,
  requestedIds: string[] | undefined
): HighlightCandidate[] {
  const candidateById = new Map(approval.candidates.map((candidate) => [candidate.id, candidate]));
  const ids = requestedIds?.length ? requestedIds : approval.approvedCandidateIds;
  const selected: HighlightCandidate[] = [];

  for (const id of ids) {
    const candidate = candidateById.get(id);
    if (candidate?.approval === 'approved') selected.push(candidate);
  }

  if (selected.length === 0) {
    const error = new Error('No approved candidates were available for clip extraction');
    (error as Error & { code?: string }).code = 'NO_APPROVED_CLIPS';
    throw error;
  }

  return selected;
}

function resolveClipRange(
  candidate: HighlightCandidate,
  boundarySnap: BoundarySnapOutput | null
): ClipRange {
  const snapped = boundarySnap?.candidates.find((item) => item.id === candidate.id);
  const start = snapped?.snappedStart ?? candidate.start;
  const end = snapped?.snappedEnd ?? candidate.end;
  return {
    ...requirePositiveDuration(start, end, candidate.id),
    wordStartIndex: snapped?.wordStartIndex ?? candidate.wordStartIndex,
    wordEndIndex: snapped?.wordEndIndex ?? candidate.wordEndIndex,
    text: candidate.text,
  };
}

async function writeClipVideo(params: {
  sourceMediaPath: string;
  outputPath: string;
  range: ClipRange;
  videoMode: 'copy' | 'h264';
  ffmpegPath?: string;
}): Promise<void> {
  await mkdir(dirname(params.outputPath), { recursive: true });
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-ss',
    formatSeconds(params.range.start),
    '-i',
    params.sourceMediaPath,
    '-t',
    formatSeconds(params.range.duration),
    '-map',
    '0:v:0?',
    '-map',
    '0:a:0?',
  ];

  if (params.videoMode === 'copy') {
    args.push('-c', 'copy', '-avoid_negative_ts', 'make_zero', params.outputPath);
  } else {
    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      params.outputPath
    );
  }

  await execFfmpeg(args, {
    ffmpegPath: params.ffmpegPath,
    timeoutMs: 120_000,
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf8',
    dependencyMessage: 'ffmpeg is required to extract approved longform clips',
  });
}

async function writeClipAudio(params: {
  sourceMediaPath: string;
  outputPath: string;
  range: ClipRange;
  audioSampleRate: number;
  ffmpegPath?: string;
}): Promise<void> {
  await mkdir(dirname(params.outputPath), { recursive: true });
  await execFfmpeg(
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      formatSeconds(params.range.start),
      '-i',
      params.sourceMediaPath,
      '-t',
      formatSeconds(params.range.duration),
      '-vn',
      '-ac',
      '1',
      '-ar',
      String(params.audioSampleRate),
      '-c:a',
      'pcm_s16le',
      params.outputPath,
    ],
    {
      ffmpegPath: params.ffmpegPath,
      timeoutMs: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf8',
      dependencyMessage: 'ffmpeg is required to extract approved longform clip audio',
    }
  );
}

function shiftWord(word: WordTimestamp, range: ClipRange): WordTimestamp | null {
  if (word.end <= range.start || word.start >= range.end) return null;
  const start = Math.max(0, word.start - range.start);
  const end = Math.min(range.duration, word.end - range.start);
  if (end <= start) return null;
  return {
    ...word,
    start: Number(start.toFixed(3)),
    end: Number(end.toFixed(3)),
  };
}

function buildClipTimestamps(source: TimestampsOutput, range: ClipRange): TimestampsOutput {
  const words = source.allWords
    .slice(range.wordStartIndex, range.wordEndIndex + 1)
    .map((word) => shiftWord(word, range))
    .filter((word): word is WordTimestamp => Boolean(word));

  return TimestampsOutputSchema.parse({
    schemaVersion: source.schemaVersion,
    scenes: [
      {
        sceneId: range.candidateId,
        audioStart: 0,
        audioEnd: range.duration,
        words,
      },
    ],
    allWords: words,
    totalDuration: range.duration,
    ttsEngine: source.ttsEngine,
    asrEngine: source.asrEngine,
    analysis: source.analysis,
    wordCount: words.length,
  });
}

function buildClipVisuals(params: { range: ClipRange; videoPath: string }): VisualsOutput {
  return VisualsOutputSchema.parse({
    schemaVersion: '1.1.0',
    scenes: [
      {
        sceneId: params.range.candidateId,
        source: 'user-footage',
        assetPath: params.videoPath,
        duration: params.range.duration,
        assetType: 'video',
        visualCue: params.range.text,
      },
    ],
    totalAssets: 1,
    fromUserFootage: 1,
    fromStock: 0,
    fallbacks: 0,
    fromGenerated: 0,
    totalGenerationCost: 0,
    provider: 'local',
    totalDuration: params.range.duration,
  });
}

async function assertNonEmptyFile(path: string, label: string): Promise<void> {
  const stats = await stat(path);
  if (!stats.isFile() || stats.size <= 0) {
    const error = new Error(`${label} was not written as a non-empty file: ${path}`);
    (error as Error & { code?: string }).code = 'EMPTY_CLIP_ARTIFACT';
    throw error;
  }
}

/** Extract approved longform candidate ranges into clip-local media and render-input artifacts. */
export async function runLongformClipExtract(request: LongformClipExtractRequest): Promise<
  HarnessToolResult<{
    outputDir: string;
    clipCount: number;
    clips: ExtractedClipResult[];
  }>
> {
  const normalized = LongformClipExtractRequestSchema.parse(request);
  const sourceMediaPath = resolve(normalized.sourceMediaPath);
  const outputDir = resolve(normalized.outputDir);
  const approvalPath = resolve(normalized.approvalPath);
  const approval = await readJsonArtifact(
    approvalPath,
    HighlightApprovalOutputSchema,
    'highlight approval artifact'
  );
  const boundarySnap = normalized.boundarySnapPath
    ? await readJsonArtifact(
        resolve(normalized.boundarySnapPath),
        BoundarySnapOutputSchema,
        'boundary snap artifact'
      )
    : null;
  const timestamps = normalized.timestampsPath
    ? await readJsonArtifact(
        resolve(normalized.timestampsPath),
        TimestampsOutputSchema,
        'timestamps artifact'
      )
    : null;
  const warnings: string[] = [];
  const artifacts: HarnessArtifact[] = [
    artifactDirectory(outputDir, 'Longform clip extract output directory'),
  ];
  const selected = selectApprovedCandidates(approval, normalized.candidateIds);
  const clips: ExtractedClipResult[] = [];

  for (const candidate of selected) {
    const range = resolveClipRange(candidate, boundarySnap);
    const clipDir = join(outputDir, candidate.id);
    const videoPath = normalized.extractVideo ? join(clipDir, 'clip.mp4') : null;
    const audioPath = normalized.extractAudio ? join(clipDir, 'audio.wav') : null;
    const timestampsPath =
      normalized.writeTimestamps && timestamps ? join(clipDir, 'timestamps.json') : null;
    const visualsPath = normalized.writeVisuals && videoPath ? join(clipDir, 'visuals.json') : null;
    const planPath = join(clipDir, 'clip-plan.json');

    if (videoPath) {
      await writeClipVideo({
        sourceMediaPath,
        outputPath: videoPath,
        range,
        videoMode: normalized.videoMode,
        ffmpegPath: normalized.ffmpegPath,
      });
      await assertNonEmptyFile(videoPath, 'Extracted video clip');
      artifacts.push(artifactFile(videoPath, 'Extracted approved video clip'));
    }

    if (audioPath) {
      await writeClipAudio({
        sourceMediaPath,
        outputPath: audioPath,
        range,
        audioSampleRate: normalized.audioSampleRate,
        ffmpegPath: normalized.ffmpegPath,
      });
      await assertNonEmptyFile(audioPath, 'Extracted audio clip');
      artifacts.push(artifactFile(audioPath, 'Extracted approved audio clip'));
    }

    if (timestampsPath && timestamps) {
      await writeJsonArtifact(timestampsPath, buildClipTimestamps(timestamps, range));
      artifacts.push(artifactFile(timestampsPath, 'Clip-local timestamps artifact'));
    } else if (normalized.writeTimestamps) {
      warnings.push('timestampsPath was not provided; clip-local timestamps were not written.');
    }

    if (visualsPath && videoPath) {
      await writeJsonArtifact(visualsPath, buildClipVisuals({ range, videoPath }));
      artifacts.push(artifactFile(visualsPath, 'Clip-local visuals artifact'));
    } else if (normalized.writeVisuals) {
      warnings.push('Video extraction was disabled; clip-local visuals were not written.');
    }

    const clipResult: ExtractedClipResult = {
      candidateId: candidate.id,
      clipDir,
      start: range.start,
      end: range.end,
      duration: range.duration,
      videoPath,
      audioPath,
      timestampsPath,
      visualsPath,
      planPath,
    };
    await writeJsonArtifact(planPath, {
      schemaVersion: '1.0.0',
      sourceMediaPath,
      approvalPath,
      boundarySnapPath: normalized.boundarySnapPath ? resolve(normalized.boundarySnapPath) : null,
      candidate: {
        id: candidate.id,
        rank: candidate.rank,
        text: candidate.text,
        score: candidate.scores.total,
      },
      range,
      artifacts: {
        videoPath,
        audioPath,
        timestampsPath,
        visualsPath,
      },
      nextSteps: [
        'Run reframe-vertical or scene-aware-smart-crop if the extracted clip is not portrait-ready.',
        'Pass audioPath, timestampsPath, and visualsPath to video-render.',
        'Run publish-prep-review before calling the rendered MP4 ready.',
      ],
    });
    artifacts.push(artifactFile(planPath, 'Clip extraction plan artifact'));
    clips.push(clipResult);
  }

  return {
    result: {
      outputDir,
      clipCount: clips.length,
      clips,
    },
    artifacts: dedupeArtifacts(artifacts),
    warnings,
  };
}
