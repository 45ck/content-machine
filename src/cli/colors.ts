type ChalkLike = {
  bold: (text: string) => string;
  gray: (text: string) => string;
  green: (text: string) => string;
  yellow: (text: string) => string;
  red: (text: string) => string;
};

const passthrough = (text: string): string => text;

export let chalk: ChalkLike = {
  bold: passthrough,
  gray: passthrough,
  green: passthrough,
  yellow: passthrough,
  red: passthrough,
};

let started = false;

async function loadChalk(): Promise<void> {
  if (started) return;
  started = true;

  try {
    const mod = await import('chalk');
    const resolved = (mod as unknown as { default?: unknown }).default ?? mod;

    if (resolved && typeof (resolved as ChalkLike).bold === 'function') {
      chalk = resolved as ChalkLike;
    }
  } catch {
    // Optional dependency / ESM interop: fall back to no-color.
  }
}

void loadChalk();
