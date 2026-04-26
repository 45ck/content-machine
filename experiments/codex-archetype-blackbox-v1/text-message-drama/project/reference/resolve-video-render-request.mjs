import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const request = JSON.parse(
  readFileSync(resolve(here, 'video-render.request.example.json'), 'utf8')
);

const candidates = [
  {
    chromeMode: 'headless-shell',
    browserExecutable: resolve(
      here,
      '../node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell'
    ),
  },
  {
    chromeMode: 'chrome-for-testing',
    browserExecutable: resolve(
      here,
      '../node_modules/.remotion/chrome-for-testing/linux64/chrome-linux64/chrome'
    ),
  },
  {
    chromeMode: 'headless-shell',
    browserExecutable: resolve(
      here,
      '../../../../../node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell'
    ),
  },
  {
    chromeMode: 'chrome-for-testing',
    browserExecutable: resolve(
      here,
      '../../../../../node_modules/.remotion/chrome-for-testing/linux64/chrome-linux64/chrome'
    ),
  },
];

const cachedBrowser = candidates.find((candidate) => existsSync(candidate.browserExecutable));

if (cachedBrowser) {
  request.browserExecutable = cachedBrowser.browserExecutable;
  request.chromeMode = cachedBrowser.chromeMode;
}

process.stdout.write(`${JSON.stringify(request, null, 2)}\n`);
