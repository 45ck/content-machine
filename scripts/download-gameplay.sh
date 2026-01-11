#!/usr/bin/env bash
set -euo pipefail

# Downloads or imports gameplay clips into ~/.cm/assets/gameplay/<style>/.
#
# IMPORTANT:
# Only download/use content you own or have explicit rights to use.
# This project does not include or endorse downloading copyrighted gameplay.

usage() {
  cat <<'EOF' >&2
Usage:
  ./scripts/download-gameplay.sh --style <subway-surfers|minecraft-parkour|...> --url <URL> [--url <URL> ...]
  ./scripts/download-gameplay.sh --style <style> --file <path> [--file <path> ...]

Options:
  --style <name>        Gameplay style folder name under ~/.cm/assets/gameplay/
  --url <url>           A URL you have rights to download/use (repeatable)
  --file <path>         Copy a local clip into the style folder (repeatable)
  --seconds <n>         Trim to first N seconds (default: 180)
  --root <path>         Root gameplay folder (default: ~/.cm/assets/gameplay)
  --cookies <path>      Netscape cookies.txt file for authenticated downloads
  --cookies-from-browser <name>  Use browser cookies (e.g. firefox, chrome)
  --no-trim             Do not trim (download full length)
  --yt-dlp-python <path>  Use a specific python for yt-dlp (e.g. .venv/bin/python)
  --js-runtime <name>   JS runtime for yt-dlp (e.g. node, deno)
  --format <expr>       yt-dlp format selector (default: bv*+ba/b)
  --merge-format <ext>  Merge output format (default: mp4)
  --remote-components <spec>  Remote components (default: ejs:github)
  --force               Overwrite existing files
EOF
}

style=""
seconds="180"
root="${HOME}/.cm/assets/gameplay"
force="false"
urls=()
files=()
cookies_file=""
cookies_from_browser=""
trim="true"
yt_dlp_python="${YTDLP_PYTHON:-}"
js_runtime="${YTDLP_JS_RUNTIME:-}"
format_selector="${YTDLP_FORMAT:-bv*+ba/b}"
merge_format="${YTDLP_MERGE_FORMAT:-mp4}"
remote_components="${YTDLP_REMOTE_COMPONENTS:-ejs:github}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --style)
      style="${2:-}"; shift 2;;
    --seconds)
      seconds="${2:-}"; shift 2;;
    --root)
      root="${2:-}"; shift 2;;
    --force)
      force="true"; shift;;
    --cookies)
      cookies_file="${2:-}"; shift 2;;
    --cookies-from-browser)
      cookies_from_browser="${2:-}"; shift 2;;
    --no-trim)
      trim="false"; shift;;
    --yt-dlp-python)
      yt_dlp_python="${2:-}"; shift 2;;
    --js-runtime)
      js_runtime="${2:-}"; shift 2;;
    --format)
      format_selector="${2:-}"; shift 2;;
    --merge-format)
      merge_format="${2:-}"; shift 2;;
    --remote-components)
      remote_components="${2:-}"; shift 2;;
    --url)
      urls+=("${2:-}"); shift 2;;
    --file)
      files+=("${2:-}"); shift 2;;
    -h|--help)
      usage; exit 0;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2;;
  esac
done

if [[ -z "$style" ]]; then
  echo "--style is required" >&2
  usage
  exit 2
fi

if [[ ${#urls[@]} -eq 0 && ${#files[@]} -eq 0 ]]; then
  echo "Provide at least one --url or --file" >&2
  usage
  exit 2
fi

if [[ "$trim" == "true" && "$seconds" != "0" ]]; then
  if ! command -v ffmpeg >/dev/null 2>&1; then
    echo "ffmpeg not found; skipping trim. Install ffmpeg or use --no-trim." >&2
    trim="false"
  fi
fi

dest="${root}/${style}"
mkdir -p "$dest"

copy_local() {
  local src="$1"
  if [[ ! -f "$src" ]]; then
    echo "File not found: $src" >&2
    exit 2
  fi
  local base
  base="$(basename "$src")"
  if [[ "$force" == "true" ]]; then
    cp -f "$src" "$dest/$base"
  else
    cp -n "$src" "$dest/$base" || true
  fi
}

for f in "${files[@]}"; do
  copy_local "$f"
done

if [[ ${#urls[@]} -gt 0 ]]; then
  if [[ -n "$yt_dlp_python" ]]; then
    yt_dlp=("$yt_dlp_python" -m yt_dlp)
  elif command -v python3 >/dev/null 2>&1 && python3 -m yt_dlp --version >/dev/null 2>&1; then
    yt_dlp=(python3 -m yt_dlp)
  elif command -v yt-dlp >/dev/null 2>&1; then
    yt_dlp=(yt-dlp)
  else
    echo "yt-dlp is required for --url. Install it (or use --file with local clips)." >&2
    exit 2
  fi

  common_args=(
    --no-playlist
    --restrict-filenames
    -f "$format_selector"
    -P "$dest"
    -o "%(id)s.%(ext)s"
  )
  if [[ -n "$merge_format" ]]; then
    common_args+=(--merge-output-format "$merge_format")
  fi
  if [[ -z "$js_runtime" ]] && command -v node >/dev/null 2>&1; then
    js_runtime="node"
  fi
  if [[ -n "$js_runtime" ]]; then
    common_args+=(--js-runtimes "$js_runtime")
  fi
  if [[ -n "$remote_components" ]]; then
    common_args+=(--remote-components "$remote_components")
  fi
  if [[ -n "$cookies_file" ]]; then
    common_args+=(--cookies "$cookies_file")
  fi
  if [[ -n "$cookies_from_browser" ]]; then
    common_args+=(--cookies-from-browser "$cookies_from_browser")
  fi
  if [[ "$force" != "true" ]]; then
    common_args+=(--no-overwrites)
  else
    common_args+=(--force-overwrites)
  fi

  for url in "${urls[@]}"; do
    before="$(ls -1t "$dest" 2>/dev/null | head -n 1 || true)"
    "${yt_dlp[@]}" "${common_args[@]}" "$url"
    after="$(ls -1t "$dest" 2>/dev/null | head -n 1 || true)"
    if [[ -z "$after" ]]; then
      echo "Download failed for: $url" >&2
      exit 2
    fi
    downloaded_file="$dest/$after"

    if [[ "$trim" == "true" && "$seconds" != "0" ]]; then
      ext="${downloaded_file##*.}"
      tmp="${downloaded_file%.*}.trim.${ext}"
      ffmpeg -y -i "$downloaded_file" -t "$seconds" -c copy -movflags +faststart "$tmp" >/dev/null 2>&1
      mv -f "$tmp" "$downloaded_file"
    fi
  done
fi

echo "Gameplay clips ready in: $dest"
