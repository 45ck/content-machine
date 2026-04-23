import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DEFAULT_ARTIFACT_FILENAMES } from '../../domain/repo-facts.generated';

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

export interface DiscoveredArtifacts {
  artifactsDir: string;
  videoPath: string | null;
  scriptPath: string | null;
  timestampsPath: string | null;
  visualsPath: string | null;
  scorePath: string | null;
  syncReportPath: string | null;
  captionReportPath: string | null;
}

function pickFirstExisting(dir: string, names: string[], candidates: string[]): string | null {
  for (const name of names) {
    if (candidates.includes(name)) return join(dir, name);
  }
  return null;
}

/**
 * Discover well-known pipeline artifacts under an artifacts directory.
 */
export async function discoverArtifacts(artifactsDirInput: string): Promise<DiscoveredArtifacts> {
  const artifactsDir = resolve(artifactsDirInput);
  const candidates = await readdir(artifactsDir).catch(() => [] as string[]);

  const scriptPath = (await fileExists(join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.script)))
    ? join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.script)
    : null;
  const timestampsPath = (await fileExists(
    join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.timestamps)
  ))
    ? join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.timestamps)
    : null;
  const visualsPath = (await fileExists(join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.visuals)))
    ? join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.visuals)
    : null;
  const scorePath = (await fileExists(join(artifactsDir, 'score.json')))
    ? join(artifactsDir, 'score.json')
    : null;

  const syncReportPath = pickFirstExisting(
    artifactsDir,
    ['sync-report.json', 'sync-report-attempt1.json'],
    candidates
  );
  const captionReportPath = pickFirstExisting(
    artifactsDir,
    ['caption-report.json', 'caption-report-attempt1.json', 'caption-quality.json'],
    candidates
  );

  const explicitVideoPath = (await fileExists(join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.video)))
    ? join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.video)
    : null;

  const anyMp4 = explicitVideoPath
    ? explicitVideoPath
    : candidates.find((n) => n.toLowerCase().endsWith('.mp4'))
      ? join(artifactsDir, candidates.find((n) => n.toLowerCase().endsWith('.mp4')) as string)
      : null;

  return {
    artifactsDir,
    videoPath: anyMp4,
    scriptPath,
    timestampsPath,
    visualsPath,
    scorePath,
    syncReportPath,
    captionReportPath,
  };
}
