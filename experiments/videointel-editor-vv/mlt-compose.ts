/**
 * Tier 2 stub: MLT XML composition via `melt` CLI.
 *
 * Activated when `melt` is available (bundled with Shotcut portable).
 * For now this just logs a skip message — real implementation deferred
 * until melt is installed.
 */
import type { EditorVVManifest } from './ground-truth';

/**
 * Compose an MP4 from an MLT XML project.
 *
 * @returns Absolute path to the generated MP4, or null if melt is unavailable.
 */
export async function composeFromMlt(
  _manifest: EditorVVManifest,
  _outputDir: string,
  _opts?: { verbose?: boolean }
): Promise<string | null> {
  // Tier 2 — requires melt CLI from Shotcut portable.
  // Stub: skip for now.
  return null;
}
