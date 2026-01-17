import type { CaptionQualityRatingOutput } from '../domain';

export interface BenchPaths {
  rootDir: string;
  proDir: string;
  ourDir: string;
  stressDir: string;
  resultsDir: string;
}

export interface BenchStressVariant {
  schemaVersion: '1.0.0';
  id: string;
  recipeId: string;
  recipeLabel: string;
  /**
   * Severity is an ordinal number where larger is "worse".
   * Monotonicity checks use this ordering as ground truth.
   */
  severity: number;
  /**
   * Path to the source PRO video this was derived from.
   */
  proSourcePath: string;
  /**
   * Output mp4 path for this variant.
   */
  outputPath: string;
  /**
   * A human-friendly description of how this defect is created.
   */
  description: string;
  /**
   * Recipe-specific parameters used to generate the variant.
   * Included to make stress generation deterministic and inspectable.
   */
  recipeParams?: Record<string, number>;
  /**
   * What metric should worsen with severity.
   * Uses either `captionQuality` report fields or sync report fields.
   */
  expectedMetric:
    | 'overall.score'
    | 'safeArea.score'
    | 'flicker.score'
    | 'jitter.score'
    | 'ocrConfidence.score'
    | 'sync.rating';
  /**
   * Optional error code expected to appear at high severity.
   * These come from `rateCaptionQuality().errors[].type`.
   */
  expectedErrorType?: string;
}

export interface BenchStressManifest {
  schemaVersion: '1.0.0';
  createdAt: string;
  rootDir: string;
  variants: BenchStressVariant[];
}

export interface BenchVideoScore {
  videoPath: string;
  caption: CaptionQualityRatingOutput;
}

export interface BenchDeterminismResult {
  runs: number;
  epsilon: number;
  passed: boolean;
  worstDelta: number;
  samples: Array<{
    videoPath: string;
    deltas: { overall: number; ocrConfidence: number };
  }>;
}

export interface BenchSeparationResult {
  passed: boolean;
  proCount: number;
  ourCount: number;
  metric: 'captionQuality.overall.score';
  proMedian: number;
  ourMedian: number;
  proBeatsOurRatio: number;
}

export interface BenchStressCheckResult {
  proSourcePath: string;
  recipeId: string;
  expectedMetric: BenchStressVariant['expectedMetric'];
  expectedErrorType?: string;
  spearman: number;
  effect: number;
  reversalCount: number;
  monotonicPassed: boolean;
  errorTriggered: boolean | null;
  points: Array<{ severity: number; value: number; videoPath: string }>;
}

export interface BenchReport {
  schemaVersion: '1.0.0';
  createdAt: string;
  rootDir: string;
  videos: {
    pro: Array<{ videoPath: string; overallScore: number }>;
    our: Array<{ videoPath: string; overallScore: number }>;
  };
  skipped: {
    pro: Array<{ videoPath: string; error: string }>;
    our: Array<{ videoPath: string; error: string }>;
  };
  summary: {
    passed: boolean;
    proCount: number;
    ourCount: number;
    stressCount: number;
  };
  determinism: BenchDeterminismResult;
  separation: BenchSeparationResult;
  stress: BenchStressCheckResult[];
  baseline?: {
    path: string;
    present: boolean;
    passed: boolean;
    maxRegression: number;
    worstDelta: number;
    regressed: Array<{ videoPath: string; baseline: number; current: number; delta: number }>;
  };
}
