/**
 * Ubiquitous Language: Validation profile id.
 *
 * Identifies the target format rules used by `cm validate`.
 *
 * @cmTerm validation-profile
 */
export type ValidateProfileId = 'portrait' | 'landscape';

export interface ValidateProfile {
  id: ValidateProfileId;
  width: number;
  height: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  container: 'mp4';
  videoCodec: 'h264';
  audioCodec: 'aac';
  brisqueMax?: number;
  niqeMax?: number;
  cambiMax?: number;
  flickerMin?: number;
  maxDuplicateFrameRatio?: number;
  loudnessMinLUFS?: number;
  loudnessMaxLUFS?: number;
  maxClippingRatio?: number;
  truePeakMaxDBFS?: number;
}

export const VALIDATE_PROFILES: Record<ValidateProfileId, ValidateProfile> = {
  portrait: {
    id: 'portrait',
    width: 1080,
    height: 1920,
    minDurationSeconds: 30,
    maxDurationSeconds: 60,
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    brisqueMax: 40,
    niqeMax: 8,
    cambiMax: 5,
    flickerMin: 0.5,
    maxDuplicateFrameRatio: 0.3,
  },
  landscape: {
    id: 'landscape',
    width: 1920,
    height: 1080,
    minDurationSeconds: 60,
    maxDurationSeconds: 600,
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    brisqueMax: 35,
    niqeMax: 7,
    cambiMax: 4,
    flickerMin: 0.5,
    maxDuplicateFrameRatio: 0.3,
  },
};

/**
 * Lookup a validation profile by id.
 */
export function getValidateProfile(profileId: ValidateProfileId): ValidateProfile {
  return VALIDATE_PROFILES[profileId];
}

/**
 * Type guard for `ValidateProfileId`.
 */
export function isValidateProfileId(value: string): value is ValidateProfileId {
  return value === 'portrait' || value === 'landscape';
}
