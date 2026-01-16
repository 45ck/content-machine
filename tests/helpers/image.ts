import { PNG } from 'pngjs';

export type DecodedImage = {
  width: number;
  height: number;
  data: Uint8Array;
};

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export function decodePng(buffer: Buffer): DecodedImage {
  const image = PNG.sync.read(buffer);
  return { width: image.width, height: image.height, data: image.data };
}

function isInkPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  background: RgbColor,
  threshold: number
): boolean {
  if (a < 10) return false;
  const distance =
    Math.abs(r - background.r) + Math.abs(g - background.g) + Math.abs(b - background.b);
  return distance > threshold;
}

export function findInkBoundingBox(
  image: DecodedImage,
  background: RgbColor,
  threshold = 20
): { minX: number; minY: number; maxX: number; maxY: number } {
  const { width, height, data } = image;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (!isInkPixel(r, g, b, a, background, threshold)) continue;
      found = true;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!found) {
    throw new Error('No ink pixels found in rendered still.');
  }

  return { minX, minY, maxX, maxY };
}

export function computeMinGapBetweenInkRuns(
  image: DecodedImage,
  options: {
    background: RgbColor;
    threshold?: number;
    minInkPixels?: number;
    minGapPx?: number;
    minRunWidth?: number;
  }
): number {
  const { background } = options;
  const threshold = options.threshold ?? 20;
  const minInkPixels = options.minInkPixels ?? 3;
  const minGapPx = options.minGapPx ?? 0;
  const minRunWidth = options.minRunWidth ?? 1;
  const { width, data } = image;
  const bounds = findInkBoundingBox(image, background, threshold);
  const columns = new Array(width).fill(0);

  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    let inkCount = 0;
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (isInkPixel(r, g, b, a, background, threshold)) {
        inkCount++;
      }
    }
    columns[x] = inkCount;
  }

  const runs: Array<{ start: number; end: number }> = [];
  let runStart: number | null = null;

  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    const hasInk = columns[x] >= minInkPixels;
    if (hasInk && runStart === null) {
      runStart = x;
    } else if (!hasInk && runStart !== null) {
      runs.push({ start: runStart, end: x - 1 });
      runStart = null;
    }
  }
  if (runStart !== null) {
    runs.push({ start: runStart, end: bounds.maxX });
  }

  const filteredRuns = runs.filter((run) => run.end - run.start + 1 >= minRunWidth);

  if (filteredRuns.length < 2) {
    throw new Error('Not enough ink runs to compute word gaps.');
  }

  let minGap = Number.POSITIVE_INFINITY;
  for (let i = 1; i < filteredRuns.length; i++) {
    const gap = filteredRuns[i].start - filteredRuns[i - 1].end - 1;
    if (gap >= minGapPx) {
      minGap = Math.min(minGap, gap);
    }
  }

  if (!Number.isFinite(minGap)) {
    throw new Error('Unable to compute minimum gap.');
  }

  return minGap;
}

export function computeMinVerticalGapBetweenInkRuns(
  image: DecodedImage,
  options: {
    background: RgbColor;
    threshold?: number;
    minInkPixels?: number;
  }
): number {
  const { background } = options;
  const threshold = options.threshold ?? 20;
  const minInkPixels = options.minInkPixels ?? 3;
  const { height, data, width } = image;
  const bounds = findInkBoundingBox(image, background, threshold);
  const rows = new Array(height).fill(0);

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    let inkCount = 0;
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (isInkPixel(r, g, b, a, background, threshold)) {
        inkCount++;
      }
    }
    rows[y] = inkCount;
  }

  const runs: Array<{ start: number; end: number }> = [];
  let runStart: number | null = null;

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    const hasInk = rows[y] >= minInkPixels;
    if (hasInk && runStart === null) {
      runStart = y;
    } else if (!hasInk && runStart !== null) {
      runs.push({ start: runStart, end: y - 1 });
      runStart = null;
    }
  }
  if (runStart !== null) {
    runs.push({ start: runStart, end: bounds.maxY });
  }

  if (runs.length < 2) {
    throw new Error('Not enough ink runs to compute line gaps.');
  }

  let minGap = Number.POSITIVE_INFINITY;
  for (let i = 1; i < runs.length; i++) {
    const gap = runs[i].start - runs[i - 1].end - 1;
    if (gap >= 0) {
      minGap = Math.min(minGap, gap);
    }
  }

  if (!Number.isFinite(minGap)) {
    throw new Error('Unable to compute minimum vertical gap.');
  }

  return minGap;
}
