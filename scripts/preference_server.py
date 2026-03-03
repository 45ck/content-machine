import argparse
import json
import os
from pathlib import Path
from typing import List, Dict, Any


def _fail(message: str) -> None:
    print(json.dumps({"error": {"message": message}}))
    raise SystemExit(2)


def _find_video_pairs(pairs_dir: str) -> List[tuple[str, str]]:
    """Find all video pairs in the directory."""
    videos = []
    for ext in [".mp4", ".mov", ".avi", ".webm"]:
        videos.extend(Path(pairs_dir).glob(f"*{ext}"))

    videos = sorted([str(v) for v in videos])

    if len(videos) < 2:
        _fail(f"Need at least 2 videos in {pairs_dir}, found {len(videos)}")

    # Generate pairs
    pairs = []
    for i in range(len(videos)):
        for j in range(i + 1, len(videos)):
            pairs.append((videos[i], videos[j]))

    return pairs


HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Video Preference Annotation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            text-align: center;
            color: #333;
        }
        .container {
            display: flex;
            gap: 20px;
            margin: 20px 0;
        }
        .video-panel {
            flex: 1;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        video {
            width: 100%;
            border-radius: 4px;
        }
        .controls {
            text-align: center;
            margin: 20px 0;
        }
        button {
            padding: 12px 24px;
            margin: 0 10px;
            font-size: 16px;
            cursor: pointer;
            border: none;
            border-radius: 4px;
            background: #007bff;
            color: white;
        }
        button:hover {
            background: #0056b3;
        }
        button.tie {
            background: #6c757d;
        }
        button.tie:hover {
            background: #5a6268;
        }
        .info {
            text-align: center;
            margin: 10px 0;
            color: #666;
        }
        .dimensions {
            margin: 20px 0;
            text-align: center;
        }
        .dimensions label {
            margin: 0 10px;
        }
        .message {
            text-align: center;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .success {
            background: #d4edda;
            color: #155724;
        }
        .complete {
            background: #fff3cd;
            color: #856404;
        }
    </style>
</head>
<body>
    <h1>Video Preference Annotation</h1>
    <div id="message"></div>
    <div class="info">
        Pair <span id="current">1</span> of <span id="total">0</span>
    </div>
    <div class="dimensions">
        <label><input type="checkbox" name="dim" value="quality" checked> Quality</label>
        <label><input type="checkbox" name="dim" value="engagement"> Engagement</label>
        <label><input type="checkbox" name="dim" value="creativity"> Creativity</label>
        <label><input type="checkbox" name="dim" value="coherence"> Coherence</label>
    </div>
    <div class="container">
        <div class="video-panel">
            <h2>Video A</h2>
            <video id="videoA" controls></video>
            <p id="pathA"></p>
        </div>
        <div class="video-panel">
            <h2>Video B</h2>
            <video id="videoB" controls></video>
            <p id="pathB"></p>
        </div>
    </div>
    <div class="controls">
        <button onclick="submitChoice('A')">A is Better</button>
        <button class="tie" onclick="submitChoice('tie')">Tie</button>
        <button onclick="submitChoice('B')">B is Better</button>
    </div>
    <script>
        let pairs = [];
        let currentIndex = 0;
        const annotator = prompt("Enter your name:") || "anonymous";

        async function loadPairs() {
            const response = await fetch('/pairs');
            pairs = await response.json();
            document.getElementById('total').textContent = pairs.length;
            if (pairs.length > 0) {
                loadCurrentPair();
            } else {
                showMessage('No video pairs available', 'complete');
            }
        }

        function loadCurrentPair() {
            if (currentIndex >= pairs.length) {
                showMessage('All pairs annotated!', 'complete');
                return;
            }
            const pair = pairs[currentIndex];
            document.getElementById('videoA').src = '/video?path=' + encodeURIComponent(pair[0]);
            document.getElementById('videoB').src = '/video?path=' + encodeURIComponent(pair[1]);
            document.getElementById('pathA').textContent = pair[0].split('/').pop();
            document.getElementById('pathB').textContent = pair[1].split('/').pop();
            document.getElementById('current').textContent = currentIndex + 1;
        }

        async function submitChoice(winner) {
            if (currentIndex >= pairs.length) return;

            const dimensions = Array.from(document.querySelectorAll('input[name="dim"]:checked'))
                .map(el => el.value);

            const pair = pairs[currentIndex];
            const record = {
                videoA: pair[0],
                videoB: pair[1],
                winner: winner,
                dimensions: dimensions,
                annotator: annotator,
                timestamp: new Date().toISOString()
            };

            await fetch('/annotate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            });

            showMessage('Preference recorded!', 'success');
            currentIndex++;
            setTimeout(() => {
                loadCurrentPair();
                document.getElementById('message').innerHTML = '';
            }, 500);
        }

        function showMessage(text, type) {
            document.getElementById('message').innerHTML =
                `<div class="message ${type}">${text}</div>`;
        }

        loadPairs();
    </script>
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pairs-dir", required=True, help="Directory containing video pairs")
    parser.add_argument("--output", required=True, help="Output JSONL path for preferences")
    parser.add_argument("--port", type=int, default=8765, help="Server port")
    args = parser.parse_args()

    # Check if FastAPI is available
    try:
        from fastapi import FastAPI, Response  # type: ignore
        from fastapi.responses import FileResponse, HTMLResponse  # type: ignore
        import uvicorn  # type: ignore
    except ImportError:
        _fail("FastAPI and uvicorn are required. Install with: pip install fastapi uvicorn")

    global _pairs_dir
    _pairs_dir = os.path.realpath(args.pairs_dir)

    pairs = _find_video_pairs(args.pairs_dir)
    print(f"Found {len(pairs)} video pairs")

    app = FastAPI()

    @app.get("/")
    async def index():
        return HTMLResponse(content=HTML_TEMPLATE)

    @app.get("/pairs")
    async def get_pairs():
        return pairs

    @app.get("/video")
    async def serve_video(path: str):
        real_path = os.path.realpath(path)
        if not real_path.startswith(_pairs_dir + os.sep) and real_path != _pairs_dir:
            return Response(status_code=403, content="Forbidden")
        return FileResponse(real_path)

    @app.post("/annotate")
    async def annotate(record: Dict[str, Any]):
        with open(args.output, "a") as f:
            f.write(json.dumps(record) + "\n")
        return {"status": "ok"}

    print(f"Starting preference server on http://localhost:{args.port}")
    print(f"Saving preferences to: {args.output}")
    uvicorn.run(app, host="127.0.0.1", port=args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
