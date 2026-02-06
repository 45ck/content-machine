import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

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

export async function discoverArtifacts(artifactsDirInput: string): Promise<DiscoveredArtifacts> {
  const artifactsDir = resolve(artifactsDirInput);
  const candidates = await readdir(artifactsDir).catch(() => [] as string[]);

  const scriptPath = (await fileExists(join(artifactsDir, 'script.json')))
    ? join(artifactsDir, 'script.json')
    : null;
  const timestampsPath = (await fileExists(join(artifactsDir, 'timestamps.json')))
    ? join(artifactsDir, 'timestamps.json')
    : null;
  const visualsPath = (await fileExists(join(artifactsDir, 'visuals.json')))
    ? join(artifactsDir, 'visuals.json')
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

  const explicitVideoPath = (await fileExists(join(artifactsDir, 'video.mp4')))
    ? join(artifactsDir, 'video.mp4')
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
