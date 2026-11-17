[CmdletBinding()]
param(
  [string]$RepositoryRoot = (Join-Path $PSScriptRoot ".."),
  [ValidateRange(500, 10000)]
  [int]$QuietPeriodMilliseconds = 1500
)

$ErrorActionPreference = "Stop"
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

Write-Output "Watching Git repository: $repositoryRoot"
Write-Output "Auto-commit after $QuietPeriodMilliseconds ms without file events. No push."

try {
  while ($true) {
    $change = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::All, 1000)
    if ($change.TimedOut -or (Test-GitMetadataPath $change.Name)) {
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
  }
}
finally {
  $watcher.Dispose()
  Write-Output "Git watcher stopped."
}
