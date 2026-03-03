/**
 * Visuals importer
 *
 * Builds visuals.json from local footage and timestamps.
 */
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { CMError } from '../core/errors';
import {
  VISUALS_SCHEMA_VERSION,
  VisualsOutputSchema,
  type SceneTimestamp,
  type TimestampsOutput,
  type VisualAssetInput,
  type VisualsOutput,
} from '../domain';

export type VisualImportMode = 'sequence' | 'loop' | 'map';

export interface ImportVisualsOptions {
  timestamps: TimestampsOutput;
  clips: string[];
  mode?: VisualImportMode;
  sceneMap?: Record<string, string>;
}

const MIN_CLIP_SIZE_BYTES = 8 * 1024;

function ensureScenes(timestamps: TimestampsOutput): SceneTimestamp[] {
  const scenes = timestamps.scenes ?? [];
  if (scenes.length > 0) return scenes;

  return [
    {
      sceneId: 'scene-001',
      audioStart: 0,
      audioEnd: timestamps.totalDuration,
      words: timestamps.allWords ?? [],
    },
  ];
}

function normalizeClipPath(path: string): string {
  return resolve(path);
}

function validateClipPath(path: string): void {
  if (!existsSync(path)) {
    throw new CMError('FILE_NOT_FOUND', `Clip not found: ${path}`, {
      path,
      fix: 'Provide a valid clip path or update your import mapping',
    });
  }

  let stats;
  try {
    stats = statSync(path);
  } catch (error) {
    throw new CMError(
      'INVALID_MEDIA',
      `Unable to read clip file: ${path}`,
      {
        path,
        fix: 'Ensure the clip file exists and is readable',
      },
      error instanceof Error ? error : undefined
    );
  }

  if (!stats.isFile()) {
    throw new CMError('INVALID_MEDIA', `Clip path is not a file: ${path}`, {
      path,
      fix: 'Provide a clip file path (not a directory)',
    });
  }

  if (stats.size < MIN_CLIP_SIZE_BYTES) {
    throw new CMError('INVALID_MEDIA', `Clip file is too small to be a valid video: ${path}`, {
      path,
      sizeBytes: stats.size,
      fix: 'Use a real video file (not a placeholder) or transcode with ffmpeg',
    });
  }
}

function resolveClipAssignments(params: {
  scenes: SceneTimestamp[];
  clips: string[];
  mode: VisualImportMode;
  sceneMap?: Record<string, string>;
}): string[] {
  const { scenes, clips, mode, sceneMap } = params;

  if (mode === 'map') {
    if (!sceneMap || Object.keys(sceneMap).length === 0) {
      throw new CMError('INVALID_ARGUMENT', 'Map mode requires --map with sceneId -> clip path', {
        fix: 'Provide --map mapping.json with sceneId -> clip path entries',
      });
    }

    return scenes.map((scene) => {
      const mapped = sceneMap[scene.sceneId];
      if (!mapped) {
        throw new CMError(
          'INVALID_ARGUMENT',
          `No clip mapping provided for scene ${scene.sceneId}`,
          {
            sceneId: scene.sceneId,
            fix: 'Add the missing sceneId to your mapping file',
          }
        );
      }
      return mapped;
    });
  }

  if (clips.length === 0) {
    throw new CMError('INVALID_ARGUMENT', 'No clips provided for import', {
      fix: 'Use --clips <dir|glob> or --clip <path>',
    });
  }

  return scenes.map((_, index) => {
    if (mode === 'loop') {
      return clips[index % clips.length];
    }
    return clips[Math.min(index, clips.length - 1)];
  });
}

export function importVisualsFromClips(options: ImportVisualsOptions): VisualsOutput {
  const scenes = ensureScenes(options.timestamps);
  const mode = options.mode ?? 'sequence';

  const assignments = resolveClipAssignments({
    scenes,
    clips: options.clips,
    mode,
    sceneMap: options.sceneMap,
  });

  const normalizedAssignments = assignments.map(normalizeClipPath);
  normalizedAssignments.forEach(validateClipPath);

  const visualAssets: VisualAssetInput[] = scenes.map((scene, index) => {
    const duration = scene.audioEnd - scene.audioStart;
    if (duration <= 0) {
      throw new CMError('INVALID_ARGUMENT', `Scene duration must be positive: ${scene.sceneId}`, {
        sceneId: scene.sceneId,
        audioStart: scene.audioStart,
        audioEnd: scene.audioEnd,
        fix: 'Check your timestamps.json for zero-length scenes',
      });
    }
    return {
      sceneId: scene.sceneId,
      source: 'user-footage',
      assetPath: normalizedAssignments[index],
      duration,
    };
  });

  const output = {
    schemaVersion: VISUALS_SCHEMA_VERSION,
    scenes: visualAssets,
    totalAssets: visualAssets.length,
    fromUserFootage: visualAssets.length,
    fromStock: 0,
    fallbacks: 0,
    fromGenerated: 0,
    totalDuration: options.timestamps.totalDuration,
  };

  return VisualsOutputSchema.parse(output);
}
