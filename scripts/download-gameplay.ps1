param(
  [string]$Root = ".cm/assets/gameplay",
  [int]$ClipSeconds = 180,
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$subwayUrls = @(
  "https://youtu.be/arKMhppmNig",
  "https://www.youtube.com/watch?v=QPW3XwBoQlw&t=4s",
  "https://www.youtube.com/watch?v=hJcv2nZ8x84",
  "https://www.youtube.com/watch?v=Iot_bB8lKgE"
)

$minecraftUrls = @(
  "https://youtu.be/XBIaqOm0RKQ",
  "https://www.youtube.com/watch?v=cjxxE2gwEVg",
  "https://www.youtube.com/watch?v=7yl7Wc1dtWc",
  "https://www.youtube.com/watch?v=pGkf1kMyNKI",
  "https://www.youtube.com/watch?v=-LZceM7L8AE"
)

$styles = @(
  @{ Name = "subway-surfers"; Urls = $subwayUrls },
  @{ Name = "minecraft-parkour"; Urls = $minecraftUrls }
)

function Resolve-YtDlpCommand {
  $command = Get-Command "yt-dlp" -ErrorAction SilentlyContinue
  if ($command) {
    return @{ Command = "yt-dlp"; Args = @() }
  }

  $python = Get-Command "python" -ErrorAction SilentlyContinue
  if ($python) {
    try {
      & python -m yt_dlp --version | Out-Null
      return @{ Command = "python"; Args = @("-m", "yt_dlp") }
    } catch {
      Write-Host "yt-dlp not found. Installing via pip..."
      & python -m pip install -U yt-dlp | Out-Null
      & python -m yt_dlp --version | Out-Null
      return @{ Command = "python"; Args = @("-m", "yt_dlp") }
    }
  }

  throw "yt-dlp is required. Install it from https://github.com/yt-dlp/yt-dlp or ensure python is available."
}

$ytDlp = Resolve-YtDlpCommand

$rootPathInfo = Resolve-Path -Path $Root -ErrorAction SilentlyContinue
if ($rootPathInfo) {
  $rootPath = $rootPathInfo.Path
} else {
  $cwd = (Resolve-Path -Path ".").Path
  $rootPath = Join-Path $cwd $Root
}

foreach ($style in $styles) {
  $styleDir = Join-Path $rootPath $style.Name
  if (-not (Test-Path $styleDir)) {
    New-Item -ItemType Directory -Path $styleDir -Force | Out-Null
  }

  Write-Host "Downloading $($style.Name) clips to $styleDir"

  $clipEnd = [TimeSpan]::FromSeconds($ClipSeconds).ToString('hh\:mm\:ss')
  $commonArgs = @(
    "--no-playlist",
    "--restrict-filenames",
    "--windows-filenames",
    "-f", "best[ext=mp4]/best",
    "--download-sections", "*00:00:00-$clipEnd",
    "-P", $styleDir,
    "-o", "%(id)s.%(ext)s"
  )

  if (-not $Force) {
    $commonArgs += "--no-overwrites"
  }

  foreach ($url in $style.Urls) {
    & $ytDlp.Command @($ytDlp.Args) @commonArgs $url
  }
}

Write-Host "Gameplay downloads complete."
