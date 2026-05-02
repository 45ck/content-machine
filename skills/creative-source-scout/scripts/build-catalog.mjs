#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutputPath = path.join(skillDir, 'references', 'creative-source-catalog.v1.json');
const catalogLimit = Number.parseInt(process.env.CM_CREATIVE_SOURCE_CATALOG_LIMIT ?? '1000', 10);
const generatedOn = process.env.CM_CREATIVE_SOURCE_CATALOG_DATE ?? '2026-05-02';

const args = new Set(process.argv.slice(2));
const checkMode = args.has('--check');
const outputPathArg = process.argv.find((arg) => arg.startsWith('--output='));
const outputPath = outputPathArg
  ? path.resolve(outputPathArg.slice('--output='.length))
  : defaultOutputPath;

const sourceLists = [
  {
    id: 'bradtraversy-design-resources',
    title: 'Design Resources For Developers',
    url: 'https://raw.githubusercontent.com/bradtraversy/design-resources-for-developers/master/readme.md',
    tags: ['design-resources', 'visual-assets', 'ui'],
  },
  {
    id: 'goabstract-design-tools',
    title: 'Awesome Design Tools',
    url: 'https://raw.githubusercontent.com/goabstract/Awesome-Design-Tools/master/README.md',
    tags: ['design-tools', 'animation', 'stock-media', '3d'],
  },
  {
    id: 'goabstract-design-ui-kits',
    title: 'Awesome Design UI Kits',
    url: 'https://raw.githubusercontent.com/goabstract/Awesome-Design-Tools/master/Awesome-Design-UI-Kits.md',
    tags: ['ui-components', 'design-systems'],
  },
  {
    id: 'goabstract-design-plugins',
    title: 'Awesome Design Plugins',
    url: 'https://raw.githubusercontent.com/goabstract/Awesome-Design-Tools/master/Awesome-Design-Plugins.md',
    tags: ['plugins', 'design-tools'],
  },
  {
    id: 'terkelg-creative-coding',
    title: 'Awesome Creative Coding',
    url: 'https://raw.githubusercontent.com/terkelg/awesome-creative-coding/main/readme.md',
    tags: ['creative-coding', 'webgl', 'generative-art'],
  },
  {
    id: 'backblaze-video-generation',
    title: 'Awesome Video Generation',
    url: 'https://raw.githubusercontent.com/backblaze-b2-samples/awesome-video-generation/main/README.md',
    tags: ['ai-video', 'video-generation'],
  },
  {
    id: 'camilleroux-generative-art',
    title: 'Awesome Generative Art',
    url: 'https://raw.githubusercontent.com/camilleroux/awesome-generative-art/main/readme.md',
    tags: ['generative-art', 'creative-coding'],
  },
  {
    id: 'kosmos-generative-art',
    title: 'Awesome Generative Art Resources',
    url: 'https://raw.githubusercontent.com/kosmos/awesome-generative-art/master/readme.md',
    tags: ['generative-art', 'creative-coding'],
  },
  {
    id: 'ellisonleao-magictools',
    title: 'Magic Tools',
    url: 'https://raw.githubusercontent.com/ellisonleao/magictools/master/README.md',
    tags: ['game-dev-assets', 'audio', '3d-assets'],
  },
];

const prioritySeeds = [
  ['21st.dev', 'https://21st.dev/', 'ui-components', ['animation', 'agent-ui']],
  ['ui.aceternity.com', 'https://ui.aceternity.com/', 'ui-components', ['animation']],
  ['magicui.design', 'https://magicui.design/', 'ui-components', ['animation']],
  ['reactbits.dev', 'https://reactbits.dev/', 'ui-components', ['animation']],
  ['motion-primitives.com', 'https://motion-primitives.com/', 'animation-motion', ['react']],
  ['animata.design', 'https://animata.design/', 'animation-motion', ['react']],
  ['cult-ui.com', 'https://www.cult-ui.com/', 'ui-components', ['animation']],
  ['shadcn.io', 'https://ui.shadcn.com/', 'ui-components', ['components']],
  ['framer.com', 'https://www.framer.com/', 'animation-motion', ['web-design']],
  ['motion.dev', 'https://motion.dev/', 'animation-motion', ['react']],
  ['lottiefiles.com', 'https://lottiefiles.com/', 'animation-motion', ['lottie']],
  ['rive.app', 'https://rive.app/', 'animation-motion', ['interactive-animation']],
  ['gsap.com', 'https://gsap.com/', 'animation-motion', ['javascript']],
  ['animejs.com', 'https://animejs.com/', 'animation-motion', ['javascript']],
  ['threejs.org', 'https://threejs.org/', '3d-assets', ['webgl']],
  ['docs.pmnd.rs', 'https://docs.pmnd.rs/react-three-fiber/', '3d-assets', ['react-three']],
  ['spline.design', 'https://spline.design/', '3d-assets', ['web-3d']],
  ['sketchfab.com', 'https://sketchfab.com/', '3d-assets', ['models']],
  ['polyhaven.com', 'https://polyhaven.com/', '3d-assets', ['cc0-assets']],
  ['ambientcg.com', 'https://ambientcg.com/', '3d-assets', ['cc0-textures']],
  ['blender.org', 'https://www.blender.org/', '3d-assets', ['open-source']],
  ['mixamo.com', 'https://www.mixamo.com/', '3d-assets', ['characters']],
  ['kenney.nl', 'https://kenney.nl/assets', 'game-dev-assets', ['game-assets']],
  ['quaternius.com', 'https://quaternius.com/', 'game-dev-assets', ['game-assets']],
  ['opengameart.org', 'https://opengameart.org/', 'game-dev-assets', ['game-assets']],
  ['krea.ai', 'https://www.krea.ai/', 'ai-generation', ['image-video']],
  ['runwayml.com', 'https://runwayml.com/', 'ai-generation', ['video']],
  ['lumalabs.ai', 'https://lumalabs.ai/', 'ai-generation', ['video']],
  ['klingai.com', 'https://klingai.com/', 'ai-generation', ['video']],
  ['pika.art', 'https://pika.art/', 'ai-generation', ['video']],
  ['replicate.com', 'https://replicate.com/', 'ai-generation', ['api']],
  ['fal.ai', 'https://fal.ai/', 'ai-generation', ['api']],
  ['huggingface.co', 'https://huggingface.co/', 'ai-generation', ['models']],
  ['pexels.com', 'https://www.pexels.com/', 'visual-assets', ['stock-media']],
  ['unsplash.com', 'https://unsplash.com/', 'visual-assets', ['stock-media']],
  ['pixabay.com', 'https://pixabay.com/', 'visual-assets', ['stock-media', 'audio']],
  ['mixkit.co', 'https://mixkit.co/', 'visual-assets', ['stock-media']],
  ['coverr.co', 'https://coverr.co/', 'visual-assets', ['stock-video']],
  ['videvo.net', 'https://www.videvo.net/', 'visual-assets', ['stock-video']],
  ['freesound.org', 'https://freesound.org/', 'audio-music', ['sfx']],
  ['uppbeat.io', 'https://uppbeat.io/', 'audio-music', ['music']],
  ['elevenlabs.io', 'https://elevenlabs.io/', 'audio-music', ['voice']],
  ['suno.com', 'https://suno.com/', 'audio-music', ['music-generation']],
  ['awwwards.com', 'https://www.awwwards.com/', 'inspiration', ['web-design']],
  ['mobbin.com', 'https://mobbin.com/', 'inspiration', ['product-ui']],
  ['land-book.com', 'https://land-book.com/', 'inspiration', ['landing-pages']],
  ['siteinspire.com', 'https://www.siteinspire.com/', 'inspiration', ['web-design']],
];

const blockedHosts = new Set([
  'amazon.com',
  'badgen.net',
  'creativecommons.org',
  'discord.com',
  'discord.gg',
  'facebook.com',
  'github.com',
  'img.shields.io',
  'instagram.com',
  'itunes.apple.com',
  'linkedin.com',
  'medium.com',
  'nodejs.org',
  'npmjs.com',
  'opencollective.com',
  'opensource.org',
  'patreon.com',
  'producthunt.com',
  'raw.githubusercontent.com',
  'reddit.com',
  'travis-ci.org',
  'twitter.com',
  'wikipedia.org',
  'x.com',
  'youtu.be',
  'youtube.com',
]);

const categoryOrder = [
  'ui-components',
  'animation-motion',
  '3d-assets',
  'game-dev-assets',
  'ai-generation',
  'visual-assets',
  'creative-coding',
  'audio-music',
  'fonts-icons',
  'inspiration',
  'design-tools',
];

function normalizeHost(hostname) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function trimUrl(rawUrl) {
  return rawUrl.replace(/[.,;:!?]+$/g, '');
}

function toHomepageUrl(rawUrl) {
  const parsedUrl = new URL(trimUrl(rawUrl));
  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.port ? `:${parsedUrl.port}` : ''}/`;
}

function isBlockedHost(hostname) {
  return (
    blockedHosts.has(hostname) ||
    hostname.endsWith('.svg') ||
    hostname.endsWith('.png') ||
    hostname.endsWith('.jpg') ||
    hostname.endsWith('.jpeg') ||
    hostname.endsWith('.gif')
  );
}

function normalizeSectionHeading(line, currentSection) {
  const headingMatch = line.match(/^#{1,4}\s+(.+)/);
  if (!headingMatch) return currentSection;
  return headingMatch[1]
    .replace(/\[[^\]]+\]\([^)]+\)/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyCategory(hostname, sourceId, section) {
  const searchable = `${hostname} ${sourceId} ${section}`.toLowerCase();
  if (/audio|music|sound|sfx|voice|tts|beat|loop|sample/.test(searchable)) {
    return 'audio-music';
  }
  if (
    /3d|three|webgl|gltf|glb|spline|sketchfab|polyhaven|blender|model|texture|hdr|ambientcg|unity|unreal|kenney|quaternius|opengameart|assetstore|mixamo|cg/.test(
      searchable
    )
  ) {
    return '3d-assets';
  }
  if (
    /motion|animation|animate|lottie|rive|framer|gsap|mojs|animejs|keyframe|easing|scroll|transition/.test(
      searchable
    )
  ) {
    return 'animation-motion';
  }
  if (
    /21st|magicui|aceternity|reactbits|animata|shadcn|component|ui kit|ui kits|ui-design|tailwind|chakra|radix|daisy|mantine|material|bootstrap/.test(
      searchable
    )
  ) {
    return 'ui-components';
  }
  if (
    /video|stock|footage|pexels|unsplash|pixabay|coverr|mixkit|broll|image|photo|svg|illustration|pattern|mockup|freepik|vecteezy|png|gif|visual|asset/.test(
      searchable
    )
  ) {
    return 'visual-assets';
  }
  if (/font|type|typography|icon|logo|emoji/.test(searchable)) {
    return 'fonts-icons';
  }
  if (
    /ai|gen|runway|kling|luma|veo|sora|pika|stable|diffusion|replicate|fal|huggingface|midjourney|leonardo|comfy/.test(
      searchable
    )
  ) {
    return 'ai-generation';
  }
  if (
    /award|inspiration|dribbble|behance|mobbin|land-book|siteinspire|httpster|collectui|gallery|portfolio|museum/.test(
      searchable
    )
  ) {
    return 'inspiration';
  }
  if (
    /creative|coding|shader|canvas|processing|p5|openframeworks|generative|bookofshaders|glsl|webgl|math|codepen|observable/.test(
      searchable
    )
  ) {
    return 'creative-coding';
  }
  if (sourceId.includes('game')) return 'game-dev-assets';
  if (sourceId.includes('creative') || sourceId.includes('generative')) return 'creative-coding';
  if (sourceId.includes('video')) return 'ai-generation';
  return 'design-tools';
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function makeSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function addOrMergeEntry(entriesByHost, candidate) {
  const existing = entriesByHost.get(candidate.domain);
  if (!existing) {
    entriesByHost.set(candidate.domain, {
      ...candidate,
      sourceTags: uniqueSorted(candidate.sourceTags),
      discoveredFrom: uniqueSorted(candidate.discoveredFrom),
    });
    return;
  }

  existing.sourceTags = uniqueSorted([...existing.sourceTags, ...candidate.sourceTags]);
  existing.discoveredFrom = uniqueSorted([...existing.discoveredFrom, ...candidate.discoveredFrom]);
  if (candidate.priority < existing.priority) existing.priority = candidate.priority;
  if (candidate.order < existing.order) existing.order = candidate.order;
  if (candidate.category !== existing.category && candidate.priority < 100) {
    existing.category = candidate.category;
  }
}

function extractSourceEntries(markdown, sourceList, orderOffset) {
  const entries = [];
  const urlRegex = /https?:\/\/[^\s)\]"'<>]+/g;
  let currentSection = sourceList.title;
  let order = orderOffset;

  for (const line of markdown.split(/\r?\n/)) {
    currentSection = normalizeSectionHeading(line, currentSection);
    for (const urlMatch of line.matchAll(urlRegex)) {
      try {
        const homepageUrl = toHomepageUrl(urlMatch[0]);
        const parsedUrl = new URL(homepageUrl);
        const domain = normalizeHost(parsedUrl.hostname);
        if (isBlockedHost(domain)) continue;
        entries.push({
          domain,
          url: homepageUrl,
          category: classifyCategory(domain, sourceList.id, currentSection),
          sourceTags: [sourceList.id, ...sourceList.tags, makeSlug(currentSection)],
          discoveredFrom: [sourceList.id],
          priority: 1000,
          order,
        });
        order += 1;
      } catch {
        continue;
      }
    }
  }

  return entries;
}

async function collectEntries() {
  const entriesByHost = new Map();
  let order = 0;

  for (const [domain, url, category, tags] of prioritySeeds) {
    addOrMergeEntry(entriesByHost, {
      domain: normalizeHost(domain),
      url,
      category,
      sourceTags: ['manual-priority', ...tags],
      discoveredFrom: ['manual-priority'],
      priority: 0,
      order,
    });
    order += 1;
  }

  for (const sourceList of sourceLists) {
    const response = await fetch(sourceList.url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${sourceList.id}: ${response.status} ${response.statusText}`
      );
    }
    const markdown = await response.text();
    const sourceEntries = extractSourceEntries(markdown, sourceList, order);
    for (const entry of sourceEntries) addOrMergeEntry(entriesByHost, entry);
    order += sourceEntries.length;
  }

  return [...entriesByHost.values()];
}

function selectBalancedEntries(entries) {
  const selected = [];
  const selectedDomains = new Set();
  const groupedEntries = new Map(categoryOrder.map((category) => [category, []]));

  for (const entry of entries.toSorted((left, right) => left.order - right.order)) {
    if (!groupedEntries.has(entry.category)) groupedEntries.set(entry.category, []);
    groupedEntries.get(entry.category).push(entry);
  }

  for (const entry of entries
    .filter((candidate) => candidate.priority === 0)
    .toSorted((left, right) => left.order - right.order)) {
    selected.push(entry);
    selectedDomains.add(entry.domain);
  }

  const cursors = new Map(categoryOrder.map((category) => [category, 0]));
  while (selected.length < catalogLimit) {
    let addedInPass = false;
    for (const category of categoryOrder) {
      const categoryEntries = groupedEntries.get(category) ?? [];
      let cursor = cursors.get(category) ?? 0;
      while (
        cursor < categoryEntries.length &&
        selectedDomains.has(categoryEntries[cursor].domain)
      ) {
        cursor += 1;
      }
      if (cursor >= categoryEntries.length) {
        cursors.set(category, cursor);
        continue;
      }
      selected.push(categoryEntries[cursor]);
      selectedDomains.add(categoryEntries[cursor].domain);
      cursors.set(category, cursor + 1);
      addedInPass = true;
      if (selected.length >= catalogLimit) break;
    }
    if (!addedInPass) break;
  }

  if (selected.length < catalogLimit) {
    for (const entry of entries.toSorted((left, right) => left.order - right.order)) {
      if (selectedDomains.has(entry.domain)) continue;
      selected.push(entry);
      selectedDomains.add(entry.domain);
      if (selected.length >= catalogLimit) break;
    }
  }

  return selected.slice(0, catalogLimit);
}

function summarizeCategories(entries) {
  return entries.reduce((summary, entry) => {
    summary[entry.category] = (summary[entry.category] ?? 0) + 1;
    return summary;
  }, {});
}

function buildCatalog(entries) {
  const selectedEntries = selectBalancedEntries(entries);
  const catalogEntries = selectedEntries.map((entry, index) => ({
    id: `site-${String(index + 1).padStart(4, '0')}-${makeSlug(entry.domain)}`,
    domain: entry.domain,
    url: entry.url,
    category: entry.category,
    sourceTags: uniqueSorted(entry.sourceTags),
    discoveredFrom: uniqueSorted(entry.discoveredFrom),
  }));

  return {
    schemaVersion: 'creative-source-catalog.v1',
    generatedOn,
    status: 'candidate-source-brainstorm',
    count: catalogEntries.length,
    note: 'Candidate discovery catalog only. Verify current availability, license, attribution, pricing, and watermark rules before copying or rendering any external asset.',
    sources: [
      {
        id: 'manual-priority',
        title: 'Content Machine priority seeds',
        url: 'repo-local',
        tags: ['curated', 'short-form-production'],
      },
      ...sourceLists.map((sourceList) => ({
        id: sourceList.id,
        title: sourceList.title,
        url: sourceList.url,
        tags: sourceList.tags,
      })),
    ],
    categories: summarizeCategories(catalogEntries),
    entries: catalogEntries,
  };
}

async function main() {
  if (!Number.isInteger(catalogLimit) || catalogLimit < 1) {
    throw new Error('CM_CREATIVE_SOURCE_CATALOG_LIMIT must be a positive integer.');
  }

  const entries = await collectEntries();
  if (entries.length < catalogLimit) {
    throw new Error(`Only found ${entries.length} candidate sites; need ${catalogLimit}.`);
  }

  const catalog = buildCatalog(entries);
  const prettierOptions = (await prettier.resolveConfig(outputPath)) ?? {};
  const nextContent = await prettier.format(JSON.stringify(catalog), {
    ...prettierOptions,
    parser: 'json',
  });

  if (checkMode) {
    const existingContent = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
    if (existingContent !== nextContent) {
      console.error(`${path.relative(process.cwd(), outputPath)} is out of date.`);
      console.error('Run: npm run creative-sources:gen');
      process.exit(1);
    }
    console.log(`${path.relative(process.cwd(), outputPath)} is up to date.`);
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, nextContent);
  console.log(
    `Wrote ${catalog.count} candidate sites to ${path.relative(process.cwd(), outputPath)}.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
