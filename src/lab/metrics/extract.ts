import { readFile } from 'node:fs/promises';
import { ScoreOutputSchema } from '../../domain';
import type { LabAutoMetricsSummary } from '../../domain';

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
      const raw = (await parseJson(params.syncReportPath)) as any;
      const rating = typeof raw.rating === 'number' ? raw.rating : null;
      summary.syncRating = typeof rating === 'number' ? round0to100(rating) : null;
      summary.syncLabel = typeof raw.ratingLabel === 'string' ? raw.ratingLabel : null;
      const metrics = raw.metrics as any;
      summary.meanDriftMs =
        metrics && typeof metrics.meanDriftMs === 'number' ? metrics.meanDriftMs : null;
      summary.maxDriftMs =
        metrics && typeof metrics.maxDriftMs === 'number' ? metrics.maxDriftMs : null;
    } catch {
      // ignore
    }
  }

  if (params.captionReportPath) {
    try {
      const raw = (await parseJson(params.captionReportPath)) as any;
      // Caption report is produced by sync-rater and contains captionQuality.overall.score (0..1).
      const overall = raw?.captionQuality?.overall?.score;
      if (typeof overall === 'number') {
        summary.captionOverall = round0to100(overall * 100);
      }
      const coverage = raw?.captionQuality?.coverage?.coverageRatio;
      summary.captionCoverageRatio = typeof coverage === 'number' ? coverage : null;
      const ocrMean = raw?.captionQuality?.ocrConfidence?.mean;
      summary.ocrConfidenceMean = typeof ocrMean === 'number' ? ocrMean : null;
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
