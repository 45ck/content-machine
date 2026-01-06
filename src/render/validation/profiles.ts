import type { ValidationProfile, ValidationProfileName } from './types';

export const VALIDATION_PROFILES: Record<ValidationProfileName, ValidationProfile> = {
  portrait: {
    name: 'portrait',
    expectedWidth: 1080,
    expectedHeight: 1920,
    minDurationSeconds: 15,
    maxDurationSeconds: 60,
    expectedContainer: 'mp4',
    expectedVideoCodec: 'h264',
    expectedAudioCodec: 'aac',
    expectedFps: 30,
    brisqueMax: 40,
  },
  landscape: {
    name: 'landscape',
    expectedWidth: 1920,
    expectedHeight: 1080,
    minDurationSeconds: 60,
    maxDurationSeconds: 600,
    expectedContainer: 'mp4',
    expectedVideoCodec: 'h264',
    expectedAudioCodec: 'aac',
    expectedFps: 30,
    brisqueMax: 35,
  },
};
