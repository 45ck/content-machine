import { mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import sharp from 'sharp';

const execFile = promisify(execFileCallback);
const rootDir = 'runs/cm-showcase-3d-runner';
const frameDir = join(rootDir, 'frames');
const width = 1080;
const height = 1920;
const designWidth = 1080;
const designHeight = 1920;
const fps = 24;
const durationSeconds = 31;
const totalFrames = Math.round(durationSeconds * fps);
const fontFamily = 'Noto Sans, Inter, DejaVu Sans, Arial, sans-serif';
const camera = { x: 0, y: 2.7, z: -7.5, focal: 980, horizon: 700 };

const beats = [
  { start: 0.0, end: 1.85, text: ['AI VIDEO AGENTS', 'HIDE THE MESS'], accent: 'MESS' },
  { start: 1.85, end: 3.95, text: ['THIS ONE SHOWS', 'EVERY FILE'], accent: 'FILE' },
  { start: 3.95, end: 6.15, text: ['SCRIPT.JSON', 'DROPS IN'], accent: 'SCRIPT.JSON' },
  { start: 6.15, end: 8.35, text: ['AUDIO.WAV', 'PULSES'], accent: 'AUDIO.WAV' },
  { start: 8.35, end: 10.55, text: ['CAPTIONS', 'SNAP ON'], accent: 'CAPTIONS' },
  { start: 10.55, end: 12.75, text: ['VALIDATE.JSON', 'REJECTS JUNK'], accent: 'REJECTS' },
  { start: 12.75, end: 15.0, text: ['AGENTS CAN', 'INSPECT IT'], accent: 'INSPECT' },
  { start: 15.0, end: 17.4, text: ['FIX ONLY', 'THE FAILED STAGE'], accent: 'ONLY' },
  { start: 17.4, end: 19.8, text: ['3D GAMEPLAY', 'IS CODE-NATIVE'], accent: '3D' },
  { start: 19.8, end: 22.2, text: ['NO STOLEN CLIPS', 'NO WATERMARKS'], accent: 'NO' },
  { start: 22.2, end: 24.8, text: ['1080×1920', 'PASSES AUDIT'], accent: '1080×1920' },
  { start: 24.8, end: 27.4, text: ['PROVENANCE', 'LEDGER ATTACHED'], accent: 'PROVENANCE' },
  { start: 27.4, end: 31.2, text: ['STAR IT +', 'RUN DOCTOR'], accent: 'STAR' },
];

const artifactRuns = [
  { start: 3.6, end: 6.3, label: 'script.json', color: '#38bdf8', lane: -1.15 },
  { start: 5.8, end: 8.6, label: 'audio.wav', color: '#22c55e', lane: 1.1 },
  { start: 8.0, end: 10.8, label: 'captions.ass', color: '#f472b6', lane: -0.15 },
  { start: 10.2, end: 13.0, label: 'validate.json', color: '#ef4444', lane: 0.95 },
  { start: 12.4, end: 15.25, label: 'skills/', color: '#a78bfa', lane: -1.1 },
  { start: 14.75, end: 17.6, label: 'failed stage', color: '#f59e0b', lane: 0.15 },
  { start: 17.2, end: 20.1, label: 'code-native 3d', color: '#22d3ee', lane: 1.0 },
  { start: 19.5, end: 22.5, label: 'no external clips', color: '#f97316', lane: -0.95 },
  { start: 21.9, end: 25.05, label: '1080x1920', color: '#60a5fa', lane: 0.1 },
  { start: 24.5, end: 27.65, label: 'asset-ledger.json', color: '#a3e635', lane: -0.55 },
  { start: 26.8, end: 30.5, label: 'pipeline passed', color: '#34d399', lane: 0 },
];

function clamp(value, minValue = 0, maxValue = 1) {
  return Math.min(maxValue, Math.max(minValue, value));
}
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { t = clamp(t); return 1 - Math.pow(1 - t, 3); }
function easeInOut(t) { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutBack(t) { t = clamp(t); const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
function escapeXml(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amount, 0, 255);
  const g = clamp(((n >> 8) & 255) + amount, 0, 255);
  const b = clamp((n & 255) + amount, 0, 255);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function project(point, yaw = 0) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const rx = point.x * cos - point.z * sin;
  const rz = point.x * sin + point.z * cos;
  const dz = rz - camera.z;
  if (dz <= 0.2) return null;
  const s = camera.focal / dz;
  return { x: designWidth / 2 + (rx - camera.x) * s, y: camera.horizon - (point.y - camera.y) * s, s, z: dz };
}

function polygon(points, fill, stroke = 'none', sw = 0, opacity = 1) {
  if (points.some((p) => !p)) return '';
  return `<polygon points="${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}" stroke-linejoin="round"/>`;
}

function face(points3, fill, stroke, sw, opacity = 1) {
  const points = points3.map((point) => project(point));
  const depth = points3.reduce((sum, point) => sum + point.z, 0) / points3.length;
  return { depth, svg: polygon(points, fill, stroke, sw, opacity) };
}

function cube({ x, y, z, w, h, d, color, stroke = '#020617', opacity = 1 }) {
  const x0 = x - w / 2, x1 = x + w / 2;
  const y0 = y, y1 = y + h;
  const z0 = z - d / 2, z1 = z + d / 2;
  const v = {
    fbl: { x: x0, y: y0, z: z0 }, fbr: { x: x1, y: y0, z: z0 }, ftl: { x: x0, y: y1, z: z0 }, ftr: { x: x1, y: y1, z: z0 },
    bbl: { x: x0, y: y0, z: z1 }, bbr: { x: x1, y: y0, z: z1 }, btl: { x: x0, y: y1, z: z1 }, btr: { x: x1, y: y1, z: z1 },
  };
  return [
    face([v.bbl, v.bbr, v.btr, v.btl], shade(color, -55), stroke, 2, opacity),
    face([v.fbr, v.bbr, v.btr, v.ftr], shade(color, -30), stroke, 2, opacity),
    face([v.fbl, v.bbl, v.btl, v.ftl], shade(color, -45), stroke, 2, opacity),
    face([v.ftl, v.ftr, v.btr, v.btl], shade(color, 38), stroke, 2, opacity),
    face([v.fbl, v.fbr, v.ftr, v.ftl], color, stroke, 2, opacity),
  ];
}

function textLine({ x, y, text, size, fill = '#fff', weight = 900, anchor = 'middle', opacity = 1, stroke = '#020617', strokeWidth = 0 }) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${fontFamily}" font-size="${size}" font-weight="${weight}" fill="${fill}" opacity="${opacity}" paint-order="stroke" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round">${escapeXml(text)}</text>`;
}

function rect({ x, y, w, h, rx = 24, fill = '#fff', stroke = 'none', sw = 0, opacity = 1 }) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}"/>`;
}

function activeBeat(time) { return beats.find((beat) => time >= beat.start && time < beat.end) ?? beats.at(-1); }
function beatProgress(beat, time) { return clamp((time - beat.start) / (beat.end - beat.start)); }

function background(time) {
  const pulse = 0.5 + Math.sin(time * 2.1) * 0.5;
  return `<defs>
    <linearGradient id="bg3d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617"/><stop offset="43%" stop-color="#111827"/><stop offset="100%" stop-color="#030712"/></linearGradient>
    <radialGradient id="glow3d" cx="50%" cy="34%" r="72%"><stop offset="0" stop-color="#22d3ee" stop-opacity="${0.24 + pulse * 0.08}"/><stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
    <filter id="shadow3d"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000" flood-opacity="0.45"/></filter>
    <filter id="glowText"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#22d3ee" flood-opacity="0.8"/></filter>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg3d)"/>
  <rect width="1080" height="1920" fill="url(#glow3d)"/>
  <g opacity="0.22" stroke="#67e8f9" stroke-width="2">
    ${Array.from({ length: 22 }, (_, i) => `<line x1="${i * 66 - ((time * 90) % 66)}" y1="0" x2="540" y2="720" opacity="${0.08 + (i % 3) * 0.03}"/>`).join('')}
  </g>`;
}

function road(time) {
  const faces = [];
  const speed = 18;
  const offset = (time * speed) % 8;
  for (let i = 0; i < 18; i++) {
    const z0 = 4 + i * 8 - offset;
    const z1 = z0 + 7.7;
    const fill = i % 2 === 0 ? '#0f172a' : '#111827';
    faces.push(face([{ x: -4.2, y: 0, z: z0 }, { x: 4.2, y: 0, z: z0 }, { x: 4.2, y: 0, z: z1 }, { x: -4.2, y: 0, z: z1 }], fill, '#1e293b', 1));
    for (const laneX of [-1.4, 1.4]) {
      faces.push(face([{ x: laneX - 0.035, y: 0.018, z: z0 + 1 }, { x: laneX + 0.035, y: 0.018, z: z0 + 1 }, { x: laneX + 0.035, y: 0.018, z: z1 - 1 }, { x: laneX - 0.035, y: 0.018, z: z1 - 1 }], '#38bdf8', 'none', 0, 0.75));
    }
    for (const sideX of [-4.55, 4.55]) {
      faces.push(...cube({ x: sideX, y: 0, z: z0 + 3.8, w: 0.22, h: 0.16, d: 6.3, color: '#0ea5e9', opacity: 0.78 }));
    }
  }
  return faces;
}

function city(time) {
  const faces = [];
  const speed = 10;
  for (let i = 0; i < 18; i++) {
    const z = 12 + ((i * 9 - time * speed) % 120 + 120) % 120;
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (6.2 + (i % 4) * 1.4);
    const h = 1.5 + (i % 5) * 0.62;
    const color = ['#1e3a8a', '#312e81', '#164e63', '#581c87'][i % 4];
    faces.push(...cube({ x, y: 0, z, w: 1.1 + (i % 3) * 0.4, h, d: 1.1, color, stroke: '#0f172a', opacity: 0.72 }));
  }
  return faces;
}

function artifactObjects(time) {
  const faces = [];
  const labels = [];
  for (const artifact of artifactRuns) {
    const p = clamp((time - artifact.start) / (artifact.end - artifact.start));
    if (p <= 0 || p >= 1) continue;
    const eased = easeInOut(p);
    const z = lerp(58, 5.5, eased);
    const bob = Math.sin((time - artifact.start) * 9) * 0.14;
    const size = artifact.label.length > 11 ? 1.45 : 1.3;
    faces.push(...cube({ x: artifact.lane, y: 0.18 + bob, z, w: size, h: 0.76, d: 1.0, color: artifact.color, stroke: '#020617', opacity: clamp((1 - p) / 0.14) }));
    const projected = project({ x: artifact.lane, y: 1.15 + bob, z: z - 0.55 });
    if (projected && projected.s > 15) {
      const opacity = clamp((1 - p) / 0.18);
      labels.push(`<g opacity="${opacity}" filter="url(#shadow3d)">${rect({ x: projected.x - 132 * projected.s / 120, y: projected.y - 34 * projected.s / 120, w: 264 * projected.s / 120, h: 54 * projected.s / 120, rx: 16 * projected.s / 120, fill: '#020617', stroke: artifact.color, sw: 2 })}${textLine({ x: projected.x, y: projected.y + 7 * projected.s / 120, text: artifact.label, size: Math.max(18, 27 * projected.s / 120), fill: '#f8fafc', weight: 950, strokeWidth: 2 })}</g>`);
    }
  }
  return { faces, labels };
}

function blackBox(time) {
  if (time > 2.05) return { faces: [], overlay: '' };
  const boom = clamp((time - 0.82) / 0.55);
  const shake = Math.sin(time * 80) * (1 - boom) * 0.18;
  const faces = cube({ x: shake, y: 0.55 + boom * 0.25, z: 15 - boom * 4, w: 2.4 + boom * 1.5, h: 1.75 + boom * 1.1, d: 1.7 + boom * 1.3, color: boom > 0 ? '#ef4444' : '#111827', stroke: boom > 0.4 ? '#fecaca' : '#64748b', opacity: 1 - clamp((time - 1.55) / 0.5) });
  const particles = Array.from({ length: 22 }, (_, i) => {
    const angle = (i / 22) * Math.PI * 2;
    const dist = boom * (70 + (i % 5) * 28);
    const x = 540 + Math.cos(angle) * dist;
    const y = 760 + Math.sin(angle) * dist;
    return `<circle cx="${x}" cy="${y}" r="${8 + (i % 4) * 4}" fill="${i % 2 ? '#facc15' : '#ef4444'}" opacity="${clamp(boom) * (1 - clamp((time - 1.48) / 0.52))}"/>`;
  }).join('');
  const overlay = time < 1.38 ? textLine({ x: 540, y: 758, text: 'BLACK BOX', size: 56, fill: '#fecaca', weight: 950, strokeWidth: 8 }) : particles;
  return { faces, overlay };
}

function validateGate(time) {
  if (time < 7.65 || time > 10.8) return { faces: [], overlay: '' };
  const p = clamp((time - 7.65) / 3.15);
  const z = lerp(48, 6.2, easeInOut(p));
  const opacity = clamp((1 - p) / 0.12);
  const faces = [];
  faces.push(...cube({ x: -2.7, y: 0, z, w: 0.36, h: 3.2, d: 0.55, color: '#ef4444', opacity }));
  faces.push(...cube({ x: 2.7, y: 0, z, w: 0.36, h: 3.2, d: 0.55, color: '#ef4444', opacity }));
  faces.push(...cube({ x: 0, y: 2.75, z, w: 5.8, h: 0.36, d: 0.55, color: '#ef4444', opacity }));
  const label = project({ x: 0, y: 3.65, z: z - 0.3 });
  const overlay = label ? `<g opacity="${opacity}" filter="url(#shadow3d)">${textLine({ x: label.x, y: label.y, text: 'REJECT JUNK', size: Math.max(28, label.s * 0.55), fill: '#fecaca', weight: 950, strokeWidth: 8 })}</g>` : '';
  return { faces, overlay };
}

function successPortal(time) {
  if (time < 26.8) return { faces: [], overlay: '' };
  const p = clamp((time - 26.8) / 2.4);
  const z = lerp(42, 8.2, easeOutCubic(p));
  const opacity = clamp(p / 0.2) * clamp((31.0 - time) / 0.5);
  const faces = [];
  faces.push(...cube({ x: 0, y: 0.12, z, w: 5.8, h: 3.6, d: 0.34, color: '#16a34a', stroke: '#bbf7d0', opacity: opacity * 0.62 }));
  const center = project({ x: 0, y: 2.25, z: z - 0.28 });
  const overlay = center ? `<g opacity="${opacity}" filter="url(#glowText)">${textLine({ x: center.x, y: center.y, text: 'PIPELINE PASSED', size: Math.max(34, center.s * 0.58), fill: '#bbf7d0', weight: 950, strokeWidth: 8 })}</g>` : '';
  return { faces, overlay };
}

function runner(time) {
  const lean = Math.sin(time * 5.2) * 5;
  const bob = Math.sin(time * 13) * 12;
  return `<g transform="translate(540 ${1510 + bob}) rotate(${lean})" filter="url(#shadow3d)">
    <ellipse cx="0" cy="164" rx="92" ry="22" fill="#000" opacity="0.36"/>
    <path d="M-125 122 C-58 84 58 84 125 122 L88 164 C24 186 -24 186 -88 164 Z" fill="#38bdf8" stroke="#cffafe" stroke-width="8"/>
    <circle cx="0" cy="-74" r="50" fill="#f8fafc" stroke="#020617" stroke-width="8"/>
    <rect x="-52" y="-22" width="104" height="138" rx="36" fill="#8b5cf6" stroke="#020617" stroke-width="8"/>
    <path d="M-46 34 L-112 92" stroke="#f8fafc" stroke-width="22" stroke-linecap="round"/>
    <path d="M46 34 L112 92" stroke="#f8fafc" stroke-width="22" stroke-linecap="round"/>
    <path d="M-22 108 L-72 178" stroke="#f8fafc" stroke-width="25" stroke-linecap="round"/>
    <path d="M22 108 L74 178" stroke="#f8fafc" stroke-width="25" stroke-linecap="round"/>
    <text x="0" y="23" text-anchor="middle" font-family="${fontFamily}" font-size="36" font-weight="950" fill="#fff">CM</text>
  </g>`;
}

function runner3dParts(time) {
  const bob = Math.sin(time * 12.5) * 0.08;
  const sway = Math.sin(time * 4.8) * 0.22;
  const armSwing = Math.sin(time * 9.5) * 0.18;
  const legSwing = Math.sin(time * 9.5 + Math.PI) * 0.12;
  const z = 4.65;
  const x = sway;
  const y = bob;
  const faces = [];

  faces.push(
    ...cube({
      x,
      y: 0.14 + y,
      z: z + 0.06,
      w: 2.35,
      h: 0.18,
      d: 1.05,
      color: '#22d3ee',
      stroke: '#cffafe',
      opacity: 1,
    })
  );
  faces.push(
    ...cube({
      x,
      y: 0.38 + y,
      z,
      w: 0.72,
      h: 0.92,
      d: 0.52,
      color: '#8b5cf6',
      stroke: '#020617',
      opacity: 1,
    })
  );
  faces.push(
    ...cube({
      x,
      y: 1.38 + y,
      z: z - 0.02,
      w: 0.64,
      h: 0.58,
      d: 0.58,
      color: '#f8fafc',
      stroke: '#020617',
      opacity: 1,
    })
  );
  faces.push(
    ...cube({
      x: x - 0.62,
      y: 0.82 + y + armSwing * 0.24,
      z: z + 0.05,
      w: 0.22,
      h: 0.74,
      d: 0.28,
      color: '#f8fafc',
      stroke: '#020617',
      opacity: 1,
    })
  );
  faces.push(
    ...cube({
      x: x + 0.62,
      y: 0.82 + y - armSwing * 0.24,
      z: z + 0.05,
      w: 0.22,
      h: 0.74,
      d: 0.28,
      color: '#f8fafc',
      stroke: '#020617',
      opacity: 1,
    })
  );
  faces.push(
    ...cube({
      x: x - 0.28,
      y: 0.18 + y + legSwing,
      z: z - 0.06,
      w: 0.24,
      h: 0.58,
      d: 0.28,
      color: '#e0f2fe',
      stroke: '#020617',
      opacity: 1,
    })
  );
  faces.push(
    ...cube({
      x: x + 0.28,
      y: 0.18 + y - legSwing,
      z: z - 0.06,
      w: 0.24,
      h: 0.58,
      d: 0.28,
      color: '#e0f2fe',
      stroke: '#020617',
      opacity: 1,
    })
  );

  const faceCenter = project({ x, y: 1.72 + y, z: z - 0.32 });
  const boardCenter = project({ x, y: 0.38 + y, z: z - 0.62 });
  const overlay = `${faceCenter ? `<g filter="url(#shadow3d)">${textLine({ x: faceCenter.x, y: faceCenter.y + 8, text: 'CM', size: Math.max(22, faceCenter.s * 0.22), fill: '#020617', weight: 950, stroke: 'none' })}</g>` : ''}${
    boardCenter
      ? `<g opacity="0.82">${polygon(
          [
            { x: boardCenter.x - boardCenter.s * 1.6, y: boardCenter.y + boardCenter.s * 0.15 },
            { x: boardCenter.x + boardCenter.s * 1.6, y: boardCenter.y + boardCenter.s * 0.15 },
            { x: boardCenter.x + boardCenter.s * 2.7, y: boardCenter.y + boardCenter.s * 0.75 },
            { x: boardCenter.x - boardCenter.s * 2.7, y: boardCenter.y + boardCenter.s * 0.75 },
          ],
          '#22d3ee',
          'none',
          0,
          0.16
        )}</g>`
      : ''
  }`;

  return { faces, overlay };
}

function captionLayer(time) {
  const beat = activeBeat(time);
  const p = beatProgress(beat, time);
  const pop = easeOutBack(p / 0.16);
  const opacity = clamp(Math.min(p / 0.1, (beat.end - time) / 0.16));
  const scale = 0.91 + clamp(pop) * 0.09;
  const y = time < 2.2 ? 1185 : time > 14 ? 1070 : 990;
  return `<g transform="scale(${scale})" transform-origin="540 ${y}" opacity="${opacity}" filter="url(#shadow3d)">
    ${rect({ x: 72, y: y - 120, w: 936, h: 244, rx: 42, fill: '#020617', stroke: '#22d3ee', sw: 4, opacity: 0.9 })}
    ${textLine({ x: 540, y: y - 30, text: beat.text[0], size: beat.text[0].length > 14 ? 48 : 58, fill: '#f8fafc', weight: 950, strokeWidth: 9 })}
    ${textLine({ x: 540, y: y + 48, text: beat.text[1], size: beat.text[1].length > 15 ? 46 : 58, fill: '#facc15', weight: 950, strokeWidth: 9 })}
  </g>`;
}

function hud(time, frame) {
  const progress = frame / Math.max(1, totalFrames - 1);
  const show3d = clamp((time - 1.3) / 0.5);
  return `<g>
    ${rect({ x: 54, y: 54, w: 972, h: 78, rx: 39, fill: '#020617', stroke: '#1e293b', sw: 2, opacity: 0.82 })}
    <circle cx="98" cy="94" r="13" fill="#22c55e" opacity="${0.6 + Math.sin(time * 8) * 0.25}"/>
    ${textLine({ x: 128, y: 104, text: 'CONTENT MACHINE', size: 29, fill: '#e2e8f0', weight: 950, anchor: 'start' })}
    ${textLine({ x: 777, y: 104, text: '3D RUNNER', size: 27, fill: '#67e8f9', weight: 950, anchor: 'start', opacity: show3d })}
    ${rect({ x: 70, y: 1810, w: 940, h: 12, rx: 6, fill: '#020617', opacity: 0.78 })}
    ${rect({ x: 70, y: 1810, w: 940 * progress, h: 12, rx: 6, fill: '#22d3ee' })}
  </g>`;
}

function finalSlug(time) {
  if (time < 27.8) return '';
  const p = clamp((time - 27.8) / 0.5);
  return `<g opacity="${p}" filter="url(#shadow3d)">
    ${rect({ x: 90, y: 1295, w: 900, h: 154, rx: 42, fill: '#052e16', stroke: '#34d399', sw: 4, opacity: 0.92 })}
    ${textLine({ x: 540, y: 1362, text: 'github.com/45ck/content-machine', size: 39, fill: '#dcfce7', weight: 950, strokeWidth: 5 })}
    ${textLine({ x: 540, y: 1418, text: 'open source • agent-readable • debuggable', size: 29, fill: '#bbf7d0', weight: 850, strokeWidth: 3 })}
  </g>`;
}

function transitionFlash(time) {
  const index = beats.findIndex(
    (beat) => beat.start > 0 && time >= beat.start && time < beat.start + 0.16
  );
  if (index < 0) return '';
  const beat = beats[index];
  const progress = clamp((time - beat.start) / 0.16);
  const opacity = Math.sin(progress * Math.PI) * 0.72;
  const colors = ['#22d3ee', '#facc15', '#a78bfa', '#34d399', '#f472b6'];
  const color = colors[index % colors.length];
  return `<g opacity="${opacity}">
    <rect width="1080" height="1920" fill="${color}"/>
    <rect x="60" y="170" width="960" height="1580" rx="70" fill="none" stroke="#f8fafc" stroke-width="10"/>
  </g>`;
}

function renderSvg(frame) {
  const time = frame / fps;
  const faces = [];
  faces.push(...city(time));
  faces.push(...road(time));
  const black = blackBox(time);
  faces.push(...black.faces);
  const gate = validateGate(time);
  faces.push(...gate.faces);
  const portal = successPortal(time);
  faces.push(...portal.faces);
  const artifacts = artifactObjects(time);
  faces.push(...artifacts.faces);
  const runner3d = runner3dParts(time);
  faces.push(...runner3d.faces);
  const sortedFaces = faces.sort((a, b) => b.depth - a.depth).map((item) => item.svg).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1080 1920">
    ${background(time)}
    ${sortedFaces}
    ${black.overlay}
    ${gate.overlay}
    ${portal.overlay}
    ${artifacts.labels.join('')}
    ${runner3d.overlay}
    ${captionLayer(time)}
    ${finalSlug(time)}
    ${transitionFlash(time)}
    ${hud(time, frame)}
  </svg>`;
}

async function writePulseAudio(audioPath) {
  const sampleRate = 48000;
  const samples = Math.floor(durationSeconds * sampleRate);
  const dataSize = samples * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + dataSize, 4); header.write('WAVE', 8); header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(dataSize, 40);
  const stream = createWriteStream(audioPath);
  stream.write(header);
  const chunkSamples = 4096;
  for (let start = 0; start < samples; start += chunkSamples) {
    const count = Math.min(chunkSamples, samples - start);
    const buffer = Buffer.alloc(count * 2);
    for (let i = 0; i < count; i++) {
      const t = (start + i) / sampleRate;
      const beat = t % 0.32;
      const env = beat < 0.075 ? Math.exp(-beat * 34) : 0;
      const kick = Math.sin(2 * Math.PI * 76 * t) * 0.58 * env;
      const hat = Math.sin(2 * Math.PI * 1900 * t) * 0.052 * (beat < 0.035 ? 1 : 0);
      const rise = Math.sin(2 * Math.PI * (220 + t * 6) * t) * 0.035;
      const hit = beats.some((b) => Math.abs(t - b.start) < 0.045) ? Math.sin(2 * Math.PI * 520 * t) * 0.18 : 0;
      const value = clamp(kick + hat + rise + hit, -0.82, 0.82);
      buffer.writeInt16LE(Math.round(value * 32767), i * 2);
    }
    stream.write(buffer);
  }
  await new Promise((resolvePromise) => stream.end(resolvePromise));
}

async function render() {
  await rm(frameDir, { recursive: true, force: true });
  await mkdir(frameDir, { recursive: true });
  console.log(`Rendering ${totalFrames} 3D JS frames...`);
  for (let frame = 0; frame < totalFrames; frame++) {
    await sharp(Buffer.from(renderSvg(frame))).png().toFile(join(frameDir, `frame-${String(frame + 1).padStart(4, '0')}.png`));
    if ((frame + 1) % 90 === 0) console.log(`Rendered ${frame + 1}/${totalFrames}`);
  }
  const audioPath = join(rootDir, 'pulse-bed.wav');
  await writePulseAudio(audioPath);
  const videoPath = join(rootDir, 'content-machine-3d-runner.mp4');
  await execFile('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(frameDir, 'frame-%04d.png'), '-i', audioPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-shortest', videoPath]);
  const sheetPath = join(rootDir, 'contact-sheet.jpg');
  await execFile('ffmpeg', ['-y', '-i', videoPath, '-vf', "select='eq(n,18)+eq(n,72)+eq(n,135)+eq(n,210)+eq(n,300)+eq(n,430)',scale=270:480,tile=3x2", '-frames:v', '1', sheetPath]);
  const htmlPath = join(rootDir, 'preview.html');
  const absVideo = resolve(videoPath);
  const absSheet = resolve(sheetPath);
  await writeFile(htmlPath, `<!doctype html><meta charset="utf-8"><title>Content Machine 3D Runner</title><body style="margin:0;background:#020617;color:white;font-family:system-ui;display:grid;place-items:center;min-height:100vh"><main style="display:flex;gap:24px;align-items:center"><video src="file://${absVideo}" controls autoplay loop style="height:94vh;max-width:54vw;border-radius:22px;box-shadow:0 24px 90px #000"></video><section style="max-width:430px"><h1>Content Machine 3D Runner</h1><p>3D JavaScript-style pipeline chase: files become track objects, validate gate rejects junk, final CTA lands fast.</p><p><a style="color:#67e8f9" href="file://${absVideo}">Open MP4 directly</a></p><img src="file://${absSheet}" style="width:100%;border-radius:16px"></section></main></body>`);
  const videoStat = await stat(videoPath);
  const manifest = { title: 'Content Machine 3D Runner', videoPath, contactSheetPath: sheetPath, htmlPath, durationSeconds, fps, width, height, fileSizeBytes: videoStat.size, note: 'Deterministic JavaScript software-3D endless-runner showcase. No external assets or API keys.' };
  await writeFile(join(rootDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}

render().catch((error) => { console.error(error); process.exit(1); });
