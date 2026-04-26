import { createRequire } from 'node:module';
import { resolvePackageJsonPath } from '../core/package-root';

const require = createRequire(typeof __filename === 'string' ? __filename : import.meta.url);
export const { version } = require(resolvePackageJsonPath(import.meta.url)) as { version: string };
