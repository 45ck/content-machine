/**
 * Dependency checker for the editor V&V experiment.
 *
 * Probes external binaries and reports availability so the runner
 * can decide which checks to run and which to skip.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveFfmpegPath, resolveFfprobePath } from '../../src/core/video/ffmpeg';

const execFileAsync = promisify(execFile);

export interface DepStatus {
  available: boolean;
  version?: string;
}

export interface DependencyReport {
  ffmpeg: DepStatus;
  ffprobe: DepStatus;
  pyscenedetect: DepStatus;
  whisper: DepStatus;
  tesseract: DepStatus;
  melt: DepStatus;
}

async function probe(binary: string, args: string[]): Promise<DepStatus> {
  try {
    const { stdout, stderr } = await execFileAsync(binary, args, {
      timeout: 10_000,
      windowsHide: true,
    });
    const version = (stdout || stderr || '').toString().split('\n')[0].trim();
    return { available: true, version };
  } catch {
    return { available: false };
  }
}

export async function checkDependencies(): Promise<DependencyReport> {
  const [ffmpeg, ffprobe, pyscenedetect, whisper, tesseract, melt] = await Promise.all([
    probe(resolveFfmpegPath(), ['-version']),
    probe(resolveFfprobePath(), ['-version']),
    probe('scenedetect', ['--version']),
    probe('whisper', ['--help']),
    probe('tesseract', ['--version']),
    probe('melt', ['-version']),
  ]);

  return { ffmpeg, ffprobe, pyscenedetect, whisper, tesseract, melt };
}

export function printDependencyReport(report: DependencyReport): void {
  console.log('\n  Dependencies:');
  const entries = Object.entries(report) as [keyof DependencyReport, DepStatus][];
  for (const [name, status] of entries) {
    const icon = status.available ? '\u2713' : '\u2717';
    const ver = status.version ? ` (${status.version})` : '';
    console.log(`    ${icon} ${name}${ver}`);
  }
}

/**
 * Returns true if ffmpeg + ffprobe are available (minimum for Tier 1).
 */
export function hasFatalDeps(report: DependencyReport): boolean {
  return report.ffmpeg.available && report.ffprobe.available;
}
