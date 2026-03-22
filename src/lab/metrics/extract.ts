import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { ScoreOutputSchema, SyncRatingOutputSchema } from '../../domain';
import type { LabAutoMetricsSummary } from '../../domain';

const CaptionReportSchema = z
  .object({
    captionQuality: z
      .object({
        overall: z.object({ score: z.number() }).passthrough().optional(),
        coverage: z.object({ coverageRatio: z.number() }).passthrough().optional(),
        ocrConfidence: z.object({ mean: z.number() }).passthrough().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

function round0to100(x: number): number {
  const clamped = Math.max(0, Math.min(100, x));
  return Math.round(clamped);
}

function parseJson(path: string): Promise<unknown> {
  return readFile(path, 'utf-8').then((t) => JSON.parse(t) as unknown);
}

export async function extractAutoMetricsSummary(params: {
  syncReportPath: string | null;
  captionReportPath: string | null;
  scorePath: string | null;
}): Promise<LabAutoMetricsSummary> {
  const summary: LabAutoMetricsSummary = {
    syncRating: null,
    captionOverall: null,
    proxyScoreOverall: null,
  };

  if (params.syncReportPath) {
    try {
      const raw = await parseJson(params.syncReportPath);
      const parsed = SyncRatingOutputSchema.safeParse(raw);
      if (parsed.success) {
        summary.syncRating = round0to100(parsed.data.rating);
        summary.syncLabel = parsed.data.ratingLabel;
        summary.meanDriftMs =
          typeof parsed.data.metrics.meanDriftMs === 'number'
            ? parsed.data.metrics.meanDriftMs
            : null;
        summary.maxDriftMs =
          typeof parsed.data.metrics.maxDriftMs === 'number'
            ? parsed.data.metrics.maxDriftMs
            : null;
      }
    } catch {
      // ignore
    }
  }

  if (params.captionReportPath) {
    try {
      const raw = await parseJson(params.captionReportPath);
      // Caption report is produced by sync-rater and contains captionQuality.overall.score (0..1).
      const parsed = CaptionReportSchema.safeParse(raw);
      if (parsed.success) {
        const overall = parsed.data.captionQuality?.overall?.score;
        if (typeof overall === 'number') {
          summary.captionOverall = round0to100(overall * 100);
        }
        const coverage = parsed.data.captionQuality?.coverage?.coverageRatio;
        summary.captionCoverageRatio = typeof coverage === 'number' ? coverage : null;
        const ocrMean = parsed.data.captionQuality?.ocrConfidence?.mean;
        summary.ocrConfidenceMean = typeof ocrMean === 'number' ? ocrMean : null;
      }
    } catch {
      // ignore
    }
  }

  if (params.scorePath) {
    try {
      const raw = await parseJson(params.scorePath);
      const parsed = ScoreOutputSchema.safeParse(raw);
      if (parsed.success) {
        summary.proxyScoreOverall = round0to100(parsed.data.overall * 100);
      }
    } catch {
      // ignore
    }
  }

  return summary;
}
