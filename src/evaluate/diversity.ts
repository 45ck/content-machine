import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from '../validate/python-json';
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { DiversityResult } from '../domain';

export interface DiversityAnalyzer {
  analyze(videos: string[]): Promise<DiversityResult>;
}

interface EmbeddingResult {
  framesProcessed: number;
  embeddingDim: number;
  outputPath: string;
  method: string;
}

function parseEmbeddingJson(data: unknown): EmbeddingResult {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid embedding JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;
  const framesProcessed = Number(obj['framesProcessed']);
  const embeddingDim = Number(obj['embeddingDim']);
  const outputPath = String(obj['outputPath'] ?? '');
  const method = String(obj['method'] ?? 'unknown');

  if (![framesProcessed, embeddingDim].every((n) => Number.isFinite(n))) {
    throw new CMError('VALIDATION_ERROR', 'Invalid embedding JSON (non-numeric fields)');
  }

  return { framesProcessed, embeddingDim, outputPath, method };
}

function loadNpyEmbeddings(npyPath: string): number[][] {
  // Simple .npy parser for basic float32/float64 arrays
  // Format: magic (6 bytes) + version (2 bytes) + header_len (2 bytes) + header + data
  const buffer = readFileSync(npyPath);

  // Check magic bytes (0x93, 'N', 'U', 'M', 'P', 'Y')
  if (
    buffer[0] !== 0x93 ||
    buffer[1] !== 0x4e ||
    buffer[2] !== 0x55 ||
    buffer[3] !== 0x4d ||
    buffer[4] !== 0x50 ||
    buffer[5] !== 0x59
  ) {
    throw new CMError('VALIDATION_ERROR', 'Invalid .npy file format');
  }

  // Read header length (little-endian uint16 at offset 8)
  const headerLen = buffer.readUInt16LE(8);
  const headerStart = 10;
  const headerEnd = headerStart + headerLen;
  const header = buffer.toString('ascii', headerStart, headerEnd);

  // Parse shape and dtype from header
  const shapeMatch = header.match(/'shape':\s*\((\d+),\s*(\d+)\)/);
  const dtypeMatch = header.match(/'descr':\s*'([<>|=])([fiu])(\d+)'/);

  if (!shapeMatch || !dtypeMatch) {
    throw new CMError('VALIDATION_ERROR', 'Could not parse .npy header');
  }

  const rows = parseInt(shapeMatch[1], 10);
  const cols = parseInt(shapeMatch[2], 10);
  const dtype = dtypeMatch[2];
  const bytesPerElement = parseInt(dtypeMatch[3], 10) / 8;

  if (dtype !== 'f') {
    throw new CMError('VALIDATION_ERROR', 'Only float dtypes supported in .npy parser');
  }

  // Read data
  const dataStart = headerEnd;
  const embeddings: number[][] = [];

  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      const offset = Math.floor(dataStart + (i * cols + j) * bytesPerElement);
      const value =
        bytesPerElement === 4 ? buffer.readFloatLE(offset) : buffer.readDoubleLE(offset);
      row.push(value);
    }
    embeddings.push(row);
  }

  return embeddings;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new CMError('VALIDATION_ERROR', 'Vector dimension mismatch');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dotProduct / denom : 0;
}

function computePairwiseSimilarities(videoEmbeddings: Map<string, number[][]>): DiversityResult {
  const videos = Array.from(videoEmbeddings.keys());
  const pairwiseSimilarities: Array<{ videoA: string; videoB: string; similarity: number }> = [];
  const nearDuplicates: Array<{ videoA: string; videoB: string; similarity: number }> = [];

  for (let i = 0; i < videos.length; i++) {
    for (let j = i + 1; j < videos.length; j++) {
      const videoA = videos[i];
      const videoB = videos[j];
      const embeddingsA = videoEmbeddings.get(videoA)!;
      const embeddingsB = videoEmbeddings.get(videoB)!;

      // Compute max cosine similarity between all frame pairs
      let maxSim = -1;
      for (const frameA of embeddingsA) {
        for (const frameB of embeddingsB) {
          const sim = cosineSimilarity(frameA, frameB);
          maxSim = Math.max(maxSim, sim);
        }
      }

      pairwiseSimilarities.push({ videoA, videoB, similarity: maxSim });

      if (maxSim > 0.95) {
        nearDuplicates.push({ videoA, videoB, similarity: maxSim });
      }
    }
  }

  const meanSimilarity =
    pairwiseSimilarities.length > 0
      ? pairwiseSimilarities.reduce((sum, p) => sum + p.similarity, 0) / pairwiseSimilarities.length
      : 0;

  // Diversity score: 1 - mean similarity (higher = more diverse)
  const diversityScore = Math.max(0, Math.min(1, 1 - meanSimilarity));

  return {
    pairwiseSimilarities,
    nearDuplicates,
    meanSimilarity,
    diversityScore,
  };
}

/** Analyzes visual diversity across a set of videos using CLIP embeddings and pairwise cosine similarity. */
export class ClipDiversityAnalyzer implements DiversityAnalyzer {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;
  readonly maxFrames: number;

  constructor(options?: {
    pythonPath?: string;
    scriptPath?: string;
    timeoutMs?: number;
    maxFrames?: number;
  }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath =
      options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'clip_embeddings.py');
    this.timeoutMs = options?.timeoutMs ?? 120_000;
    this.maxFrames = options?.maxFrames ?? 8;
  }

  async analyze(videos: string[]): Promise<DiversityResult> {
    if (videos.length === 0) {
      return {
        pairwiseSimilarities: [],
        nearDuplicates: [],
        meanSimilarity: 0,
        diversityScore: 1,
      };
    }

    if (videos.length === 1) {
      return {
        pairwiseSimilarities: [],
        nearDuplicates: [],
        meanSimilarity: 0,
        diversityScore: 1,
      };
    }

    const videoEmbeddings = new Map<string, number[][]>();
    const tempFiles: string[] = [];

    try {
      // Extract embeddings for each video
      for (const videoPath of videos) {
        const outputPath = resolve(
          tmpdir(),
          `embeddings_${Date.now()}_${Math.random().toString(36).slice(2)}.npy`
        );
        tempFiles.push(outputPath);

        const data = await runPythonJson({
          errorCode: 'VALIDATION_ERROR',
          pythonPath: this.pythonPath,
          scriptPath: this.scriptPath,
          args: [
            '--video',
            videoPath,
            '--output',
            outputPath,
            '--max-frames',
            String(this.maxFrames),
          ],
          timeoutMs: this.timeoutMs,
        });

        const result = parseEmbeddingJson(data);
        const embeddings = loadNpyEmbeddings(result.outputPath);
        videoEmbeddings.set(videoPath, embeddings);
      }

      // Compute pairwise similarities
      return computePairwiseSimilarities(videoEmbeddings);
    } finally {
      // Clean up temp files
      for (const tempFile of tempFiles) {
        try {
          unlinkSync(tempFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}
