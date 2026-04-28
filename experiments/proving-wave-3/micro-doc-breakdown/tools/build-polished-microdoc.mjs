#!/usr/bin/env node
import { mkdir, writeFile, rm, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const out = join(root, 'outputs', 'final');
const work = join(out, 'polished');
const sourceAudioVideo = join(out, 'video.before-caption-export-fix.mp4');
const captionExportPath = join(out, 'captions.remotion.json');
const captionAssPath = join(out, 'captions.polished.ass');
const finalPath = join(out, 'video.mp4');

const W = 1080;
const H = 1920;
const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const fontBold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const frames = [
  {
    id: 'opener',
    duration: 2.05,
    kicker: 'CASE FILE 01',
    title: 'BLOCKBUSTER\nDID NOT DIE\nOVERNIGHT',
    accent: '#f6d45c',
    body: 'The simple story is wrong.',
    visual: 'vhs',
  },
  {
    id: 'myth',
    duration: 2.05,
    kicker: 'MYTH',
    title: 'PEOPLE JUST\nSTOPPED RENTING?',
    accent: '#8bd3ff',
    body: 'Not exactly. The old profit engine broke first.',
    visual: 'myth',
  },
  {
    id: 'model',
    duration: 2.4,
    kicker: 'THE MODEL',
    title: 'INCONVENIENCE\nWAS PROFITABLE',
    accent: '#f6d45c',
    body: 'Rentals, late fees, and stores all depended on friction.',
    visual: 'ledger',
  },
  {
    id: 'model-insert',
    duration: 2.45,
    kicker: 'MONEY MAP',
    title: 'LATE FEES\nWERE NOT A BUG',
    accent: '#ff6b7a',
    body: 'They were part of the machine.',
    visual: 'flow',
  },
  {
    id: 'receipt',
    duration: 2.05,
    kicker: 'THE RECEIPT',
    title: 'PAID IN PAIN',
    accent: '#ff6b7a',
    body: 'The customer pain point was also the profit center.',
    visual: 'receipt',
  },
  {
    id: 'receipt-insert',
    duration: 2.05,
    kicker: 'PRESSURE POINT',
    title: 'DUE DATE\nSTORE TRIP\nSURPRISE FEE',
    accent: '#ff6b7a',
    body: 'Three small frictions made the model vulnerable.',
    visual: 'list',
  },
  {
    id: 'netflix',
    duration: 2.2,
    kicker: 'THE ATTACK',
    title: 'NETFLIX REMOVED\nTHE PAIN POINT',
    accent: '#ff3b3b',
    body: 'No due dates. No store trip. No late fee surprise.',
    visual: 'timeline',
  },
  {
    id: 'netflix-insert',
    duration: 2.2,
    kicker: 'CUSTOMER EXPERIENCE',
    title: 'THE BETTER DEAL\nWAS SIMPLER',
    accent: '#ff3b3b',
    body: 'The competitor attacked the habit, then the infrastructure.',
    visual: 'compare',
  },
  {
    id: 'netflix-proof',
    duration: 2.25,
    kicker: 'PAIN REMOVED',
    title: 'DVD BY MAIL\nBECAME STREAMING',
    accent: '#ff3b3b',
    body: 'The old store trip became optional, then obsolete.',
    visual: 'timeline',
  },
  {
    id: 'debt',
    duration: 2.7,
    kicker: 'THE LOAD',
    title: 'DEBT + STORES\nMET DIGITAL',
    accent: '#8bd3ff',
    body: 'Thousands of stores turned into weight.',
    visual: 'map',
  },
  {
    id: 'debt-insert',
    duration: 2.7,
    kicker: 'STRUCTURAL LOAD',
    title: 'THE COMPANY\nCOULD NOT TURN FAST',
    accent: '#8bd3ff',
    body: 'Digital shift on one side. Store overhead on the other.',
    visual: 'scale',
  },
  {
    id: 'bankruptcy',
    duration: 2.05,
    kicker: '2010',
    title: 'THE RENTAL EMPIRE\nFILED BANKRUPTCY',
    accent: '#f6d45c',
    body: 'By 2010, the old model had run out of runway.',
    visual: 'newspaper',
  },
  {
    id: 'bankruptcy-insert',
    duration: 2.05,
    kicker: 'TIMELINE PIN',
    title: 'THE COLLAPSE\nWAS NOT OVERNIGHT',
    accent: '#f6d45c',
    body: 'It was a slow failure of incentives, debt, and timing.',
    visual: 'pin',
  },
  {
    id: 'lesson',
    duration: 2.45,
    kicker: 'THE LESSON',
    title: 'BETTER EXPERIENCE\nKILLS OLD PROFIT',
    accent: '#64e0a1',
    body: 'Netflix was not magic. It made the pain unnecessary.',
    visual: 'lesson',
  },
  {
    id: 'lesson-insert',
    duration: 2.45,
    kicker: 'OLD PROFIT CENTER',
    title: 'IF PAIN MAKES MONEY,\nSOMEONE WILL REMOVE IT',
    accent: '#64e0a1',
    body: 'That is the business lesson hiding inside the story.',
    visual: 'flow',
  },
  {
    id: 'lesson-proof',
    duration: 2.45,
    kicker: 'MECHANISM',
    title: 'CUSTOMER PAIN\nBECAME A TARGET',
    accent: '#64e0a1',
    body: 'A better experience can erase the old revenue line.',
    visual: 'target',
  },
  {
    id: 'save',
    duration: 2.25,
    kicker: 'SAVE',
    title: 'NOT OVERNIGHT.\nTHE MODEL BROKE.',
    accent: '#f6d45c',
    body: 'Myth: Netflix killed it overnight. Reality: the model broke first.',
    visual: 'recap',
  },
  {
    id: 'save-final',
    duration: 2.3,
    kicker: 'TAKEAWAY',
    title: 'SAVE THIS\nFOR THE NEXT DEBATE',
    accent: '#f6d45c',
    body: 'Pain is a target. Convenience compounds.',
    visual: 'recap',
  },
];

function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function lines(text, x, y, size, color, weight = 800, gap = 1.05) {
  return String(text)
    .split('\n')
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * size * gap}" font-size="${size}" font-weight="${weight}" fill="${color}" letter-spacing="-2">${esc(line)}</text>`
    )
    .join('\n');
}

function grain() {
  return `
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 0.08"/></feComponentTransfer>
  </filter>`;
}

function visual(frame) {
  const a = frame.accent;
  switch (frame.visual) {
    case 'vhs':
      return `
      <g transform="translate(150 610)">
        <rect x="0" y="0" width="780" height="410" rx="28" fill="#f8efd7" opacity=".95"/>
        <rect x="48" y="72" width="684" height="120" rx="14" fill="#101827"/>
        <rect x="74" y="98" width="230" height="68" fill="#174e88"/>
        <rect x="326" y="98" width="156" height="68" fill="${a}"/>
        <rect x="504" y="98" width="200" height="68" fill="#174e88"/>
        <text x="170" y="265" font-size="54" font-weight="800" fill="#111">RENTAL NIGHT</text>
        <circle cx="140" cy="345" r="54" fill="#111"/><circle cx="640" cy="345" r="54" fill="#111"/>
      </g>`;
    case 'ledger':
      return `
      <g transform="translate(144 590)">
        <rect width="792" height="520" rx="30" fill="#f7efd6"/>
        ${['RENTALS  +', 'LATE FEES  +', 'STORE OVERHEAD  -', 'CUSTOMER PAIN  ?'].map((t, i) => `<text x="84" y="${110 + i * 86}" font-size="38" font-weight="800" fill="#1b150f">${t}</text>`).join('')}
        <rect x="62" y="390" width="668" height="82" rx="12" fill="#17120d"/>
        <text x="126" y="444" font-size="42" font-weight="800" fill="${a}">OLD PROFIT CENTER</text>
      </g>`;
    case 'receipt':
      return `
      <g transform="translate(250 530) rotate(-5 290 360)">
        <rect width="580" height="760" rx="18" fill="#fff7df"/>
        <text x="76" y="98" font-size="50" font-weight="800" fill="#19140e">RENTAL RECEIPT</text>
        ${['MOVIE RENTAL', 'DUE DATE', 'LATE FEE'].map((t, i) => `<text x="82" y="${190 + i * 86}" font-size="32" font-weight="800" fill="#19140e">${t}</text><line x1="82" x2="500" y1="${214 + i * 86}" y2="${214 + i * 86}" stroke="#19140e" opacity=".28"/>`).join('')}
        <rect x="82" y="470" width="420" height="118" rx="8" fill="${a}"/>
        <text x="122" y="546" font-size="48" font-weight="800" fill="#fff7df">PAID IN PAIN</text>
      </g>`;
    case 'timeline':
      return `
      <g transform="translate(96 670)">
        <rect width="888" height="330" rx="28" fill="#130c0c" stroke="${a}" stroke-width="5"/>
        <line x1="120" x2="768" y1="170" y2="170" stroke="#fff" opacity=".28" stroke-width="8"/>
        ${['DVD', 'NO DUE DATE', 'STREAMING'].map((t, i) => `<circle cx="${130 + i * 320}" cy="170" r="36" fill="${i === 0 ? '#fff7df' : a}"/><text x="${86 + i * 292}" y="104" font-size="30" font-weight="800" fill="#fff7df">${t}</text>`).join('')}
        ${['STORE TRIP', 'LATE FEE', 'DUE DATE'].map((t, i) => `<rect x="${88 + i * 268}" y="250" width="188" height="50" rx="25" fill="none" stroke="${a}" stroke-width="3"/><text x="${116 + i * 268}" y="284" font-size="22" font-weight="800" fill="#fff7df">${t}</text>`).join('')}
      </g>`;
    case 'map':
      return `
      <g transform="translate(120 590)">
        <rect width="840" height="560" rx="26" fill="#102630" stroke="#bde9ff" stroke-width="3" opacity=".92"/>
        ${Array.from({ length: 34 }, (_, i) => `<circle cx="${80 + ((i * 59) % 690)}" cy="${90 + ((i * 113) % 360)}" r="${i % 4 === 0 ? 10 : 7}" fill="${i % 3 === 0 ? a : '#e8f6ff'}" opacity="${i % 5 === 0 ? '.42' : '.75'}"/>`).join('')}
        <path d="M70 420 C240 340 350 500 500 380 C630 280 730 330 790 240" fill="none" stroke="#fff7df" stroke-width="8" opacity=".85"/>
      </g>`;
    case 'newspaper':
      return `
      <g transform="translate(172 520)">
        <rect width="736" height="720" rx="18" fill="#f8efd7"/>
        <text x="238" y="88" font-size="38" font-weight="800" fill="#18120c">BUSINESS DAILY</text>
        <line x1="92" x2="644" y1="120" y2="120" stroke="#18120c" stroke-width="5"/>
        <text x="96" y="230" font-family="DejaVu Serif" font-size="56" font-weight="800" fill="#18120c">RENTAL GIANT</text>
        <text x="96" y="304" font-family="DejaVu Serif" font-size="56" font-weight="800" fill="#18120c">FILES CHAPTER 11</text>
        <rect x="92" y="394" width="552" height="108" fill="#18120c"/>
        <text x="294" y="466" font-size="50" font-weight="800" fill="${a}">2010</text>
      </g>`;
    case 'lesson':
      return `
      <g transform="translate(120 610)">
        <rect x="0" y="0" width="840" height="140" rx="18" fill="none" stroke="#ff6b7a" stroke-width="4"/>
        <text x="230" y="88" font-size="42" font-weight="800" fill="#fff7df">OLD PROFIT CENTER</text>
        <path d="M420 190 L420 330 M370 280 L420 330 L470 280" stroke="${a}" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="0" y="380" width="840" height="140" rx="18" fill="none" stroke="${a}" stroke-width="4"/>
        <text x="226" y="468" font-size="42" font-weight="800" fill="#fff7df">BETTER EXPERIENCE</text>
      </g>`;
    case 'compare':
      return `
      <g transform="translate(110 600)">
        <rect width="380" height="460" rx="24" fill="#241316" stroke="#ff6b7a" stroke-width="4"/>
        <text x="72" y="92" font-size="38" font-weight="800" fill="#fff7df">OLD MODEL</text>
        <text x="56" y="190" font-size="34" font-weight="800" fill="#ff6b7a">DUE DATE</text>
        <text x="56" y="270" font-size="34" font-weight="800" fill="#ff6b7a">STORE TRIP</text>
        <text x="56" y="350" font-size="34" font-weight="800" fill="#ff6b7a">LATE FEE</text>
        <rect x="480" width="380" height="460" rx="24" fill="#11201a" stroke="${a}" stroke-width="4"/>
        <text x="562" y="92" font-size="38" font-weight="800" fill="#fff7df">NEW DEAL</text>
        <text x="546" y="190" font-size="34" font-weight="800" fill="${a}">NO DUE DATE</text>
        <text x="546" y="270" font-size="34" font-weight="800" fill="${a}">NO TRIP</text>
        <text x="546" y="350" font-size="34" font-weight="800" fill="${a}">NO SURPRISE</text>
      </g>`;
    default:
      return `
      <g transform="translate(120 650)">
        <rect width="840" height="430" rx="28" fill="#f8efd7" opacity=".92"/>
        <circle cx="420" cy="215" r="120" fill="none" stroke="${a}" stroke-width="20"/>
        <line x1="420" x2="420" y1="80" y2="350" stroke="#17120d" stroke-width="10" opacity=".4"/>
        <line x1="285" x2="555" y1="215" y2="215" stroke="#17120d" stroke-width="10" opacity=".4"/>
      </g>`;
  }
}

function svg(frame, index) {
  const titleY = frame.title.split('\n').length > 2 ? 248 : 304;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#08131f"/>
    <stop offset=".48" stop-color="#11100d"/>
    <stop offset="1" stop-color="#050608"/>
  </linearGradient>
  ${grain()}
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect x="0" y="0" width="${W}" height="${H}" filter="url(#grain)" opacity=".6"/>
<rect x="42" y="42" width="996" height="1700" rx="32" fill="none" stroke="${frame.accent}" stroke-width="3" opacity=".78"/>
<rect x="76" y="72" width="928" height="68" rx="16" fill="#050608" stroke="${frame.accent}" stroke-width="2"/>
<text x="540" y="118" text-anchor="middle" font-size="28" font-weight="800" fill="${frame.accent}" letter-spacing="2">${esc(frame.kicker)}</text>
${lines(frame.title, 92, titleY, 70, '#fff7df', 900, 1.08)}
${visual(frame)}
<text x="92" y="1215" font-size="34" font-weight="800" fill="${frame.accent}" letter-spacing="1">FRAME ${String(index + 1).padStart(2, '0')}</text>
<text x="92" y="1266" font-size="30" font-weight="700" fill="#fff7df" opacity=".74">${esc(frame.body)}</text>
<text x="92" y="1718" font-size="22" font-weight="800" fill="#fff7df" opacity=".48">MICRO-DOC BREAKDOWN</text>
<text x="802" y="1718" font-size="22" font-weight="800" fill="#fff7df" opacity=".48">ARCHIVE CUT</text>
</svg>`;
}

function assTime(ms) {
  const totalCs = Math.max(0, Math.round(ms / 10));
  const cs = totalCs % 100;
  const totalSeconds = Math.floor(totalCs / 100);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function makeAss(captionExport) {
  const lines = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${W}`,
    `PlayResY: ${H}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default,Arial,64,&H00FFFFFF,&H0000D7FF,&H00000000,&H90000000,1,0,0,0,100,100,0,0,1,4,0,2,110,110,384,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Text',
  ];
  for (const c of captionExport.captions) {
    const text = String(c.text).replaceAll('\n', '\\N').replaceAll(',', '\\,');
    lines.push(`Dialogue: 0,${assTime(c.startMs)},${assTime(c.endMs)},Default,${text}`);
  }
  return `${lines.join('\n')}\n`;
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? ['ignore', 'inherit', 'inherit'],
      cwd: options.cwd,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });

const captionExport = JSON.parse(
  await (await import('node:fs/promises')).readFile(captionExportPath, 'utf8')
);
await writeFile(captionAssPath, makeAss(captionExport), 'utf8');

const concatPath = join(work, 'concat.txt');
let concat = '';

for (const [index, frame] of frames.entries()) {
  const svgPath = join(work, `${String(index).padStart(2, '0')}-${frame.id}.svg`);
  const pngPath = join(work, `${String(index).padStart(2, '0')}-${frame.id}.png`);
  const mp4Path = join(work, `${String(index).padStart(2, '0')}-${frame.id}.mp4`);
  await writeFile(svgPath, svg(frame, index), 'utf8');
  await sharp(Buffer.from(svg(frame, index)))
    .png()
    .toFile(pngPath);
  await run('ffmpeg', [
    '-nostdin',
    '-y',
    '-v',
    'error',
    '-loop',
    '1',
    '-t',
    String(frame.duration),
    '-i',
    pngPath,
    '-vf',
    'format=yuv420p',
    '-r',
    '30',
    '-an',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    mp4Path,
  ]);
  concat += `file '${mp4Path}'\n`;
}

await writeFile(concatPath, concat, 'utf8');

const polishedPath = join(out, 'video.polished.mp4');
await run('ffmpeg', [
  '-nostdin',
  '-y',
  '-v',
  'error',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  concatPath,
  '-i',
  sourceAudioVideo,
  '-filter_complex',
  `[0:v]drawbox=x=96:y=1300:w=888:h=248:color=black@0.46:t=fill,subtitles=${captionAssPath}[v]`,
  '-map',
  '[v]',
  '-map',
  '1:a:0',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  '-shortest',
  polishedPath,
]);

if (existsSync(finalPath)) {
  await rename(finalPath, join(out, `video.before-polish-${Date.now()}.mp4`));
}
await rename(polishedPath, finalPath);

console.log(JSON.stringify({ ok: true, finalPath, frameCount: frames.length }, null, 2));
