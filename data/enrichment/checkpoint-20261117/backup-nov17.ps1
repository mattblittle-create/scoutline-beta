$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $repoRoot
$backupDir = 'C:\Users\mattb\OneDrive\Documents\ChatGPT\ScoutLine - Data Enrichment pt 3\Backups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$archive = Join-Path $backupDir "scoutline-d3-njcaa-20261117-$stamp.tar.gz"
if (Test-Path -LiteralPath $archive) { throw 'Backup already exists; stop.' }
tar.exe -czf $archive data/enrichment/d3-fresh-review-20261117 data/enrichment/juco-baseline-20261117
if ($LASTEXITCODE -ne 0) { throw 'Backup failed; stop.' }
tar.exe -tzf $archive > $null
if ($LASTEXITCODE -ne 0) { throw 'Backup readability check failed; stop.' }
$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
$receipt = [ordered]@{createdAtUtc=[DateTime]::UtcNow.ToString('o');archive=$archive;sha256=$hash;bytes=(Get-Item -LiteralPath $archive).Length;archiveReadable=$true;includes=@('data/enrichment/d3-fresh-review-20261117','data/enrichment/juco-baseline-20261117');cloudSyncVerified=$false;databaseBackup=$false}
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'backup-receipt.json'), ($receipt | ConvertTo-Json -Depth 5)+"`n", [Text.UTF8Encoding]::new($false))
$receipt | ConvertTo-Json -Depth 5
