# sync-to-staging.ps1
# Sync changed files from the development repository to the staging repository (Windows)
#
# Usage:
#   # Dry run (show diff only, no file operations)
#   .\scripts\sync-to-staging.ps1 -FromCommit abc1234 -ToCommit def5678 -SrcRepo C:\dev\mmdpf -DestRepo C:\staging\mmdpf -DryRun
#
#   # Execute
#   .\scripts\sync-to-staging.ps1 -FromCommit abc1234 -ToCommit def5678 -SrcRepo C:\dev\mmdpf -DestRepo C:\staging\mmdpf

param (
    [Parameter(Mandatory = $true, HelpMessage = "Commit hash of the previous deployment")]
    [string]$FromCommit,

    [Parameter(Mandatory = $true, HelpMessage = "Commit hash of the current deployment")]
    [string]$ToCommit,

    [Parameter(Mandatory = $true, HelpMessage = "Path to the local development repository folder")]
    [string]$SrcRepo,

    [Parameter(Mandatory = $true, HelpMessage = "Path to the local staging repository folder")]
    [string]$DestRepo,

    [Parameter(Mandatory = $false, HelpMessage = "Dry run mode: show diff only without any file operations")]
    [switch]$DryRun
)

# =============================
# Color output helpers
# =============================
function Write-Info  { param([string]$msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Ok    { param([string]$msg) Write-Host $msg -ForegroundColor Green }
function Write-Warn  { param([string]$msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Err   { param([string]$msg) Write-Host $msg -ForegroundColor Red }

# =============================
# Prerequisite checks
# =============================
Write-Info "=== Sync to Staging Script (Windows) ==="
if ($DryRun) {
    Write-Warn "[DRY RUN MODE] No file operations will be performed."
}
Write-Host ""

# Check git command
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Err "[ERROR] git command not found. Please install Git."
    exit 1
}

# Check source repository exists
if (-not (Test-Path $SrcRepo)) {
    Write-Err "[ERROR] Source repository not found: $SrcRepo"
    exit 1
}

# Check source repository is a git repository
Push-Location $SrcRepo
$gitCheck = git rev-parse --is-inside-work-tree 2>&1
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Err "[ERROR] The specified folder is not a git repository: $SrcRepo"
    exit 1
}

# Validate FROM_COMMIT
$fromExists = git cat-file -e "${FromCommit}^{commit}" 2>&1
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Err "[ERROR] FROM_COMMIT does not exist: $FromCommit"
    exit 1
}

# Validate TO_COMMIT
$toExists = git cat-file -e "${ToCommit}^{commit}" 2>&1
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Err "[ERROR] TO_COMMIT does not exist: $ToCommit"
    exit 1
}

# =============================
# Get diff
# =============================
Write-Info "=== Changed files ($FromCommit --> $ToCommit) ==="

$diffOutput = git diff --name-status $FromCommit $ToCommit 2>&1
Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Err "[ERROR] git diff failed."
    Write-Err $diffOutput
    exit 1
}

if (-not $diffOutput) {
    Write-Warn "No differences found."
    exit 0
}

# Classify files
$added    = [System.Collections.Generic.List[string]]::new()
$modified = [System.Collections.Generic.List[string]]::new()
$deleted  = [System.Collections.Generic.List[string]]::new()
$renamed  = [System.Collections.Generic.List[object]]::new()

foreach ($line in $diffOutput) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $parts  = $line -split "`t"
    $status = $parts[0].Trim()

    if ($status -eq "A") {
        $added.Add($parts[1])
        Write-Ok   "  [ADDED]    $($parts[1])"
    }
    elseif ($status -match "^M") {
        $modified.Add($parts[1])
        Write-Info "  [MODIFIED] $($parts[1])"
    }
    elseif ($status -eq "D") {
        $deleted.Add($parts[1])
        Write-Err  "  [DELETED]  $($parts[1])"
    }
    elseif ($status -match "^R") {
        $renamed.Add([PSCustomObject]@{ OldPath = $parts[1]; NewPath = $parts[2] })
        Write-Warn "  [RENAMED]  $($parts[1]) --> $($parts[2])"
    }
    else {
        Write-Warn "  [OTHER($status)] $($parts[1])"
        if ($parts.Count -ge 2) { $modified.Add($parts[1]) }
    }
}

Write-Host ""
Write-Info "--- Summary ---"
Write-Ok   "  Added:    $($added.Count)"
Write-Info "  Modified: $($modified.Count)"
Write-Err  "  Deleted:  $($deleted.Count)"
Write-Warn "  Renamed:  $($renamed.Count)"
Write-Host ""

# Stop here if dry run
if ($DryRun) {
    Write-Warn "[DRY RUN] The above diff would be applied. Remove -DryRun to execute."
    exit 0
}

# =============================
# Apply changes to staging repo
# =============================
Write-Info "=== Applying changes to staging repository ==="

# Create dest repo directory if it does not exist
if (-not (Test-Path $DestRepo)) {
    Write-Warn "[INFO] Staging repository does not exist. Creating: $DestRepo"
    New-Item -ItemType Directory -Path $DestRepo -Force | Out-Null
}

$successCount = 0
$errorCount   = 0

# ---------- Copy added / modified files ----------
foreach ($file in ($added + $modified)) {
    $srcPath  = Join-Path $SrcRepo  $file
    $destPath = Join-Path $DestRepo $file

    if (-not (Test-Path $srcPath)) {
        Write-Err "  [ERROR] Source not found: $srcPath"
        $errorCount++
        continue
    }

    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }

    try {
        Copy-Item -Path $srcPath -Destination $destPath -Force
        if ($added -contains $file) {
            Write-Ok "  [ADDED]    $file"
        } else {
            Write-Ok "  [MODIFIED] $file"
        }
        $successCount++
    }
    catch {
        Write-Err "  [ERROR] Copy failed: $file -- $($_.Exception.Message)"
        $errorCount++
    }
}

# ---------- Process renamed files ----------
foreach ($item in $renamed) {
    $srcNewPath  = Join-Path $SrcRepo  $item.NewPath
    $destOldPath = Join-Path $DestRepo $item.OldPath
    $destNewPath = Join-Path $DestRepo $item.NewPath

    # Remove old file
    if (Test-Path $destOldPath) {
        try {
            Remove-Item -Path $destOldPath -Force
        }
        catch {
            Write-Err "  [ERROR] Failed to delete old file: $($item.OldPath) -- $($_.Exception.Message)"
            $errorCount++
        }
    }

    # Copy new file
    if (-not (Test-Path $srcNewPath)) {
        Write-Err "  [ERROR] Source not found: $srcNewPath"
        $errorCount++
        continue
    }

    $destNewDir = Split-Path $destNewPath -Parent
    if (-not (Test-Path $destNewDir)) {
        New-Item -ItemType Directory -Path $destNewDir -Force | Out-Null
    }

    try {
        Copy-Item -Path $srcNewPath -Destination $destNewPath -Force
        Write-Ok "  [RENAMED]  $($item.OldPath) --> $($item.NewPath)"
        $successCount++
    }
    catch {
        Write-Err "  [ERROR] Copy failed after rename: $($item.NewPath) -- $($_.Exception.Message)"
        $errorCount++
    }
}

# ---------- Delete removed files ----------
foreach ($file in $deleted) {
    $destPath = Join-Path $DestRepo $file

    if (-not (Test-Path $destPath)) {
        Write-Warn "  [SKIP] Delete target not found (already deleted?): $file"
        continue
    }

    try {
        Remove-Item -Path $destPath -Force
        Write-Ok "  [DELETED]  $file"
        $successCount++
    }
    catch {
        Write-Err "  [ERROR] Delete failed: $file -- $($_.Exception.Message)"
        $errorCount++
    }
}

# =============================
# Result summary
# =============================
Write-Host ""
Write-Info "=== Result Summary ==="
Write-Ok   "  Success: $successCount"
if ($errorCount -gt 0) {
    Write-Err "  Errors:  $errorCount"
    Write-Err "Please review the errors above and fix them manually."
    exit 1
} else {
    Write-Ok "  Errors:  0"
    Write-Ok "Sync completed successfully."
    exit 0
}
