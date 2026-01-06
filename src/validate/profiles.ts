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
  },
};

export function getValidateProfile(profileId: ValidateProfileId): ValidateProfile {
  return VALIDATE_PROFILES[profileId];
}

export function isValidateProfileId(value: string): value is ValidateProfileId {
  return value === 'portrait' || value === 'landscape';
}
