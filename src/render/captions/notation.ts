import type { CaptionConfig } from './config';

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
};

const GREEK_WORD_MAP: Record<string, string> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  theta: 'θ',
  lambda: 'λ',
  sigma: 'σ',
  omega: 'ω',
  pi: 'π',
};

function convertMapped(value: string, map: Record<string, string>): string {
  let output = '';
  for (const ch of value) {
    const mapped = map[ch];
    if (!mapped) return value;
    output += mapped;
  }
  return output;
}

export function applyNotationTransform(
  text: string,
  mode: CaptionConfig['notationMode'] | undefined
): string {
  if (!text || mode === 'none' || mode === undefined) return text;

  let output = text;

  output = output
    .replace(/<->/g, '↔')
    .replace(/->/g, '→')
    .replace(/=>/g, '⇒')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/\+\/-/g, '±')
    .replace(/~=/g, '≈');

  output = output.replace(/\bsqrt\s*\(/gi, '√(');

  output = output.replace(/\b([a-zA-Z]+)\^([0-9+\-=()]+)\b/g, (_, base: string, exp: string) => {
    return `${base}${convertMapped(exp, SUPERSCRIPT_MAP)}`;
  });

  output = output.replace(/\b([a-zA-Z]+)_([0-9+\-=()]+)\b/g, (_, base: string, sub: string) => {
    return `${base}${convertMapped(sub, SUBSCRIPT_MAP)}`;
  });

  output = output.replace(/\b([a-z]+)\b/gi, (word: string) => {
    const mapped = GREEK_WORD_MAP[word.toLowerCase()];
    return mapped ?? word;
  });

  return output;
}

export function applyCaptionDisplayTransform(
  text: string,
  config: Pick<CaptionConfig, 'textTransform' | 'notationMode'>
): string {
  let output = text;

  switch (config.textTransform) {
    case 'uppercase':
      output = output.toUpperCase();
      break;
    case 'lowercase':
      output = output.toLowerCase();
      break;
    case 'capitalize':
      output = output.charAt(0).toUpperCase() + output.slice(1);
      break;
    default:
      break;
  }

  return applyNotationTransform(output, config.notationMode);
}
