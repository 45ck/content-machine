import z from "zod";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { ensureBrowser } from "@remotion/renderer";

import { Config } from "../../config";
import { shortVideoSchema } from "../../components/utils";
import { logger } from "../../logger";
import { OrientationEnum } from "../../types/shorts";
import { getOrientationConfig } from "../../components/utils";

export class Remotion {
  constructor(
    private bundled: string,
    private config: Config,
  ) {}

  static async init(config: Config): Promise<Remotion> {
    await ensureBrowser();

    const bundled = await bundle({
      entryPoint: path.join(
        config.packageDirPath,
        config.devMode ? "src" : "dist",
        "components",
        "root",
        `index.${config.devMode ? "ts" : "js"}`,
      ),
    });

    return new Remotion(bundled, config);
  }

  async render(
    data: z.infer<typeof shortVideoSchema>,
    id: string,
    orientation: OrientationEnum,
  ) {
    const { component } = getOrientationConfig(orientation);

    const composition = await selectComposition({
      serveUrl: this.bundled,
      id: component,
      inputProps: data,
    });

    logger.debug({ component, videoID: id }, "Rendering video with Remotion");

    const outputLocation = path.join(this.config.videosDirPath, `${id}.mp4`);

    await renderMedia({
      codec: "h264",
      composition,
      serveUrl: this.bundled,
      outputLocation,
      inputProps: data,
      onProgress: ({ progress }) => {
        logger.debug(`Rendering ${id} ${Math.floor(progress * 100)}% complete`);
      },
      // preventing memory issues with docker
      concurrency: this.config.concurrency,
      offthreadVideoCacheSizeInBytes: this.config.videoCacheSizeInBytes,
    });

    logger.debug(
      {
        outputLocation,
        component,
        videoID: id,
      },
      "Video rendered with Remotion",
    );
  }

  async testRender(outputLocation: string) {
    const composition = await selectComposition({
      serveUrl: this.bundled,
      id: "TestVideo",
    });

    await renderMedia({
      codec: "h264",
      composition,
      serveUrl: this.bundled,
      outputLocation,
      onProgress: ({ progress }) => {
        logger.debug(
          `Rendering test video: ${Math.floor(progress * 100)}% complete`,
        );
      },
      // preventing memory issues with docker
      concurrency: this.config.concurrency,
      offthreadVideoCacheSizeInBytes: this.config.videoCacheSizeInBytes,
    });
  }
}
