# vendor.ps1 - Initialize/update all git submodules

Write-Host "Updating all submodules..." -ForegroundColor Cyan

# Initialize submodules if not already done
git submodule update --init --recursive --depth 1

Write-Host "`n✅ Submodules updated successfully" -ForegroundColor Green
Write-Host "`nTotal submodules:" -ForegroundColor Yellow
(git submodule status | Measure-Object -Line).Lines
