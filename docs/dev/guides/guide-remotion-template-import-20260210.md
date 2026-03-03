# guide-remotion-template-import-20260210

Import a Remotion template/project into Content Machine (CM) so you can reuse Remotion animations/components inside CM renders.

This guide is about the **workflow**: import, wire up, and safely render.

## When to use this

- You found a Remotion template (official gallery or community repo) and want to reuse its animations.
- You want “full-power Remotion” for a custom look, but still want CM’s pipeline artifacts (`visuals.json`, `timestamps.json`, `audio.wav`).

## Important: Security Model

Imported templates are **code templates**. That means:

- importing does not execute code
- rendering will execute template-provided JS/TS during bundling/rendering
- you must pass `--allow-template-code` to render/generate with a code template

If you do not trust the source repo, do not render it.

## Quick Start (Official TikTok Template)

```bash
cm templates import https://www.remotion.dev/templates/tiktok --id remotion-tiktok

cm render -i visuals.json --audio audio.wav --timestamps timestamps.json \
  --template remotion-tiktok --allow-template-code -o out/video.mp4
```

## What `cm templates import` Creates

After import, your template lives at:

```
~/.cm/templates/<id>/
```

Key folders:

- `remotion/`: the CM wrapper you should edit
- `imported/`: a copy of the upstream Remotion project (filtered: no `node_modules`/`.git`)
- `public/`: template-local static files for Remotion `staticFile()`

Typical layout:

```
~/.cm/templates/remotion-tiktok/
  template.json
  package.json
  public/
  remotion/
    Main.tsx
    root.tsx
    index.ts
  imported/
    ...
```

## “Steal Animations” Workflow

You customize the render by editing `remotion/Main.tsx`.

Start simple: wrap the base CM composition with a component copied/imported from `imported/`.

Example pattern:

```tsx
import React from 'react';
import type { RenderProps } from 'content-machine';
import { TemplateSDK } from 'content-machine';

// Example: import something from the upstream project you imported.
// Adjust the path to match the repo you imported.
// import { FancyIntro } from '../imported/src/FancyIntro';

export const Main: React.FC<RenderProps> = (props) => {
  return (
    // <FancyIntro>
    <TemplateSDK.ShortVideo {...props} />
    // </FancyIntro>
  );
};
```

Guidelines:

- Keep your edits in `remotion/`. Treat `imported/` as vendor source code you copy from.
- Prefer copying small animation components into `remotion/` (then fix imports) rather than deeply depending on the upstream repo structure.
- If the upstream template uses TS path aliases (common), copying tends to be faster than trying to preserve the original build config.

## Assets (`public/` and `staticFile()`)

This import workflow configures templates with `publicDir: "public"`.

Put static files here:

```
~/.cm/templates/<id>/public/
```

Then reference them in Remotion with `staticFile('my.png')`.

## Dependencies (When You Import Third-Party Code)

If your changes require extra npm packages:

- add them to `~/.cm/templates/<id>/package.json`
- install them by running `npm install` in the template directory

Alternatively, you can ask CM to install template dependencies at render time:

```bash
cm render ... --template <id> --allow-template-code --template-deps auto
```

Notes:

- In offline mode (`--offline` or `CM_OFFLINE=1`), CM will not auto-install dependencies.
- Installing dependencies can execute install scripts. Treat it as part of “running untrusted code”.

## Sharing a Template (Pack + Install)

```bash
cm templates pack ~/.cm/templates/remotion-tiktok -o remotion-tiktok.cmtemplate.zip
cm templates install remotion-tiktok.cmtemplate.zip
cm templates list
```

## Updating an Imported Template

Re-importing to the same id requires `--force`, which deletes the destination directory.

Safer approaches:

- import into a new id (ex: `remotion-tiktok-v2`) and manually port your edits
- copy your customized `remotion/` folder somewhere else before `--force`

## Troubleshooting

- Error: `Code templates require --allow-template-code`
  Fix: re-run `cm render` / `cm generate` with `--allow-template-code`.
- Error: `Remotion entrypoint not found`
  Fix: run `cm templates validate <idOrPath>` and confirm `template.json -> remotion.entryPoint` exists inside the template dir.
- Error: `node_modules missing`
  Fix: run `npm install` in the template dir, or re-run with `--template-deps auto`.
- Error: `Cannot find module ...`
  Fix: add the dependency to the template `package.json`, install, and retry.

## See also

- `docs/reference/cm-templates-reference-20260210.md`
- `docs/reference/video-templates-reference-20260107.md`
- `docs/dev/guides/guide-video-templates-20260107.md`
- `docs/dev/features/feature-remotion-extension-packs-20260207.md`
