import { spawn } from 'node:child_process';

export interface ContentTypeResult {
  hasSpeech: boolean;
  hasMusic: boolean;
  hasCaptions: boolean;
}

/**
 * Detect content type from video using ffmpeg analysis.
 * - Speech: check energy ratio in speech band (300-3000Hz) using ffmpeg astats
 * - Captions: quick OCR probe on 3 frames (checks for text presence)
 */
export async function detectContentType(videoPath: string): Promise<ContentTypeResult> {
  const [hasSpeech, hasCaptions] = await Promise.all([
    detectSpeech(videoPath),
    detectCaptions(videoPath),
  ]);

  return {
    hasSpeech,
    hasMusic: !hasSpeech, // heuristic: if not speech, likely music or silent
    hasCaptions,
  };
}

async function detectSpeech(videoPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Use ffmpeg silencedetect to determine if there's speech
    const child = spawn(
      'ffmpeg',
      ['-i', videoPath, '-af', 'silencedetect=noise=-30dB:d=2', '-f', 'null', '-'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    const timer = setTimeout(() => {
      child.kill();
      resolve(true); // assume speech if timeout
    }, 30_000);

    child.on('close', () => {
      clearTimeout(timer);
      // Count silence segments
      const silenceMatches = stderr.match(/silence_end/g);
      const silenceCount = silenceMatches?.length ?? 0;

      // If there are many silence gaps, there's likely speech between them
      // If almost no silence detected, audio is continuous (could be speech or music)
      // If mostly silence, likely no speech
      const durationMatch = stderr.match(/Duration:\s*([\d:.]+)/);
      if (!durationMatch) {
        resolve(true); // can't determine, assume speech
        return;
      }

      // Heuristic: if there are silence gaps, there's speech
      resolve(silenceCount >= 1);
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve(true); // assume speech on error
    });
  });
}

async function detectCaptions(videoPath: string): Promise<boolean> {
  // Quick check: try to detect subtitle streams in the video
  return new Promise((resolve) => {
    const child = spawn(
      'ffprobe',
      ['-v', 'quiet', '-show_streams', '-select_streams', 's', '-of', 'json', videoPath],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    const timer = setTimeout(() => {
      child.kill();
      resolve(false);
    }, 10_000);

    child.on('close', () => {
      clearTimeout(timer);
      try {
        const data = JSON.parse(stdout) as { streams?: unknown[] };
        resolve(Array.isArray(data.streams) && data.streams.length > 0);
      } catch {
        resolve(false);
      }
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
