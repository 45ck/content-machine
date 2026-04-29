#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import sharp from 'sharp';

sharp.cache(false);
sharp.concurrency(1);

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const finalDir = join(root, 'outputs', 'final');
const workDir = join(root, 'outputs', 'motion-card-v2');
const framesDir = join(workDir, 'frames');
const audioPath = join(root, 'outputs', 'audio', 'audio.wav');
const captionPath = join(finalDir, 'captions.ass');
const finalPath = join(workDir, 'video.mp4');
const W = 1080;
const H = 1920;
const FPS = 30;
const layoutPath = join(workDir, 'layout-annotations.v1.json');

const scenes = [
  {
    id: 'hook',
    label: 'HOOK',
    duration: 4.0,
    accent: '#20f2c9',
    bg: ['#061c23', '#0b423e'],
    headline: ['LEARN', 'ANYTHING', 'FASTER'],
    sub: 'Use the Feynman loop',
    chips: ['EXPLAIN', 'FIND GAP', 'SIMPLIFY', 'TEST'],
    visual: 'loop',
  },
  {
    id: 'step-1',
    label: 'STEP 1',
    duration: 4.3,
    accent: '#ffd14a',
    bg: ['#231806', '#5a3c02'],
    headline: ['EXPLAIN IT', 'LIKE A KID'],
    sub: 'If it needs jargon, it is not clear yet',
    chips: ['PROMPT', 'TEACH', 'SIMPLE'],
    visual: 'notes',
  },
  {
    id: 'step-2',
    label: 'STEP 2',
    duration: 4.3,
    accent: '#ff6a28',
    bg: ['#27110c', '#5a1607'],
    headline: ['FIND THE', 'GAP'],
    sub: 'The stuck point is the study target',
    chips: ['STUCK', 'GAP', 'TARGET'],
    visual: 'target',
  },
  {
    id: 'step-3',
    label: 'STEP 3',
    duration: 4.9,
    accent: '#a456ff',
    bg: ['#140b2f', '#33105f'],
    headline: ['KILL THE', 'JARGON'],
    sub: 'Replace fancy words with plain ones',
    chips: ['JARGON', 'PLAIN', 'OBVIOUS'],
    visual: 'jargon',
  },
  {
    id: 'step-4',
    label: 'STEP 4',
    duration: 5.2,
    accent: '#4595ff',
    bg: ['#061932', '#0d3d6e'],
    headline: ['USE A REAL', 'EXAMPLE'],
    sub: 'Definitions are not enough',
    chips: ['EXAMPLE', 'CHECK', 'APPLY'],
    visual: 'check',
  },
  {
    id: 'payoff',
    label: 'PAYOFF',
    duration: 5.2,
    accent: '#ff1f87',
    bg: ['#240718', '#5c0830'],
    headline: ['FIND THE', 'MISSING PIECE'],
    sub: 'If you cannot explain it simply, find the missing piece',
    chips: ['CONFUSION', 'TARGET', 'FIX'],
    visual: 'puzzle',
  },
  {
    id: 'cta',
    label: 'SAVE',
    duration: 2.9,
    accent: '#c8ffb0',
    bg: ['#071d12', '#154526'],
    headline: ['THE LOOP', 'WORKS'],
    sub: 'Explain. Find gap. Simplify. Test.',
    chips: ['1', '2', '3', '4'],
    visual: 'recap',
  },
];

const totalFrames = Math.round(scenes.reduce((sum, scene) => sum + scene.duration, 0) * FPS);

function clamp(n, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

function easeOutCubic(t) {
  const x = clamp(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeInOut(t) {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function textLines(lines, x, y, size, color, opts = {}) {
  const weight = opts.weight ?? 900;
  const gap = opts.gap ?? 1.05;
  const anchor = opts.anchor ?? 'middle';
  const letter = opts.letter ?? '-1';
  const opacity = opts.opacity ?? 1;
  return lines
    .map((line, i) => {
      const dy = y + i * size * gap;
      return `<text x="${x}" y="${dy}" text-anchor="${anchor}" font-family="Inter, DejaVu Sans, Arial" font-size="${size}" font-weight="${weight}" letter-spacing="${letter}" fill="${color}" opacity="${opacity}">${esc(line)}</text>`;
    })
    .join('\n');
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function sceneAt(frameIndex) {
  let cursor = 0;
  for (const scene of scenes) {
    const frames = Math.round(scene.duration * FPS);
    if (frameIndex < cursor + frames) {
      return {
        scene,
        localFrame: frameIndex - cursor,
        sceneFrames: frames,
        index: scenes.indexOf(scene),
      };
    }
    cursor += frames;
  }
  const last = scenes.at(-1);
  return {
    scene: last,
    localFrame: Math.round(last.duration * FPS) - 1,
    sceneFrames: Math.round(last.duration * FPS),
    index: scenes.length - 1,
  };
}

function grainDots(scene, frameIndex) {
  return Array.from({ length: 18 }, (_, i) => {
    const x = (97 + i * 151 + (frameIndex * ((i % 3) + 1)) / 5) % W;
    const y = (210 + i * 233 + Math.sin((frameIndex + i * 19) / 24) * 24) % 1400;
    const r = 4 + (i % 5);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${scene.accent}" opacity="${0.06 + (i % 4) * 0.025}"/>`;
  }).join('\n');
}

function background(scene, frameIndex) {
  const drift = (frameIndex % 180) / 180;
  const orb1 = 170 + Math.sin(frameIndex / 35) * 24;
  const orb2 = 138 + Math.cos(frameIndex / 41) * 18;
  return `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${scene.bg[0]}"/>
    <stop offset="0.52" stop-color="#06090f"/>
    <stop offset="1" stop-color="${scene.bg[1]}"/>
  </linearGradient>
  <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="18" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="${120 + drift * 120}" cy="280" r="${orb1}" fill="${scene.accent}" opacity=".09"/>
<circle cx="960" cy="${230 + drift * 180}" r="${orb2}" fill="#ffffff" opacity=".07"/>
<circle cx="180" cy="1540" r="230" fill="${scene.accent}" opacity=".08"/>
${grainDots(scene, frameIndex)}
<path d="M-120 1160 C140 1020 310 1260 540 1110 C760 970 900 1060 1200 880" fill="none" stroke="${scene.accent}" stroke-width="12" opacity=".12"/>
<path d="M-60 1260 C220 1110 400 1320 610 1190 C810 1060 930 1140 1160 1020" fill="none" stroke="#fff" stroke-width="3" opacity=".08"/>`;
}

function progressRail(scene, p, index) {
  const dots = scenes
    .map((s, i) => {
      const active = i <= index;
      const x = 170 + i * 123;
      const r = i === index ? 18 + Math.sin(p * Math.PI) * 4 : 12;
      return `<circle cx="${x}" cy="0" r="${r}" fill="${active ? scene.accent : '#ffffff'}" opacity="${active ? 0.95 : 0.22}"/>`;
    })
    .join('\n');
  const lineWidth = 123 * index + 123 * p;
  return `
<g transform="translate(112 1135)">
  <line x1="58" x2="842" y1="0" y2="0" stroke="#ffffff" stroke-width="5" opacity=".18"/>
  <line x1="58" x2="${58 + lineWidth}" y1="0" y2="0" stroke="${scene.accent}" stroke-width="8" stroke-linecap="round" opacity=".9"/>
  ${dots}
</g>`;
}

function chips(scene, p) {
  return scene.chips
    .map((chip, i) => {
      const enter = easeOutCubic((p - 0.28 - i * 0.055) / 0.18);
      const y = lerp(28, 0, enter);
      const opacity = enter;
      const x = 180 + i * (scene.chips.length === 4 ? 240 : 270);
      const width = scene.chips.length === 4 ? 178 : 220;
      return `
<g transform="translate(${x} ${1250 + y})" opacity="${opacity}">
  <rect x="${-width / 2}" y="-30" width="${width}" height="60" rx="30" fill="#070b10" stroke="${scene.accent}" stroke-width="3" opacity=".92"/>
  <text x="0" y="10" text-anchor="middle" font-size="23" font-weight="900" fill="#ffffff">${esc(chip)}</text>
</g>`;
    })
    .join('\n');
}

function visual(scene, p, frame) {
  const a = scene.accent;
  const pulse = 0.5 + Math.sin(frame / 8) * 0.5;
  if (scene.visual === 'loop') {
    const spin = p * 330;
    return `
<g transform="translate(540 700)">
  <circle r="165" fill="none" stroke="${a}" stroke-width="16" opacity=".2"/>
  <path d="M-102 -40 C-42 -142 114 -136 142 -18 C170 98 12 156 -74 76" fill="none" stroke="${a}" stroke-width="18" stroke-linecap="round" opacity=".86"/>
  <path d="M-70 80 L-130 82 L-98 30" fill="none" stroke="${a}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <g transform="rotate(${spin})">
    <circle cx="0" cy="-165" r="${18 + pulse * 4}" fill="#ffffff"/>
  </g>
  <text x="0" y="16" text-anchor="middle" font-size="50" font-weight="900" fill="#fff">4 STEPS</text>
</g>`;
  }
  if (scene.visual === 'notes') {
    const wipe = easeInOut((p - 0.22) / 0.38);
    return `
<g transform="translate(205 570)">
  <rect width="670" height="230" rx="30" fill="#fff9df" opacity=".96"/>
  <text x="58" y="82" font-size="34" font-weight="900" fill="#15120b" opacity="${1 - wipe}">epistemological abstraction</text>
  <text x="58" y="150" font-size="34" font-weight="900" fill="#15120b" opacity="${1 - wipe}">cognitive transfer model</text>
  <rect x="38" y="42" width="${594 * wipe}" height="146" rx="18" fill="${a}" opacity=".94"/>
  <text x="335" y="132" text-anchor="middle" font-size="48" font-weight="900" fill="#15120b" opacity="${wipe}">SAY IT SIMPLY</text>
</g>`;
  }
  if (scene.visual === 'target') {
    const ring = 90 + easeOutCubic(p) * 96;
    return `
<g transform="translate(540 680)">
  <circle r="${ring}" fill="none" stroke="${a}" stroke-width="16" opacity=".35"/>
  <circle r="${ring * 0.58}" fill="none" stroke="#fff" stroke-width="7" opacity=".35"/>
  <line x1="-205" x2="205" y1="0" y2="0" stroke="#fff" stroke-width="8" opacity=".4"/>
  <line x1="0" x2="0" y1="-205" y2="205" stroke="#fff" stroke-width="8" opacity=".4"/>
  <circle r="${26 + pulse * 8}" fill="${a}"/>
  <text x="0" y="245" text-anchor="middle" font-size="40" font-weight="900" fill="#fff">STUDY TARGET</text>
</g>`;
  }
  if (scene.visual === 'jargon') {
    const collapse = easeInOut((p - 0.22) / 0.46);
    const words = [
      ['UTILIZE', 'USE'],
      ['FACILITATE', 'HELP'],
      ['LEVERAGE', 'USE'],
    ];
    return `
<g transform="translate(170 540)">
${words
  .map(([before, after], i) => {
    const y = i * 112;
    return `<g transform="translate(0 ${y})">
      <rect width="740" height="92" rx="20" fill="#0a0d14" stroke="${a}" stroke-width="4" opacity=".9"/>
      <text x="${lerp(110, 55, collapse)}" y="60" font-size="38" font-weight="900" fill="#fff" opacity="${1 - collapse}">${before}</text>
      <text x="370" y="60" text-anchor="middle" font-size="${lerp(38, 52, collapse)}" font-weight="900" fill="${a}" opacity="${collapse}">${after}</text>
    </g>`;
  })
  .join('\n')}
</g>`;
  }
  if (scene.visual === 'check') {
    const checks = [0.24, 0.42, 0.6].map((start) => easeOutCubic((p - start) / 0.16));
    return `
<g transform="translate(190 545)">
${['EXAMPLE', 'CAN I TEACH IT?', 'WHERE DID I GET STUCK?']
  .map((label, i) => {
    const y = i * 112;
    return `<g transform="translate(0 ${y})">
      <rect width="700" height="92" rx="22" fill="#f5fbff" opacity=".95"/>
      <rect x="34" y="24" width="44" height="44" rx="10" fill="${checks[i] > 0.9 ? a : '#d8e6f2'}"/>
      <path d="M44 47 L56 60 L78 31" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="${checks[i]}"/>
      <text x="112" y="60" font-size="34" font-weight="900" fill="#0b1423">${label}</text>
    </g>`;
  })
  .join('\n')}
</g>`;
  }
  if (scene.visual === 'puzzle') {
    const snap = easeOutCubic((p - 0.34) / 0.24);
    return `
<g transform="translate(250 540)">
  <rect x="0" y="0" width="250" height="220" rx="24" fill="#fff" opacity=".9"/>
  <rect x="300" y="0" width="250" height="220" rx="24" fill="#fff" opacity=".9"/>
  <rect x="${lerp(180, 150, snap)}" y="${lerp(178, 112, snap)}" width="250" height="220" rx="24" fill="${a}" opacity=".96"/>
  <text x="275" y="392" text-anchor="middle" font-size="40" font-weight="900" fill="#fff">SNAP THE GAP CLOSED</text>
</g>`;
  }
  return `
<g transform="translate(170 555)">
  <rect width="740" height="300" rx="34" fill="#f5ffe9" opacity=".94"/>
  ${['EXPLAIN', 'FIND GAP', 'SIMPLIFY', 'TEST']
    .map(
      (step, i) =>
        `<text x="80" y="${82 + i * 62}" font-size="38" font-weight="900" fill="#102014">${i + 1}. ${step}</text>`
    )
    .join('\n')}
</g>`;
}

function svg(frameIndex) {
  const { scene, localFrame, sceneFrames, index } = sceneAt(frameIndex);
  const p = localFrame / Math.max(1, sceneFrames - 1);
  const enter = 0.82 + easeOutCubic(localFrame / 18) * 0.18;
  const exit = 1 - easeOutCubic((localFrame - (sceneFrames - 12)) / 12);
  const sceneOpacity = clamp(Math.min(enter, exit));
  const settle = easeOutCubic(localFrame / 18);
  const cardY = lerp(24, 0, settle);
  const cardScale = lerp(0.985, 1, settle);
  const headlineEnter = 0.76 + easeOutCubic(p / 0.18) * 0.24;
  const subEnter = 0.64 + easeOutCubic((p - 0.08) / 0.18) * 0.36;
  const subLines = wrapText(scene.sub, 31);
  const subSize = subLines.length > 1 ? 28 : 32;
  const subY = subLines.length > 1 ? 995 : 1020;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${background(scene, frameIndex)}
<g opacity="${sceneOpacity}" transform="translate(0 ${cardY}) scale(${cardScale})" transform-origin="540 820">
  <rect x="58" y="78" width="964" height="1210" rx="48" fill="#070b10" opacity=".70" stroke="${scene.accent}" stroke-width="4"/>
  <rect x="94" y="116" width="892" height="78" rx="39" fill="${scene.accent}" opacity=".96" filter="url(#softGlow)"/>
  <text x="540" y="166" text-anchor="middle" font-size="28" font-weight="900" letter-spacing="6" fill="#071014">${esc(scene.label)}</text>
  <g opacity="${headlineEnter}" transform="translate(0 ${lerp(34, 0, headlineEnter)})">
    ${textLines(scene.headline, 540, scene.headline.length > 2 ? 318 : 360, 74, '#ffffff', { gap: 1.05 })}
  </g>
  <g opacity="${subEnter}" transform="translate(0 ${lerp(24, 0, subEnter)})">
    <rect x="164" y="940" width="752" height="132" rx="28" fill="#f8fbff" opacity=".96"/>
    ${textLines(subLines, 540, subY, subSize, '#111823', { weight: 900, letter: '0', gap: 1.15 })}
  </g>
  ${visual(scene, p, frameIndex)}
  ${progressRail(scene, p, index)}
  ${chips(scene, p)}
</g>
<rect x="76" y="1375" width="928" height="210" rx="36" fill="#000000" opacity=".12"/>
</svg>`;
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

await rm(workDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });

const motionBrief = {
  schemaVersion: 'motion-brief.v1',
  lane: 'motion-card-lesson',
  render: { width: W, height: H, fps: FPS, totalFrames },
  rule: 'frame number + input props -> one deterministic image',
  safeZones: { x: [96, 984], captionY: [1375, 1585], primaryTextY: [220, 1180] },
  scenes: scenes.map((scene, i) => ({
    id: scene.id,
    durationSeconds: scene.duration,
    beatFrames: {
      enter:
        i === 0 ? 0 : Math.round(scenes.slice(0, i).reduce((sum, s) => sum + s.duration, 0) * FPS),
      holdAfter: 18,
      review: Math.round(
        (scenes.slice(0, i).reduce((sum, s) => sum + s.duration, 0) + scene.duration * 0.55) * FPS
      ),
    },
    movingElements: [
      'card entrance',
      'headline settle',
      'visual state change',
      'progress rail',
      'chip stagger',
    ],
  })),
  hardRejects: [
    'CSS animation clocks',
    'Math.random()',
    'caption collisions',
    'moving captions and cards at the same time',
    'unreadable phone-size text',
  ],
};
await writeFile(join(workDir, 'motion-brief.v1.json'), JSON.stringify(motionBrief, null, 2));

function visualBox(scene) {
  if (scene.visual === 'loop') return { x0: 345, y0: 520, x1: 735, y1: 880 };
  if (scene.visual === 'notes') return { x0: 205, y0: 570, x1: 875, y1: 800 };
  if (scene.visual === 'target') return { x0: 315, y0: 475, x1: 765, y1: 925 };
  if (scene.visual === 'jargon') return { x0: 170, y0: 540, x1: 910, y1: 856 };
  if (scene.visual === 'check') return { x0: 190, y0: 545, x1: 890, y1: 861 };
  if (scene.visual === 'puzzle') return { x0: 250, y0: 540, x1: 800, y1: 932 };
  return { x0: 170, y0: 555, x1: 910, y1: 855 };
}

const layoutAnnotations = {
  schemaVersion: 'layout-annotations.v1',
  videoWidth: W,
  videoHeight: H,
  safeZones: {
    caption: { x0: 76, y0: 1375, x1: 1004, y1: 1585 },
    platformUi: { x0: 0, y0: 0, x1: W, y1: 130 },
  },
  frames: scenes.map((scene, index) => {
    const start = scenes.slice(0, index).reduce((sum, item) => sum + item.duration, 0);
    return {
      index: index + 1,
      timeSeconds: Number((start + scene.duration * 0.55).toFixed(3)),
      elements: [
        {
          id: `${scene.id}:card-shell`,
          role: 'container',
          box: { x0: 58, y0: 78, x1: 1022, y1: 1288 },
          ignoreOverlap: true,
        },
        {
          id: `${scene.id}:header`,
          role: 'label',
          box: { x0: 94, y0: 116, x1: 986, y1: 194 },
        },
        {
          id: `${scene.id}:headline`,
          role: 'primary',
          box: {
            x0: 150,
            y0: scene.headline.length > 2 ? 255 : 305,
            x1: 930,
            y1: scene.headline.length > 2 ? 505 : 470,
          },
        },
        {
          id: `${scene.id}:visual`,
          role: 'visual',
          box: visualBox(scene),
        },
        {
          id: `${scene.id}:support-copy`,
          role: 'support',
          box: { x0: 164, y0: 940, x1: 916, y1: 1072 },
        },
        {
          id: `${scene.id}:progress`,
          role: 'progress',
          box: { x0: 150, y0: 1110, x1: 960, y1: 1165 },
        },
        {
          id: `${scene.id}:chips`,
          role: 'navigation',
          box: { x0: 65, y0: 1215, x1: 1015, y1: 1290 },
        },
      ],
    };
  }),
};
await writeFile(layoutPath, JSON.stringify(layoutAnnotations, null, 2));

for (let frame = 0; frame < totalFrames; frame++) {
  const framePath = join(framesDir, `frame-${String(frame).padStart(4, '0')}.jpg`);
  await sharp(Buffer.from(svg(frame)))
    .jpeg({ quality: 90 })
    .toFile(framePath);
  if (frame % 90 === 0) console.error(`rendered frame ${frame}/${totalFrames}`);
}

await run('ffmpeg', [
  '-nostdin',
  '-y',
  '-hide_banner',
  '-loglevel',
  'error',
  '-framerate',
  String(FPS),
  '-i',
  join(framesDir, 'frame-%04d.jpg'),
  '-i',
  audioPath,
  '-vf',
  `subtitles=${captionPath}`,
  '-map',
  '0:v:0',
  '-map',
  '1:a:0',
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '18',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-shortest',
  '-movflags',
  '+faststart',
  finalPath,
]);

if (!existsSync(finalPath)) {
  throw new Error(`Expected final video at ${finalPath}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      finalPath,
      motionBriefPath: join(workDir, 'motion-brief.v1.json'),
      layoutPath,
      totalFrames,
    },
    null,
    2
  )
);
