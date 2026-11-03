<#
Register the job that picks up a look published from the deployed lab.

The tuning lab is public and the machine that can render is not: there is no
ffglitch on Vercel and no writable repository there, so pressing "publish
look" on the deployed page writes the look and a job to Blob and stops. This
task is the other half - it looks for that job, and when there is one it
re-shades the clip bank, re-assembles the live thirty and flips the manifest.
When there is nothing queued it exits in under a second, which is what makes
it safe to run on a timer.

It runs hourly rather than nightly, because a published look that waits until
three in the morning is not a control, it is a letter. Everything else matches
the pool job's conditions: only on mains power, and it stops if the power
goes. It does NOT wait for the machine to be idle - the whole point is that it
answers a button press - but it only ever has work to do when someone has
pressed one.

  powershell -ExecutionPolicy Bypass -File scripts\register-relayer-task.ps1
  powershell -ExecutionPolicy Bypass -File scripts\register-relayer-task.ps1 -Minutes 15
  powershell -ExecutionPolicy Bypass -File scripts\register-relayer-task.ps1 -Unregister
#>
param(
  [string]$TaskName = "waituntilmay-journey-relayer",
  [int]$Minutes = 60,
  [switch]$Unregister
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$cmd = Join-Path $root "scripts\relayer.cmd"

if ($Unregister) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Output "unregistered $TaskName"
  exit 0
}

if (-not (Test-Path $cmd)) { throw "missing $cmd" }

$action = New-ScheduledTaskAction -Execute $cmd -Argument "--job blob" -WorkingDirectory $root
# Daily at a time plus a repetition, which is how a "every N minutes, forever"
# trigger is expressed: a plain -Once trigger with no repetition fires once.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(5) `
  -RepetitionInterval (New-TimeSpan -Minutes $Minutes)

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 3) `
  -MultipleInstances IgnoreNew

$settings.DisallowStartIfOnBatteries = $true
$settings.StopIfGoingOnBatteries = $true

# Interactive: the shading pass drives /mosh-lab/tune in a real browser on a
# real GPU, which needs a logged-on session to draw into.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal `
  -Description "Look for a look published from /mosh-lab/tune on Blob. When one is queued, re-shade the clip bank with it, re-assemble the live thirty from the same seeds, verify every gate and flip the journey-arc manifest to the new pool. Exits immediately when nothing is queued." `
  -Force | Out-Null

$t = Get-ScheduledTask -TaskName $TaskName
$i = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Output "registered: $($t.TaskName)"
Write-Output "  action      : $cmd --job blob"
Write-Output "  queue       : journey/relayer-job.json on Blob"
Write-Output "  look        : journey/look.json on Blob -> journey\look.json"
Write-Output "  trigger     : every $Minutes minutes"
Write-Output "  next run    : $($i.NextRunTime)"
Write-Output "  conditions  : AC power only, stops on battery, one at a time"
Write-Output "  log         : $root\logs\relayer.log"
