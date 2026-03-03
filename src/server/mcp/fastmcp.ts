/**
 * FastMCP loader + Node compatibility shims.
 *
 * FastMCP depends on undici which expects `globalThis.File` to exist. Node 18
 * provides `Blob` but not `File`, so we polyfill `File` before importing.
 */

type FastMcpModule = typeof import('fastmcp');

let cached: Promise<FastMcpModule> | undefined;

function ensureFileGlobal(): void {
  const g = globalThis as unknown as {
    File?: unknown;
    Blob?: unknown;
  };

  if (typeof g.File === 'function') return;

  const BlobCtor = g.Blob as undefined | (new (parts?: any[], options?: any) => any);
  if (typeof BlobCtor !== 'function') return;

  class FilePolyfill extends BlobCtor {
    readonly name: string;
    readonly lastModified: number;

    constructor(parts: any[], name: string, options?: { lastModified?: number; type?: string }) {
      super(parts, options);
      this.name = String(name);
      this.lastModified =
        typeof options?.lastModified === 'number' ? options.lastModified : Date.now();
    }

    get [Symbol.toStringTag](): string {
      return 'File';
    }
  }

  g.File = FilePolyfill;
}

export async function loadFastMcp(): Promise<FastMcpModule> {
  cached ??= (async () => {
    ensureFileGlobal();
    return import('fastmcp');
  })();
  return cached;
}
