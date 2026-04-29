# Demo Video Quality Review

Generated: 2026-04-29T00:51:58.728Z

Heuristics used: ffprobe metadata, ffmpeg audio volume, capped even frame sampling, white/black frame detection, edge artifact detection, low-motion runs, caption-band signal, and contact sheets.

[Aggregate contact sheet](contact-sheet.jpg)

| Video                                  | Status  | Issues                                        | Contact Sheet                                                       |
| -------------------------------------- | ------- | --------------------------------------------- | ------------------------------------------------------------------- |
| `demo-4-latest-news.mp4`               | `error` | error:wrong-resolution<br>error:missing-audio | [contact-sheet](demo-4-latest-news/contact-sheet.jpg)               |
| `demo-8-reddit-story-split-screen.mp4` | `error` | error:black-gutter-artifact                   | [contact-sheet](demo-8-reddit-story-split-screen/contact-sheet.jpg) |

## Details

### demo-4-latest-news.mp4

- Path: `/home/calvin/Documents/GitHub/content-machine/archive/demo/demo-4-latest-news.mp4`
- Resolution: 540x960
- Duration: 12.00s
- Audio: none
- Contact sheet: [demo-4-latest-news/contact-sheet.jpg](demo-4-latest-news/contact-sheet.jpg)
- Issues:
  - `error:wrong-resolution` - Expected 1080x1920, got 540x960
  - `error:missing-audio` - No audio stream detected.

### demo-8-reddit-story-split-screen.mp4

- Path: `/home/calvin/Documents/GitHub/content-machine/archive/demo/demo-8-reddit-story-split-screen.mp4`
- Resolution: 1080x1920
- Duration: 58.07s
- Audio: aac (mean -23 dB, max -1.1 dB)
- Contact sheet: [demo-8-reddit-story-split-screen/contact-sheet.jpg](demo-8-reddit-story-split-screen/contact-sheet.jpg)
- Issues:
  - `error:black-gutter-artifact` - Black gutters or boxed-in source media appear on frame edges.
