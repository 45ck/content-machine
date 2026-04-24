import { extname } from 'node:path';
import {
  MEDIA_INDEX_SCHEMA_VERSION,
  MediaIndexSchema,
  type MediaIndex,
  type MediaIndexItem,
  type SourceMediaAnalysisOutput,
} from '../domain';

export interface MediaIndexInputItem {
  path: string;
  category?: string | null;
  tags?: string[];
  transcriptPath?: string | null;
  metadata?: Record<string, unknown>;
  analysis?: SourceMediaAnalysisOutput | null;
  indexedAt?: string;
}

function typeFromPath(path: string): MediaIndexItem['type'] {
  const extension = extname(path).toLowerCase();
  if (['.mp4', '.mov', '.mkv', '.webm'].includes(extension)) return 'video';
  if (['.wav', '.mp3', '.m4a', '.aac', '.flac'].includes(extension)) return 'audio';
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) return 'image';
  return 'unknown';
}

function itemFromInput(input: MediaIndexInputItem): MediaIndexItem {
  const probe = input.analysis?.probe;
  const type = probe?.hasVideo ? 'video' : probe?.hasAudio ? 'audio' : typeFromPath(input.path);

  return {
    path: input.path,
    type,
    category: input.category ?? null,
    durationSeconds: probe?.durationSeconds ?? null,
    width: probe?.width ?? null,
    height: probe?.height ?? null,
    fps: probe?.fps ?? null,
    orientation: probe?.orientation ?? 'unknown',
    hasAudio: probe?.hasAudio ?? type === 'audio',
    hasVideo: probe?.hasVideo ?? type === 'video',
    tags: input.tags ?? [],
    transcriptPath: input.transcriptPath ?? null,
    metadata: input.metadata ?? {},
    indexedAt: input.indexedAt ?? new Date().toISOString(),
  };
}

export function buildMediaIndex(
  items: MediaIndexInputItem[],
  existing?: MediaIndex | null
): MediaIndex {
  const byPath = new Map<string, MediaIndexItem>();
  for (const item of existing?.items ?? []) byPath.set(item.path, item);
  for (const item of items) byPath.set(item.path, itemFromInput(item));

  return MediaIndexSchema.parse({
    schemaVersion: MEDIA_INDEX_SCHEMA_VERSION,
    items: [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path)),
    warnings: [],
  });
}
