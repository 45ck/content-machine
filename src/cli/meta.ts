import { createRequire } from 'node:module';

const require = createRequire(typeof __filename === 'string' ? __filename : import.meta.url);
export const { version } = require('../../package.json') as { version: string };
