import { GoogleVeoAdapter } from './adapters/google-veo';
import { OpenAISoraAdapter } from './adapters/openai-sora';
import { SeedanceBytePlusAdapter } from './adapters/seedance-byteplus';
import { Scene3dStaticAdapter } from './adapters/scene3d-static';
import { StaticVideoSynthesisAdapter } from './adapters/static-video';
import type { MediaSynthesisAdapter } from './types';

interface CreateRegistryOptions {
  ffmpegPath?: string;
  includeExperimentalCloudAdapters?: boolean;
}

/**
 * Build the synthesis adapter registry for the current runtime.
 *
 * Cloud adapters are opt-in through environment variables and are appended
 * after the always-available local `static-video` adapter.
 */
export function createMediaSynthesisRegistry(
  options: CreateRegistryOptions = {}
): MediaSynthesisAdapter[] {
  const adapters: MediaSynthesisAdapter[] = [
    new StaticVideoSynthesisAdapter({ ffmpegPath: options.ffmpegPath }),
    new Scene3dStaticAdapter({ ffmpegPath: options.ffmpegPath }),
  ];

  const includeCloud = options.includeExperimentalCloudAdapters ?? true;
  if (!includeCloud) return adapters;

  if (process.env.OPENAI_API_KEY) {
    adapters.push(
      new OpenAISoraAdapter({
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.CM_MEDIA_SORA_ENDPOINT,
        model: process.env.CM_MEDIA_SORA_MODEL,
      })
    );
  }

  const googleApiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (googleApiKey && process.env.CM_MEDIA_VEO_ENDPOINT) {
    adapters.push(
      new GoogleVeoAdapter({
        apiKey: googleApiKey,
        endpoint: process.env.CM_MEDIA_VEO_ENDPOINT,
        model: process.env.CM_MEDIA_VEO_MODEL,
      })
    );
  } else if (process.env.GOOGLE_CLOUD_PROJECT) {
    adapters.push(
      new GoogleVeoAdapter({
        vertexProject: process.env.GOOGLE_CLOUD_PROJECT,
        vertexLocation: process.env.GOOGLE_CLOUD_LOCATION,
        accessToken: process.env.GOOGLE_CLOUD_ACCESS_TOKEN,
        model: process.env.CM_MEDIA_VEO_MODEL,
      })
    );
  }

  if (process.env.BYTEPLUS_API_KEY && process.env.CM_MEDIA_SEEDANCE_ENDPOINT) {
    adapters.push(
      new SeedanceBytePlusAdapter({
        apiKey: process.env.BYTEPLUS_API_KEY,
        endpoint: process.env.CM_MEDIA_SEEDANCE_ENDPOINT,
        model: process.env.CM_MEDIA_SEEDANCE_MODEL,
      })
    );
  }

  return adapters;
}
