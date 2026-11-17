$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Set-Location -LiteralPath $repoRoot
if (@(git diff --cached --name-only).Count -ne 0) { throw 'Existing staged changes; inspect before continuing.' }
if ($LASTEXITCODE -ne 0) { throw 'Git index inspection failed.' }
$receiptPath = Join-Path $PSScriptRoot 'backup-receipt.json'
if (-not (Test-Path -LiteralPath $receiptPath)) { throw 'Run the backup first.' }
$receipt = Get-Content -Raw -LiteralPath $receiptPath | ConvertFrom-Json
if (-not $receipt.archiveReadable -or -not (Test-Path -LiteralPath $receipt.archive)) { throw 'Backup receipt or archive missing.' }
if ((Get-FileHash -LiteralPath $receipt.archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $receipt.sha256) { throw 'Archive hash differs from receipt.' }
$folders = @('data/enrichment/d3-fresh-review-20261117','data/enrichment/juco-baseline-20261117')
$selected = [Collections.Generic.List[string]]::new()
$archiveOnly = [Collections.Generic.List[object]]::new()
foreach ($folder in $folders) {
    foreach ($f in Get-ChildItem -LiteralPath $folder -Recurse -File) {
        $relative = $f.FullName.Substring($repoRoot.Length+1).Replace('\','/')
        $include = ($f.Extension -in @('.cjs','.md','.json') -or $f.Name -eq '.gitattributes') -and $relative -notmatch '/(sources|reviews|destinations)/' -and $f.Name -notin @('fresh-read-only-snapshot.json','read-only-current-before-apply.json','discovered-links.json')
        if ($include) { $selected.Add($relative) } else { $archiveOnly.Add([ordered]@{path=$relative;bytes=$f.Length}) }
    }
}
$research = @($selected.ToArray() | Sort-Object)
$flags = @()
foreach ($file in $research) {
    $raw = [IO.File]::ReadAllText((Join-Path $repoRoot $file))
    if ($raw -match '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:postgres(?:ql)?|mysql)://[^\s"'']+:[^\s"'']+@|\bAKIA[0-9A-Z]{16}\b|\bgh[pousr]_[A-Za-z0-9]{30,}\b') { $flags += $file }
}
if ($flags.Count) { $flags | ConvertTo-Json; throw 'Potential credential pattern found; review before staging.' }
$metadata = @('README.md','.gitattributes','backup-nov17.ps1','backup-receipt.json','prepare-stage-plan.ps1','verify-stage-bytes.ps1','stage-paths.txt','stage-plan.json')
foreach ($name in $metadata) { $selected.Add('data/enrichment/checkpoint-20261117/'+$name) }
$paths = @($selected.ToArray() | Sort-Object -Unique)
$plan = [ordered]@{createdAtUtc=[DateTime]::UtcNow.ToString('o');head=(git rev-parse HEAD).Trim();databaseAccess=$false;gitWrites=0;backupArchive=$receipt.archive;backupSHA256=$receipt.sha256;selectedResearchFiles=$research.Count;selectedTotalFiles=$paths.Count;potentialCredentialFlags=$flags;credentialScanIsHeuristic=$true;selectedResearch=@($research | ForEach-Object {[ordered]@{path=$_;bytes=(Get-Item -LiteralPath $_).Length;sha256=(Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash.ToLowerInvariant()}});archiveOnly=@($archiveOnly.ToArray())}
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'stage-paths.txt'), ($paths -join "`n")+"`n", [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'stage-plan.json'), ($plan | ConvertTo-Json -Depth 8)+"`n", [Text.UTF8Encoding]::new($false))
[pscustomobject]@{selectedResearchFiles=$research.Count;selectedTotalFiles=$paths.Count;archiveOnlyFiles=$archiveOnly.Count;potentialCredentialFlags=$flags.Count;databaseAccess=$false;gitWrites=0} | ConvertTo-Json
