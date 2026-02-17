export interface ChunkTextForTtsOptions {
  /**
   * Soft maximum. The algorithm tries to keep chunks <= maxChars while
   * preserving sentence boundaries where possible.
   */
  maxChars: number;
}

/**
 * Chunk narration text into smaller pieces for TTS engines that struggle with long inputs.
 *
 * Goals:
 * - Prefer sentence boundaries (`.?!`) when available.
 * - Never emit empty chunks.
 * - Fall back to word-based splitting if a single sentence exceeds maxChars.
 */
export function chunkTextForTts(text: string, options: ChunkTextForTtsOptions): string[] {
  const maxChars = Math.max(10, Math.floor(options.maxChars));
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return [];
  if (normalized.length <= maxChars) return [normalized];

  // Split into sentence-like units (keep punctuation).
  const sentenceish = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [normalized];

  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed.length > 0) chunks.push(trimmed);
    current = '';
  };

  const pushWithWordFallback = (unit: string) => {
    const u = unit.trim();
    if (u.length === 0) return;
    if (u.length <= maxChars) {
      current = current.length === 0 ? u : `${current} ${u}`;
      return;
    }

    // If the unit itself is too large, flush current and split by words.
    flush();
    const words = u.split(' ').filter(Boolean);
    let acc = '';
    for (const w of words) {
      // Handle pathological cases (e.g. very long unbroken strings) by slicing.
      if (w.length > maxChars) {
        if (acc.length > 0) {
          chunks.push(acc);
          acc = '';
        }
        for (let i = 0; i < w.length; i += maxChars) {
          chunks.push(w.slice(i, i + maxChars));
        }
        continue;
      }

      const next = acc.length === 0 ? w : `${acc} ${w}`;
      if (next.length > maxChars) {
        if (acc.length > 0) chunks.push(acc);
        acc = w;
      } else {
        acc = next;
      }
    }
    if (acc.length > 0) chunks.push(acc);
  };

  for (const unit of sentenceish) {
    const u = unit.trim();
    if (u.length === 0) continue;

    if (current.length === 0) {
      pushWithWordFallback(u);
      continue;
    }

    // Attempt to append; if we'd exceed max, flush and start new.
    if (`${current} ${u}`.length > maxChars) {
      flush();
      pushWithWordFallback(u);
    } else {
      current = `${current} ${u}`;
    }
  }

  flush();
  return chunks;
}
