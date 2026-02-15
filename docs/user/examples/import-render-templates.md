# Import Render Templates and Code Templates

Content Machine supports:

- **Render templates** (data-only): select a Remotion composition + provide render defaults.
- **Code templates** (trusted mode): render templates that also ship a Remotion project.

Canonical terminology (generated): [`docs/reference/GLOSSARY.md`](../../reference/GLOSSARY.md)

## Import a Remotion template repo as a code template

```bash
cm templates import https://www.remotion.dev/templates/tiktok --id remotion-tiktok

cm render -i visuals.json --audio audio.wav --timestamps timestamps.json \
  --template remotion-tiktok --allow-template-code -o out/video.mp4
```

Docs:

- [`docs/reference/cm-templates-reference-20260210.md`](../../reference/cm-templates-reference-20260210.md)
- [`docs/dev/guides/guide-remotion-template-import-20260210.md`](../../dev/guides/guide-remotion-template-import-20260210.md)
