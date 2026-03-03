#!/usr/bin/env node
import { readdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';

function parseArgs(argv) {
  const args = { root: 'output', writePointer: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root' || a === '-r') {
      args.root = String(argv[i + 1] ?? '').trim();
      i += 1;
      continue;
    }
    if (a === '--write-pointer' || a === '--write') {
      args.writePointer = true;
      continue;
    }
    if (a === '--json') {
      args.json = true;
      continue;
    }
  }
  return args;
}

async function maybeStat(path) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

async function findLatestMp4(rootAbs) {
  const entries = await readdir(rootAbs, { withFileTypes: true });
  const candidates = [];

  for (const ent of entries) {
    const p = join(rootAbs, ent.name);

    if (ent.isFile() && ent.name.toLowerCase().endsWith('.mp4')) {
      const s = await maybeStat(p);
      if (s) candidates.push({ path: p, mtimeMs: s.mtimeMs });
      continue;
    }

    if (!ent.isDirectory()) continue;

    // Prefer the canonical artifact name when present.
    const canonical = join(p, 'video.mp4');
    const canonStat = await maybeStat(canonical);
    if (canonStat) {
      candidates.push({ path: canonical, mtimeMs: canonStat.mtimeMs });
      continue;
    }

    // Otherwise consider any mp4s in that directory (non-recursive).
    let childEntries;
    try {
      childEntries = await readdir(p, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const child of childEntries) {
      if (!child.isFile()) continue;
      if (!child.name.toLowerCase().endsWith('.mp4')) continue;
      const childPath = join(p, child.name);
      const s = await maybeStat(childPath);
      if (s) candidates.push({ path: childPath, mtimeMs: s.mtimeMs });
    }
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0] ?? null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootAbs = resolve(process.cwd(), args.root || 'output');

  let latest;
  try {
    latest = await findLatestMp4(rootAbs);
  } catch (err) {
    console.error(`Failed to scan: ${rootAbs}`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 2;
    return;
  }

  if (!latest) {
    console.error(`No .mp4 found under: ${rootAbs}`);
    process.exitCode = 1;
    return;
  }

  const rel = relative(process.cwd(), latest.path);

  if (args.writePointer) {
    const pointerPath = join(rootAbs, 'LATEST.txt');
    await writeFile(pointerPath, rel + '\n', 'utf8');
  }

  if (args.json) {
    process.stdout.write(
      JSON.stringify({ root: rootAbs, latest: latest.path, latestRelative: rel }, null, 2) + '\n'
    );
    return;
  }

  // stdout is reserved for the primary artifact path (easy copy/paste).
  process.stdout.write(latest.path + '\n');
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exitCode = 2;
});
