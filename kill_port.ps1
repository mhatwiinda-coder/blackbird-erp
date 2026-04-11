$proc = Get-Process | Where-Object { $_.Name -eq 'node' }
if ($proc) {
  Stop-Process -InputObject $proc -Force
  Start-Sleep -Seconds 2
  Write-Host "Node processes killed"
} else {
  Write-Host "No node processes found"
}
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
