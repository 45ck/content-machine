/**
 * Step 6: Export Package (Deterministic)
 *
 * Creates a ZIP bundle with everything needed for upload:
 * - video.mp4
 * - cover.jpg
 * - metadata.json
 * - upload-checklist.md
 * - platform-hints/ (TikTok, Reels, Shorts specific tips)
 */

import { v4 as uuid } from 'uuid';
import archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import type { ExportPackage } from '../types/index.js';

export class ExportPackageStep {
  async execute(
    sceneJsonId: string,
    title: string,
    outputDir: string
  ): Promise<ExportPackage> {
    const slug = this.slugify(title);
    const date = new Date().toISOString().split('T')[0];
    const folderName = `${date}-${slug}`;
    const outputPath = path.join(outputDir, folderName);

    console.log(`[Step 6] Creating export package: ${outputPath}`);

    // Ensure output directory exists
    await fs.promises.mkdir(outputPath, { recursive: true });
    await fs.promises.mkdir(path.join(outputPath, 'platform-hints'), { recursive: true });

    // Create metadata
    const metadata = {
      id: uuid(),
      title,
      sceneJsonId,
      createdAt: new Date().toISOString(),
      platforms: ['tiktok', 'reels', 'shorts'],
    };

    await fs.promises.writeFile(
      path.join(outputPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create upload checklist
    const checklist = this.generateChecklist(title);
    await fs.promises.writeFile(
      path.join(outputPath, 'upload-checklist.md'),
      checklist
    );

    // Create platform-specific hints
    await fs.promises.writeFile(
      path.join(outputPath, 'platform-hints', 'tiktok.md'),
      this.generateTikTokHints(title)
    );
    await fs.promises.writeFile(
      path.join(outputPath, 'platform-hints', 'reels.md'),
      this.generateReelsHints(title)
    );
    await fs.promises.writeFile(
      path.join(outputPath, 'platform-hints', 'shorts.md'),
      this.generateShortsHints(title)
    );

    // TODO: Copy actual video and cover from render step
    // For now, create placeholder files
    await fs.promises.writeFile(
      path.join(outputPath, 'video.mp4'),
      'placeholder - actual video would be here'
    );
    await fs.promises.writeFile(
      path.join(outputPath, 'cover.jpg'),
      'placeholder - cover image would be here'
    );

    // Create ZIP archive
    const zipPath = `${outputPath}.zip`;
    await this.createZip(outputPath, zipPath);

    console.log(`[Step 6] Export complete: ${zipPath}`);

    return {
      id: metadata.id,
      sceneJsonId,
      outputDir: outputPath,
      files: {
        video: path.join(outputPath, 'video.mp4'),
        cover: path.join(outputPath, 'cover.jpg'),
        metadata: path.join(outputPath, 'metadata.json'),
        checklist: path.join(outputPath, 'upload-checklist.md'),
      },
      platforms: ['tiktok', 'reels', 'shorts'],
      createdAt: new Date(),
    };
  }

  private generateChecklist(title: string): string {
    return `# Upload Checklist

## Video: ${title}
Created: ${new Date().toISOString()}

## Pre-Upload
- [ ] Watch full preview video
- [ ] Check audio levels
- [ ] Verify captions are readable
- [ ] Review cover image

## TikTok Upload
- [ ] Upload video.mp4
- [ ] Set cover from cover.jpg (or in-app)
- [ ] Add caption (see platform-hints/tiktok.md)
- [ ] Add relevant hashtags
- [ ] Set to public
- [ ] Check "Allow Duet" and "Allow Stitch"

## Instagram Reels Upload
- [ ] Upload via Instagram app
- [ ] Add caption (see platform-hints/reels.md)
- [ ] Tag location (optional)
- [ ] Share to Feed + Reels

## YouTube Shorts Upload
- [ ] Upload to YouTube (must be ≤60s)
- [ ] Add title and description
- [ ] Add #Shorts in description
- [ ] Set thumbnail (optional)

## Post-Upload
- [ ] Record upload URLs in metadata
- [ ] Check video plays correctly on each platform
- [ ] Monitor first hour of engagement
`;
  }

  private generateTikTokHints(title: string): string {
    return `# TikTok Upload Hints

## Caption Template
\`\`\`
${title}

🔗 Link in bio for more!

#discord #discordbot #coding #tech #minecraft
\`\`\`

## Best Practices
- Post between 6-10 PM local time
- Respond to comments in first hour
- Use 3-5 relevant hashtags
- Consider creating a "hook" as thumbnail text

## Hashtags to Consider
- #discordbot #discordserver #discordmemes
- #minecraft #minecraftserver #mcserver
- #coding #programming #tech #developer
- #tutorial #howto #learnontiktok
`;
  }

  private generateReelsHints(title: string): string {
    return `# Instagram Reels Upload Hints

## Caption Template
\`\`\`
${title}

Double tap if you want more content like this! 👆

Link in bio ➡️

#discord #discordbot #coding #tech #reels
\`\`\`

## Best Practices
- Share to Feed AND Reels
- Use relevant music (trending audio)
- Add location for discovery
- Use 5-10 hashtags max

## Hashtags
- #reels #reelsinstagram #reelsviral
- #discordbot #discordserver
- #coding #programming #developer
- #tech #technology #tutorial
`;
  }

  private generateShortsHints(title: string): string {
    return `# YouTube Shorts Upload Hints

## Title
${title}

## Description Template
\`\`\`
${title}

#Shorts #Discord #Coding #Tech

🔗 Full tutorial: [link to video/site]
📱 Try it yourself: [product link]

Subscribe for more!
\`\`\`

## Best Practices
- Video must be ≤60 seconds and vertical
- Include #Shorts in description
- First frame should be engaging
- Consider adding end screen subscribe prompt

## Tags
- #Shorts (REQUIRED)
- Discord, Discord Bot, Minecraft
- Coding, Programming, Tutorial
`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50);
  }

  private async createZip(sourceDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}
