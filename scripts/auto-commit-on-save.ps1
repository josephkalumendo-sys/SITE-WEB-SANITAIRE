[CmdletBinding()]
param(
  [string]$RepositoryRoot,
  [ValidateRange(500, 10000)]
  [int]$QuietPeriodMilliseconds = 1500
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
  $RepositoryRoot = Join-Path $PSScriptRoot ".."
}

$rootOutput = & git -C $RepositoryRoot rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) {
  throw "Impossible de trouver la racine du dépôt Git."
}

$repositoryRoot = ([string]$rootOutput).Trim()
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $repositoryRoot
$watcher.IncludeSubdirectories = $true
$watcher.Filter = "*"
$watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName `
  -bor [System.IO.NotifyFilters]::DirectoryName `
  -bor [System.IO.NotifyFilters]::LastWrite `
  -bor [System.IO.NotifyFilters]::Size
$watcher.InternalBufferSize = 32768
$watcher.EnableRaisingEvents = $true

function Test-GitMetadataPath {
  param([string]$RelativePath)
  return $RelativePath -match '(^|[\\/])\.git([\\/]|$)'
}

function Push-LocalCommits {
  $branchName = & git -C $repositoryRoot branch --show-current
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace([string]$branchName)) {
    Write-Warning "GitHub push skipped: unable to determine the current branch."
    return $false
  }

  $branchName = ([string]$branchName).Trim()
  & git -C $repositoryRoot config --get "branch.$branchName.remote" *> $null
  $hasUpstream = $LASTEXITCODE -eq 0
  $previousTerminalPrompt = $env:GIT_TERMINAL_PROMPT
  $previousErrorActionPreference = $ErrorActionPreference
  $env:GIT_TERMINAL_PROMPT = "0"
  $ErrorActionPreference = "Continue"

  try {
    if ($hasUpstream) {
      & git -C $repositoryRoot -c credential.interactive=never push | Out-Host
    }
    else {
      & git -C $repositoryRoot -c credential.interactive=never push `
        --set-upstream origin $branchName | Out-Host
    }
    $pushExitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference
    if ($null -eq $previousTerminalPrompt) {
      Remove-Item Env:GIT_TERMINAL_PROMPT -ErrorAction SilentlyContinue
    }
    else {
      $env:GIT_TERMINAL_PROMPT = $previousTerminalPrompt
    }
  }

  if ($pushExitCode -ne 0) {
    Write-Warning "GitHub push failed. Commits remain local; check authentication, network, or remote branch status. Retrying automatically."
    return $false
  }

  Write-Host ("Pushed local commits to origin/$branchName.")
  return $true
}

Write-Output "Watching Git repository: $repositoryRoot"
Write-Output "Auto-commit after $QuietPeriodMilliseconds ms without file events; retry GitHub push every 60 seconds."
$lastPushAttempt = [DateTime]::UtcNow
$pushPending = -not (Push-LocalCommits)

try {
  while ($true) {
    $change = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 1000)
    if ($change.TimedOut) {
      if ($pushPending -and
        ([DateTime]::UtcNow - $lastPushAttempt).TotalSeconds -ge 60) {
        $lastPushAttempt = [DateTime]::UtcNow
        $pushPending = -not (Push-LocalCommits)
      }
      continue
    }
    if (Test-GitMetadataPath $change.Name) {
      continue
    }

    do {
      $change = $watcher.WaitForChanged(
        [System.IO.WatcherChangeTypes]::All,
        $QuietPeriodMilliseconds
      )
    } while (-not $change.TimedOut)

    $pendingChanges = & git -C $repositoryRoot status --porcelain --untracked-files=all
    if ($LASTEXITCODE -ne 0) {
      throw "git status failed; stopping the auto-commit watcher."
    }
    if (-not $pendingChanges) {
      continue
    }

    & git -C $repositoryRoot add -A -- .
    if ($LASTEXITCODE -ne 0) {
      throw "git add failed; stopping the auto-commit watcher."
    }

    & git -C $repositoryRoot commit `
      -m "Auto-commit: save workspace changes" `
      -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
    if ($LASTEXITCODE -ne 0) {
      throw "The auto-commit failed. Resolve the Git error and restart the task."
    }

    Write-Output ("Auto-commit created at " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
    $lastPushAttempt = [DateTime]::UtcNow
    $pushPending = -not (Push-LocalCommits)
  }
}
finally {
  $watcher.Dispose()
  Write-Output "Git watcher stopped."
}
