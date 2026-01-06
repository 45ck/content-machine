export type ValidationSeverity = 'error' | 'warn';

export interface VideoInfo {
  width: number;
  height: number;
  durationSeconds: number;
  fps?: number;
  container?: string;
  videoCodec?: string;
  audioCodec?: string;
}

export type ValidationProfileName = 'portrait' | 'landscape';

export interface ValidationProfile {
  name: ValidationProfileName;
  expectedWidth: number;
  expectedHeight: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  expectedContainer?: string;
  expectedVideoCodec?: string;
  expectedAudioCodec?: string;
  expectedFps?: number;
  brisqueMax?: number;
}

export type GateId = 'resolution' | 'duration' | 'format' | 'visual-quality' | 'cadence';

export interface GateResult {
  id: GateId;
  severity: ValidationSeverity;
  passed: boolean;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationReport {
  videoPath: string;
  profile: ValidationProfile;
  info: VideoInfo;
  passed: boolean;
  results: GateResult[];
}

export interface VideoInspector {
  inspect(videoPath: string): Promise<VideoInfo>;
}

export interface VideoQualitySummary {
  brisque: {
    mean: number;
    min: number;
    max: number;
  };
  framesAnalyzed: number;
}

export interface VideoQualityAnalyzer {
  analyze(videoPath: string, options?: { sampleRate?: number }): Promise<VideoQualitySummary>;
}
