param(
  [string]$Root = ".cm/assets/gameplay",
  [int]$ClipSeconds = 180,
  [string[]]$Urls = @(),
  [string]$Style = "",
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "IMPORTANT: Only download/use content you own or have explicit rights to use."
Write-Host "This repo does not ship or endorse downloading copyrighted gameplay."

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

if ([string]::IsNullOrWhiteSpace($Style)) {
  throw "Style is required. Example: -Style subway-surfers"
}

if ($Urls.Count -eq 0) {
  throw "Provide one or more -Urls. Example: -Urls https://example.com/your-clip.mp4"
}

$styleDir = Join-Path $rootPath $Style
  if (-not (Test-Path $styleDir)) {
    New-Item -ItemType Directory -Path $styleDir -Force | Out-Null
  }

  Write-Host "Downloading gameplay clips to $styleDir"

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

  foreach ($url in $Urls) {
    & $ytDlp.Command @($ytDlp.Args) @commonArgs $url
  }

Write-Host "Gameplay downloads complete."
