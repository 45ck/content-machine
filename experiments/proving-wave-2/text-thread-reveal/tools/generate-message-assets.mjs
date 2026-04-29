import fs from 'node:fs';
import path from 'node:path';

const laneDir = path.resolve('experiments/proving-wave-2/text-thread-reveal');
const beatsPath = path.join(laneDir, 'assets', 'messages', 'beats.json');
const outputDir = path.join(laneDir, 'assets', 'messages', 'generated');

const beats = JSON.parse(fs.readFileSync(beatsPath, 'utf8'));

const width = 1080;
const height = 960;

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(text, maxChars = 24) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

function bubbleWidth(lines) {
  const chars = Math.max(...lines.map((line) => line.length), 1);
  return Math.min(740, Math.max(220, chars * 19 + 70));
}

function renderBubble(message, x, y, widthPx, heightPx) {
  const isRight = message.side === 'right';
  const isSystem = message.side === 'system';
  const isTyping = message.side === 'typing';
  const fill = isSystem ? '#23262f' : isRight ? '#2374ff' : '#edf0f6';
  const textColor = isSystem ? '#f5f7fb' : isRight ? '#ffffff' : '#11151e';
  const rx = isSystem ? 26 : 32;

  let content = '';
  if (isTyping) {
    content = `
      <circle cx="${x + 44}" cy="${y + 32}" r="8" fill="#d7dbe6" />
      <circle cx="${x + 72}" cy="${y + 32}" r="8" fill="#c7ccda" />
      <circle cx="${x + 100}" cy="${y + 32}" r="8" fill="#d7dbe6" />
    `;
  } else {
    const lines = wrapText(message.text, isSystem ? 28 : 22);
    content = lines
      .map((line, index) => {
        const lineY = y + 38 + index * 38;
        return `<text x="${x + 28}" y="${lineY}" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="${textColor}">${escapeXml(line)}</text>`;
      })
      .join('\n');
  }

  return `
    <g>
      <rect x="${x}" y="${y}" width="${widthPx}" height="${heightPx}" rx="${rx}" fill="${fill}" />
      ${content}
    </g>
  `;
}

function buildSvg(beat) {
  const header = escapeXml(beat.header);
  const subheader = escapeXml(beat.subheader);
  const footer = escapeXml(beat.footer ?? '');
  const scale = Number(beat.scale ?? 1);
  const offsetY = Number(beat.offsetY ?? 0);

  let cursorY = 190;
  const bubbles = [];

  for (const message of beat.messages) {
    const lines = message.side === 'typing' ? ['typing'] : wrapText(message.text, message.side === 'system' ? 28 : 22);
    const widthPx =
      message.side === 'typing'
        ? 150
        : bubbleWidth(lines) + (message.side === 'system' ? 30 : 0);
    const heightPx =
      message.side === 'typing' ? 64 : Math.max(72, 52 + lines.length * 38);
    const x =
      message.side === 'right'
        ? width - widthPx - 74
        : message.side === 'system'
          ? (width - widthPx) / 2
          : 74;
    bubbles.push(renderBubble(message, x, cursorY, widthPx, heightPx));
    cursorY += heightPx + 24;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d111a" />
      <stop offset="100%" stop-color="#151b27" />
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.14)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.06)" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <circle cx="968" cy="88" r="180" fill="rgba(36,116,255,0.18)" />
  <circle cx="110" cy="870" r="160" fill="rgba(255,115,86,0.12)" />
  <rect x="34" y="34" width="${width - 68}" height="${height - 68}" rx="46" fill="rgba(10,14,22,0.78)" stroke="rgba(255,255,255,0.12)" />
  <text x="98" y="104" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700" fill="#f6f8fc">12:2${header === 'Liam' ? '1' : '3'}</text>
  <rect x="418" y="88" width="244" height="16" rx="8" fill="rgba(255,255,255,0.9)" />
  <g transform="translate(0, ${offsetY}) scale(${scale})">
    <text x="540" y="138" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="800" fill="#f7f9fc">${header}</text>
    <text x="540" y="172" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600" fill="#9aa4b7">${subheader}</text>
    ${bubbles.join('\n')}
  </g>
  <text x="540" y="912" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" fill="#8d97ab">${footer}</text>
</svg>`;
}

fs.mkdirSync(outputDir, { recursive: true });

for (const beat of beats) {
  const svg = buildSvg(beat);
  const outputPath = path.join(outputDir, `${beat.id}.svg`);
  fs.writeFileSync(outputPath, svg, 'utf8');
  console.log(outputPath);
}
