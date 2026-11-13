# NAIA consolidated university-directory batch

The prior mixed contact/roster import is complete. Its user-run closeout `../naia-consolidated-followup-20261112/closeout-audit-2026-11-12T20-28-52-411Z-dec20807/report.json` passed with zero drift across all 16 state sections. The saved closeout snapshot byte-matches the committed verification snapshot. Do not reapply that import.

This new frozen proposal combines **14 coaches across nine campuses, eight explicit head flags, and eight null-only Program.generalContactUrl fills**. No College mirrors, players, snapshots, deletions, merges, verification promotions or YouTube changes are proposed. Exact candidate SHA-256: `d07db7cfdca751049d5331d41b4ac6ebcb31b6dcf5ee465b3113bb782e47a9b8`.

| Campus | Staff records | Head flags | Contact URL fills |
|---|---:|---:|---:|
| Georgia Southern East Georgia Campus | 1 | 1 | 0 |
| Missouri Valley | 1 | 1 | 1 |
| Mount Mercy | 4 | 1 | 1 |
| Olivet Nazarene | 1 | 1 | 1 |
| Tougaloo | 1 | 0 | 1 |
| Science and Arts of Oklahoma | 3 | 1 | 1 |
| Wiley | 1 | 1 | 1 |
| Texas A&M Texarkana | 1 | 1 | 1 |
| Viterbo | 1 | 1 | 1 |

Evidence and exact scalar extraction are documented in `directory-review-summary.json`, `source-assessments.json` and `build-directory-review.cjs`. The 20-program research scope includes triage and searches; it does not mean 20 accessible university pages. Only hash-verified primary source captures support imported facts. Blocked hosts were skipped. The shared parser, all earlier approved candidates and their frozen manifests remain unchanged.

Tougaloo explicitly publishes an assistant baseball/recruiting role; no head is inferred. East Georgia's July 2026 announcement identifies Jason Mock to lead its baseball program in the completed head-coaching staff. Its title is normalized to Head Baseball Coach and no contact-page fill is proposed. Olivet and Viterbo titles retain the published men's designation; a scoped recognition helper handles the explicit head role without changing stored title text. Wiley's `mailto:kdbriggs@wileyc.edu` is preserved exactly. No email delivery, future-season tenure, or manual verification is claimed.

The offline preflight passed **35 negative preservation/scope checks and three role checks**, without database access or environment loading. `directory-manifest.json` freezes 37 inputs. The checkpoint verifier validates the prior approval, mixed-field receipt, created records, fresh verification and latest closeout before permitting a new preview. All fresh state sections must match the saved baseline; user-owned profiles and nonblank contact values stop the preview.

Run this read-only preview:

```powershell
node .\data\enrichment\naia-university-directory-batch-20261112\preview-directory-batch.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-university-directory-batch-20261112\preview-directory-batch.cjs
```

Send the live preview output. Approval is NOT_GRANTED, no apply script exists, and previous approvals do not authorize this new scope. After exact live-plan approval, one guarded mixed import and one read-only closeout can handle the whole batch.

Current verified totals: 1,580 colleges, 5,139 coaches, 22,702 players, 577 snapshots, 194 stored NAIA programs, 147 populated contact URLs. The working member-matched set has 187 campuses, with 147 head-covered programs and 63 current 2027 rosters. If separately approved and verified, this proposal would yield 5,153 global coaches, 155 contact URLs, 155 head-covered programs and 32 staff holds; all 124 roster holds remain. Players and snapshots do not change. The stored NAIA count is not a verified national baseball total. Inventory reconciliation, institution status/duplicate holds and secondary evidence work remain open; NAIA is incomplete.

## Exact directory batch approved; guarded apply prepared
User approved exact live preview read-only-preview-2026-11-12T20-42-50-756Z-d5df3ec2. CandidateSHA d07db7cfdca751049d5331d41b4ac6ebcb31b6dcf5ee465b3113bb782e47a9b8; planSHA e23eabe925d1bba5b08fe56da37f5346446a07650e4dc38476dcb54569e8c21d. approval.json records exact scope:14coaches/8heads +8null-onlyProgram contactURLfills, zero players/snapshots/College mirrors/deletes/merges/verification/YouTube. apply-approved-directory-batch.cjs prepared from previous mixed script with scoped coach fixture and verification, nine College+nine Program locks, one parameterized eight-row update (24 bound values),14creates, full16state compare before/inside Serializable and after. Every old coach/player/snapshot and other dependency/profile record preserved; only8Programcontactfields+allowedProgramupdatedAt may change. Receipts pluscreatedrecords/appliedfieldchanges saved beforefreshreadonlyverify. No retries/upserts/deletes. Assistant has no DB/envaccess. USER runs --preflight then --apply once, sendsoutput forONEcloseout. Future receipt has8files so10closeoutpins; inserted{coaches:14}, rowsUpdated8,batchesoneexact; no players/snapshotcreates. Expectedglobals1580colleges5153coaches22702players577snapshots194storedNAIA155contactURLs,heads155/32holds,rosters63/124holds. Not applied yet. Inventory/status/secondary gaps still open; not all roster holds are currently fillable. See exactremainingevidencequeue, not generic percentage-complete claim.

Approved apply offline preflight PASSED:32negativepreservation checks,5SQL safety checks,2parameterizedlock checks; databaseAccessfalse/writes0. No live import executed by assistant.

```powershell
node .\data\enrichment\naia-university-directory-batch-20261112\apply-approved-directory-batch.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-university-directory-batch-20261112\apply-approved-directory-batch.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```
