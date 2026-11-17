$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $repoRoot
$expected = @(Get-Content -LiteralPath (Join-Path $PSScriptRoot 'stage-paths.txt') | Where-Object { $_ } | Sort-Object)
$actual = @(git diff --cached --name-only | Sort-Object)
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect staged paths.' }
if (@(Compare-Object $expected $actual).Count -ne 0) { throw 'Staged paths differ from the reviewed path list.' }
foreach ($file in $expected) {
    $rawOID = (git hash-object --no-filters -- $file)
    if ($LASTEXITCODE -ne 0) { throw "Cannot hash working file: $file" }
    $indexOID = (git rev-parse ":$file")
    if ($LASTEXITCODE -ne 0) { throw "Cannot read staged blob: $file" }
    if ($rawOID -ne $indexOID) { throw "Staged bytes differ: $file" }
}
$plan = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'stage-plan.json') | ConvertFrom-Json
foreach ($r in $plan.selectedResearch) { if ((Get-FileHash -LiteralPath $r.path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $r.sha256) { throw "File changed after review: $($r.path)" } }
[pscustomobject]@{stagedFiles=$expected.Count;exactRawByteMatches=$expected.Count;unexpectedStagedFiles=0;lineEndingChanges=0;databaseAccess=$false;gitWrites=0} | ConvertTo-Json
