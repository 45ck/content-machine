#!/usr/bin/env python3
"""
PySceneDetect wrapper for cut/scene boundary detection.

Outputs strict JSON to stdout:
  { "detector": "pyscenedetect", "cutTimesSeconds": [ ... ] }

Notes:
- Optional dependency: `pip install scenedetect`.
- Kept as a separate script to preserve the CLI-first "external tools via artifacts" pattern.
"""

import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--threshold", type=float, default=30.0)
    args = parser.parse_args()

    try:
        from scenedetect import open_video  # type: ignore
        from scenedetect.detectors import ContentDetector  # type: ignore
        from scenedetect.scene_manager import SceneManager  # type: ignore
    except Exception as e:
        print(
            f"Missing dependency: scenedetect (pip install scenedetect). Import error: {e}",
            file=sys.stderr,
        )
        return 2

    video = open_video(args.video)
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=args.threshold))
    scene_manager.detect_scenes(video)
    scene_list = scene_manager.get_scene_list()

    # Convert scene boundaries into cut times: start time of each scene after the first.
    cut_times = []
    for i, (start, _end) in enumerate(scene_list):
        if i == 0:
            continue
        cut_times.append(start.get_seconds())

    sys.stdout.write(
        json.dumps({"detector": "pyscenedetect", "cutTimesSeconds": cut_times})
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

