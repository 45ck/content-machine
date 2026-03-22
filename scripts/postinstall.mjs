/**
 * Postinstall hook: ensure platform-correct native binaries.
 *
 * On Windows, npm may install Linux-native optional deps from the lockfile.
 * This script detects the gap and reinstalls the correct binaries.
 * On non-Windows platforms this is a no-op.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { platform, arch } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function log(msg) {
  console.log(`[postinstall] ${msg}`);
}

function checkAndFixNativeBinaries() {
  const os = platform();
  const cpu = arch();

  if (os !== 'win32') return;

  const rollupPkg = `@rollup/rollup-win32-${cpu}-msvc`;
  const rollupPath = join(ROOT, 'node_modules', '@rollup', `rollup-win32-${cpu}-msvc`);

  const sharpPlatformPath = join(ROOT, 'node_modules', '@img', `sharp-win32-${cpu}`);

  const needsRollup = !existsSync(rollupPath);
  const needsSharp = !existsSync(sharpPlatformPath);

  if (!needsRollup && !needsSharp) {
    return; // All native binaries present
  }

  log(
    `Missing native binaries: ${[needsRollup && 'rollup', needsSharp && 'sharp'].filter(Boolean).join(', ')}`
  );

  try {
    if (needsRollup) {
      log(`Installing ${rollupPkg}...`);
      execSync(`npm install ${rollupPkg} --no-save`, {
        cwd: ROOT,
        stdio: 'inherit',
        timeout: 60_000,
      });
    }

    if (needsSharp) {
      log('Installing sharp with platform-specific binaries...');
      execSync(`npm install --os=win32 --cpu=${cpu} sharp --no-save`, {
        cwd: ROOT,
        stdio: 'inherit',
        timeout: 60_000,
      });
    }

    // Sharp install can evict rollup — re-check and reinstall if needed
    if (needsSharp && !existsSync(rollupPath)) {
      log('Re-installing rollup native binary (evicted by sharp)...');
      execSync(`npm install ${rollupPkg} --no-save`, {
        cwd: ROOT,
        stdio: 'inherit',
        timeout: 60_000,
      });
    }

    log('Native binary installation complete.');
  } catch (err) {
    console.warn(`[postinstall] Warning: failed to install native binaries: ${err.message}`);
    console.warn('[postinstall] You may need to manually run:');
    if (needsRollup) console.warn(`  npm install ${rollupPkg} --no-save`);
    if (needsSharp) console.warn(`  npm install --os=win32 --cpu=${cpu} sharp`);
    // Non-fatal: don't fail the entire npm install
  }
}

checkAndFixNativeBinaries();
