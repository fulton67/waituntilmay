<#
Register the nightly job that grows the journey pool.

The render needs a real GPU and a visible browser window (the shader layer is
drawn by Chromium through ANGLE), so the task runs interactively in the
logged-on user's session rather than as a service. That is why the principal
is Interactive and not S4U: a task set to "run whether user is logged on or
not" has no desktop, and the shader pass would fail every night.

Conditions match the brief: nightly, only when the machine is idle, only on
mains power, and it stops if the power goes.

  powershell -ExecutionPolicy Bypass -File scripts\register-pool-task.ps1
  powershell -ExecutionPolicy Bypass -File scripts\register-pool-task.ps1 -Count 2 -At 03:30
  powershell -ExecutionPolicy Bypass -File scripts\register-pool-task.ps1 -Unregister
#>
param(
  [string]$TaskName = "waituntilmay-journey-pool",
  [int]$Count = 10,
  [string]$Prefix = "journey-multi",
  [string]$At = "03:00",
  [switch]$Unregister
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$cmd = Join-Path $root "scripts\grow_pool.cmd"

if ($Unregister) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Output "unregistered $TaskName"
  exit 0
}

if (-not (Test-Path $cmd)) { throw "missing $cmd" }

# Count AND prefix: the pool the nightly job grows has to be the pool the
# player reads, and that is now the multi-source one.
$action = New-ScheduledTaskAction -Execute $cmd -Argument "$Count $Prefix" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At $At

$settings = New-ScheduledTaskSettingsSet `
  -RunOnlyIfIdle `
  -IdleDuration (New-TimeSpan -Minutes 10) `
  -IdleWaitTimeout (New-TimeSpan -Hours 2) `
  -DontStopOnIdleEnd `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 6) `
  -MultipleInstances IgnoreNew

# These two are properties, not switches on the cmdlet. They already default
# to the behaviour we want, but a scheduled job that quietly runs on battery
# because a default changed is worth ruling out explicitly.
$settings.DisallowStartIfOnBatteries = $true
$settings.StopIfGoingOnBatteries = $true

# Interactive: the task runs in the logged-on session, which is what gives the
# shader pass a GPU and a window to draw into.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal `
  -Description "Render $Count new journey versions across every enabled source in config/sources.json, verify each, upload the survivors and append them to the live $Prefix Blob manifest." `
  -Force | Out-Null

$t = Get-ScheduledTask -TaskName $TaskName
$i = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Output "registered: $($t.TaskName)"
Write-Output "  action      : $cmd $Count $Prefix"
Write-Output "  pool        : $Prefix/ on Blob"
Write-Output "  sources     : config/sources.json (every enabled source)"
Write-Output "  trigger     : daily at $At"
Write-Output "  next run    : $($i.NextRunTime)"
Write-Output "  conditions  : idle >= 10 min, AC power only, stops on battery"
Write-Output "  log         : $root\logs\pool.log"
