# Run this once as Administrator to register the weekly backup task
# Right-click PowerShell → "Run as administrator" → paste this script

$taskName   = "YosCRM Weekly Backup"
$scriptPath = "C:\Yos CRM\scripts\backup.cjs"
$nodePath   = (Get-Command node).Source

$action  = New-ScheduledTaskAction -Execute $nodePath -Argument "`"$scriptPath`"" -WorkingDirectory "C:\Yos CRM"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "09:00AM"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
  -TaskName   $taskName `
  -Action     $action `
  -Trigger    $trigger `
  -Settings   $settings `
  -RunLevel   Highest `
  -Force

Write-Host "✓ Task '$taskName' registered — runs every Monday at 9:00 AM" -ForegroundColor Green
Write-Host "  To run it manually now: Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Cyan
