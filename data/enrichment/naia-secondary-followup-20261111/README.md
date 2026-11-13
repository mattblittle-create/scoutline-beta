# NAIA secondary followup — November 11, 2026

The preceding approved enrichment import passed the USER-run live read-only closeout `closeout-audit-2026-11-11T16-31-39-476Z-42ca5e88` with zero drift across 16 state sections. Do not reapply it. This package proposes a separate additive batch: **38 blank Program logo URLs**, using exact previously reviewed conference member names and athletics hosts, captured image bytes, hashes, image decoding and two visually inspected contact sheets. No assistant database access.

Candidate SHA256: `448de7b6ee56c55d6c650c225b009a6a32d0882e55933356c2c7a02e058f6230`.

Only `CollegeBaseballProgram.logoUrl` null values may change. No College mirror changes, coaches, players, snapshots, ownership, verification, division, merges, deletions or YouTube changes. All 16 baseline sections must match before preview. Prior approved receipt/source chain is independently revalidated offline.

## USER-run read-only preview

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-secondary-followup-20261111\preview-logos.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-secondary-followup-20261111\preview-logos.cjs
if ($LASTEXITCODE -ne 0) { throw 'Preview failed; stop and inspect.' }
```

No apply mode exists. After the saved live preview passes, obtain approval of this exact new scope before preparing the guarded import. Do not modify or regenerate frozen files after preview.

Offline preflight passed at 2026-11-11T16:38:13.953Z with 22 negative preservation/scope checks and no database access.

## Remaining work

Logo coverage would rise from 112 to 150 of the 187 member-matched programs, leaving 37: 36 without an exact conference asset join and Judson's 403 image hold. Some originals have low resolution; Viterbo is visibly soft. Assets are official conference-published school marks, not necessarily baseball-specific designs or proof of baseball sponsorship.

NAIA remains incomplete: 98 matched programs lack a supported head coach and 134 lack a verified 2027 roster. Life Pacific/MSU Northern sport-list holds and seven stale/duplicate stored exceptions remain open. Stored count 194 is not a verified national baseball total. Continue public research for recruiting forms, camps, current staff/roster evidence and unresolved membership; preserve blocked access and season holds.

## Approved import

The user explicitly approved this exact new plan. `approval.json` records approval of the live preview above; historical candidate/preview approval labels remain unchanged. Reviewed-plan SHA256: `dfa5ec3d486b0d62324ff66a4480dbc54fc15564c15e7d81b23c44b7428eab97`.

`apply-approved-logos.cjs` first validates frozen evidence/approval/preview and the fresh read-only full baseline. A single Serializable transaction locks 38 Colleges and 38 Programs, rechecks all 16 state sections, then executes one parameterized, null-only NAIA logo update. It checks all old fields and dependency/profile rows before committing; only the 38 logo values and those Programs' updatedAt may change. No automatic retry, upsert or create path exists. The committed receipt is saved before fresh read-only post-commit verification.

USER runs once:

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-secondary-followup-20261111\apply-approved-logos.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-secondary-followup-20261111\apply-approved-logos.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected: `FRESH_READ_ONLY_NAIA_LOGOS_VERIFICATION_PASSED`, 38 logo fills, zero differences, 150 populated NAIA logos, unchanged global counts. After an interrupted/failed attempt, inspect the saved receipt and current state before any retry. Once successful, prepare a pinned read-only closeout against its saved receipt; do not reapply.

Approved apply offline preflight PASSED: 26 negative preservation checks and four SQL/scope checks, databaseAccess=false, databaseWrites=0.

## Import succeeded; USER read-only closeout

The USER apply succeeded in approved-logos-2026-11-11T16-47-49-790Z-13031606 with 38 fills, 150 logos and zero differences. Do not reapply. The pinned read-only audit verifies saved approved plan, write attempt, commit and exact before/after states, then compares fresh state against the saved post-commit snapshot across all 16 sections.

```powershell
node .\data\enrichment\naia-secondary-followup-20261111\audit-logos-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-secondary-followup-20261111\audit-logos-closeout.cjs
if ($LASTEXITCODE -ne 0) { throw 'Inspect closeout drift; do not reapply the import.' }
```

Expected READ_ONLY_NAIA_LOGOS_CLOSEOUT_PASSED, zero changed/missing records. Saves the next full baseline and remaining holds. NAIA enrichment remains incomplete.
Offline closeout preflight PASSED at 2026-11-11T16:50:01.795Z with 22 negative preservation checks and no database access.
