/**
 * Script ↔ ASR match metrics.
 *
 * Used to detect when captions drift from the intended script text.
 */

export interface ScriptMatchMetrics {
  lcsRatio: number; // LCS / max(len(script), len(asr))
  scriptCoverage: number; // LCS / len(script)
  asrCoverage: number; // LCS / len(asr)
  lcsLength: number;
  scriptTokenCount: number;
  asrTokenCount: number;
}

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9']/g, '')
    .trim();
}

function tokenizeScript(text: string): string[] {
  return text
    .split(/\s+/)
    .map((t) => normalizeToken(t))
    .filter(Boolean);
}

function tokenizeWords(words: Array<{ word: string }>): string[] {
  return words.map((w) => normalizeToken(w.word)).filter(Boolean);
}

function lcsLength(a: string[], b: string[]): number {
  // DP with rolling arrays: O(n*m) but n,m are small (~100-300).
  const m = b.length;
  let prev = new Uint16Array(m + 1);
  let curr = new Uint16Array(m + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = 0;
    const ai = a[i - 1];
    for (let j = 1; j <= m; j++) {
      if (ai === b[j - 1]) {
        curr[j] = (prev[j - 1] + 1) as number;
      } else {
        curr[j] = (prev[j] > curr[j - 1] ? prev[j] : curr[j - 1]) as number;
      }
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[m] ?? 0;
}

export function computeScriptMatchMetrics(params: {
  scriptText: string;
  asrWords: Array<{ word: string }>;
}): ScriptMatchMetrics {
  const scriptTokens = tokenizeScript(params.scriptText);
  const asrTokens = tokenizeWords(params.asrWords);
  const lcs = lcsLength(scriptTokens, asrTokens);

  const scriptLen = scriptTokens.length;
  const asrLen = asrTokens.length;
  const denom = Math.max(1, Math.max(scriptLen, asrLen));

  return {
    lcsRatio: lcs / denom,
    scriptCoverage: lcs / Math.max(1, scriptLen),
    asrCoverage: lcs / Math.max(1, asrLen),
    lcsLength: lcs,
    scriptTokenCount: scriptLen,
    asrTokenCount: asrLen,
  };
}
