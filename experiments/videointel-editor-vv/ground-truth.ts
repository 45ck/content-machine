/**
 * Ground-truth interfaces for the editor V&V experiment.
 *
 * Manifests declare the exact structure of composed test videos so that
 * pipeline outputs can be compared against known expectations.
 */

/* ------------------------------------------------------------------ */
/*  Ground truth                                                       */
/* ------------------------------------------------------------------ */

export interface ComparisonTolerances {
  /** Acceptable drift for total duration (seconds). Default: 0.5 */
  durationSeconds: number;
  /** Acceptable drift per cut-point (seconds). Default: 1.0 */
  cutPointSeconds: number;
  /** Acceptable delta for scene count. Default: 1 */
  sceneCountDelta: number;
}

export const DEFAULT_TOLERANCES: ComparisonTolerances = {
  durationSeconds: 0.5,
  cutPointSeconds: 1.0,
  sceneCountDelta: 1,
};

export interface EditorVVGroundTruth {
  totalDuration: number;
  sceneCount: number;
  /** Scene boundary times in seconds. */
  cutPoints: number[];
  hasVoiceover: boolean;
  hasMusic: boolean;
  hasCaptions: boolean;
  /** Substrings OCR should detect in the captions. */
  expectedCaptionTexts?: string[];
  expectedPacing: 'very_fast' | 'fast' | 'moderate' | 'slow';
  /** Only asserted when deterministic (e.g. listicle with list-like structure). */
  expectedArchetype?: string;
  expectedFormat?: string;
  tolerances?: Partial<ComparisonTolerances>;
}

/* ------------------------------------------------------------------ */
/*  FFmpeg segment definition                                          */
/* ------------------------------------------------------------------ */

export interface FfmpegSegmentVideo {
  type: 'color';
  color: string;
  size: string;
}

export interface FfmpegSegmentDrawtext {
  text: string;
  fontsize: number;
  fontcolor: string;
  x: string;
  y: string;
}

export type FfmpegSegmentAudio = { type: 'sine'; frequency: number } | { type: 'silence' };

export interface FfmpegSegment {
  duration: number;
  video: FfmpegSegmentVideo;
  drawtext?: FfmpegSegmentDrawtext;
  audio: FfmpegSegmentAudio;
}

/* ------------------------------------------------------------------ */
/*  Manifest                                                           */
/* ------------------------------------------------------------------ */

export interface EditorVVManifest {
  name: string;
  description: string;
  tier: 'ffmpeg' | 'mlt';
  resolution: { width: number; height: number };
  fps: number;
  /** Tier 1 (FFmpeg-composed) segments. */
  segments?: FfmpegSegment[];
  /** Tier 2 (MLT XML) project path. */
  mltXmlPath?: string;
  groundTruth: EditorVVGroundTruth;
}
