# Final 32-program NAIA staff review — one consolidated batch

All 32 remaining head-coach gaps were reviewed together. **Six current heads are supported; 26 remain unresolved.** Reviewing all32 does not make all32 importable. The remaining records were not filled from stale profiles, search snippets or unsupported role assumptions.

The proposal is **14 coaches, six head flags and four blank Program.generalContactUrl fills**, across Bethany KS, Hastings NE, LSU Shreveport LA, Northwestern Ohio OH, Simpson CA and Sterling KS. No roster, College mirror, status or national-inventory changes are proposed. Candidate SHA-256: `a93c629b1bbb81709a3fd8276e8b6c019b75fefac0ffb637b0113951b9e144a2`. Forty-three inputs are frozen in `staff-manifest.json`.

`all-32-dispositions.json` records an outcome for every campus, exact IDs and source-capture states. `staff-review-summary.json` lists exact staff scalars and source limitations. The reproducible extractor is `build-final-staff.cjs`. Existing source parsers and earlier approved manifests remain unchanged.

| Program | Coaches | Head flags | Contact URL fills | Accepted evidence |
|---|---:|---:|---:|---|
| Bethany KS | 3 | 1 | 1 | Public base64 JSON embedded in saved institution directory; all117records inspected offline |
| Hastings | 1 | 1 | 0 | October1 2026 campus student newspaper original interview with head Victor Rojas |
| LSU Shreveport | 1 | 1 | 1 | University directory search, through its advertised public GET form |
| Northwestern Ohio | 4 | 1 | 0 | Official2026–2027 catalog, PDFpage191/printed189, visually inspected |
| Simpson | 4 | 1 | 1 | Current staff directory plus official DanTating resignation announcement |
| Sterling | 1 | 1 | 1 | Current institution directory |

Bethany: Olan Ortiz, Alexander Cuevas Vasquez and Dakota Young. No new request to the subsequently access-held university host was made to extract the previously saved embedded directory. Its public widget JSON is decoded without eval, script execution or protected access.

UNOH: Kory Hartman, Aaron Lee, Jeremy Snow and Dylan Healy. Aaron Lee's explicit varsity assistant duties are retained; the separate JV head role does not receive a varsity head flag. No email or phone inferred from this catalog.

Simpson: Wilson Kessel, Brady Meeds, Dominic Folks and Eric Winchester. Current staff-directory titles supersede old biography/JV wording and departed DanTating. Published multi-line titles use slash separators. Jackson Bennett's player-development/strength role is excluded.

LSUS: exact university-directory name `BRAD NEFFENDORF`, title `HEAD COACH`, division `BASEBALL`, email `BRADLEY.NEFFENDORF@LSUS.EDU`, phone `318-798-4109`. The sports-medicine director returned in the same search is excluded.

Hastings: Victor Rojas's normalized Head Baseball Coach title is supported by the original current fall-season interview, not an old coaching biography. No contact values or Program contact-page field inferred from the newspaper. Sterling's profile has no contact values in the saved capture, so none are invented.

The latest user closeout is `../naia-university-directory-batch-20261112/closeout-audit-2026-11-12T20-58-01-939Z-a17ce39c/`. It passed all16sections with zero drift. The new checkpoint verifier checks its approval, receipt, exact eight field updates,14createdcoaches, fresh verification, snapshot byte-equality and remaining-hold chain. Current totals:1580colleges/5153coaches/22702players/577snapshots,194storedNAIA,155contactURLs,155matchedheads/32holds,63current2027rosters/124holds.

Offline preflight PASSED35negativepreservation/scopechecks and five rolechecks at2026-11-12T21:03:09.602Z. No database access or environment loading by the assistant. Run the one read-only live preview:

```powershell
node .\data\enrichment\naia-final-staff-review-20261112\preview-final-staff.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-final-staff-review-20261112\preview-final-staff.cjs
```

Send output for exact-plan approval. No apply script exists and approval is NOT_GRANTED. If separately approved/imported/verified, expected global coaches5167, populated contactURLs159, matchedheads161/187 and remainingheadholds26. All124rosterholds remain unchanged. No guarantee all26are currently resolvable. National baseball inventory, institution-status/duplicate holds and secondary fields remain incomplete; do not mark NAIA complete.

User requested stopping for the day after this staff batch. After any approved import and final closeout, write the stopping checkpoint. Tomorrow:124current2027rosterholds, national inventory/status reconciliation, and the unresolved26staffevidenceholds; no unsupported head flags.

## Git checkpoint review

`git-checkpoint-review.json` is read-only inventory evidence. At inspection, localmain and locally recordedorigin/main were both24374522f71afc9a613e5f7052c55d78baa8135e; no fetch was performed. Tracked files were clean. Approximately3.09GB of untracked enrichment artifacts and172.8MB of temporary files exist; counts grow as reports are saved. Many enrichment files are repeated32MBfull-state JSON snapshots. The database imports are already live and do not need a code push to take effect.

Do not use blanket `git add .` or commit downloaded PDF tooling/compiled binaries undertmp. A scoped commit of scripts, documentation, manifests, candidates and compact reports is appropriate only with a durable backup/archive plan for the referenced raw evidence and snapshots. These frozen scripts depend on exact paths/hashes, so do not delete/move/ignore evidence merely to reduce VSCode counts. A future clone needs those archived artifacts restored to run historical checks. No files moved/deleted, Git ignore configuration changed, commit, push, fetch or sync performed.

Approved final staff apply offline preflight PASSED:32negativepreservationchecks,5SQLsafetychecks,2parameterizedlockchecks,all16state; databaseAccessfalse/writes0. USERapplystillpending. Finalcloseoutthenstop.

```powershell
node .\data\enrichment\naia-final-staff-review-20261112\apply-approved-final-staff.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-final-staff-review-20261112\apply-approved-final-staff.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

## Final staff import COMPLETE; final live closeout pending before stopping
User applied exact approved final staff batch successfully. Receipt approved-final-staff-2026-11-12T21-15-08-420Z-3b238b03 committed2026-11-12T21:15:20.105Z;freshverification21:15:24.890Z PASSED remainingDifferences0. FourProgramcontactURLupdates/14coachcreates/6headflags; allold16state/ownership/verification/deps preserved. Globals1580colleges5167coaches22702players577snapshots194storedNAIA159contactURLs. Matchedheads161of187(26holds),current2027rosters63of187(124holds). Nationalinventory/NAIA incomplete. DO NOTREAPPLY.

Prepared audit-final-staff-closeout.cjs +closeout-manifest10pins (8receiptfiles+selfaudit+applymanifest). OfflinepreflightPASSED23negativechecks at2026-11-12T21:16:46.544Z withdatabaseAccessfalse/writes0;fullapprovedpreview/commit/freshverification/all16state andremainingholdcounts verified. USER runs --preflight then noargsreadonlyaudit below, sendsoutput. OnlyfinalLIVEcloseout remains, nofurtherresearchtoday. Afteruserpassappendexactcloseoutpath/freshsnapshotSHA to stoppingnotes andstop. Tomorrow userresumes124current2027rosters+nationalinventory/statusholds,26staffevidenceholds retained. Sevenstale/duplicaterecordsheld. Don'tclaimall32resolvedorNAIAdone. NoassistantDB/envaccess;noGitcommit/push/sync/archivehasoccurred. Gitbackup/curatedcheckpointstillpendingdecision;3.1GBuntrackedresearch+173MBtmp,trackedcleanatlastinspection. Do notdelete/movesource/snapshotsorblanketgitadd.

```powershell
node .\data\enrichment\naia-final-staff-review-20261112\audit-final-staff-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-final-staff-review-20261112\audit-final-staff-closeout.cjs
```

## STOPPING CHECKPOINT — November 12, 2026
Final user-run read-only closeout PASSED at closeout-audit-2026-11-12T21-18-28-648Z-fbcb7e04 (2026-11-12T21:18:28.648Z), committed receipt approved-final-staff-2026-11-12T21-15-08-420Z-3b238b03. Zero database writes in closeout; transactionReadOnly on; all16state sections match; changedOrMissingRecords0. Saved fresh closeout snapshot byte-matches committed fresh verification, SHA256 aa4a59e033a1f4e61f57632f0f14842564bc719124519031b69328631d2fab03. Final approved import COMPLETE AND CLOSED:14coaches/6heads/4ProgramcontactURLfills. DO NOT REAPPLY ANY COMPLETED IMPORT.

Current verified globals:1580colleges,5167coaches,22702players,577snapshots,194storedNAIA (not verified national baseball total),159populatedProgramcontactURLs. Working matched set187:161withactivehead/26staffholds,63with2027roster/124rosterholds. All32staffgaps reviewed together;only6resolved,26remainunsupported/access/stale/conflictheld. Nationalinventory and NAIA enrichment remain INCOMPLETE; seven stored stale/duplicate records retained unchanged. No deletes/merges/manualverification/YouTube changes.

USER REQUESTED STOP FOR TODAY: stop enrichment work now. Tomorrow, when user resumes: start from this exact closeout snapshot/remaining-holds.json; prioritize124current2027rosterholds, national baseball inventory reconciliation and institution/status holds; retain26staffevidenceholds. Continue larger consolidated batches, onepreview/exactapproval/import/closeout per supported scope. Noautomatic season rollover, verification promotion, blocked-host retry or unsupported role flags. Assistant never loadsenv or accessesDB; user runs live commands. Final-staff all-32-dispositions.json records current review reasons, and closeout remaining-holds.json is authoritative next queue.

Git checkpoint remains pending: NOcommit/push/sync/fetch or artifactbackup/archive performed. Last read-only inspection:trackedfilesclean,localmain matcheslocallyrecordedorigin/main24374522f71afc9a613e5f7052c55d78baa8135e(actualremotenotfetched). About3.1GBuntracked enrichment artifacts plus173MBtmp tooling. Database imports alreadylive,no codepush required for their effect. Before archival/curatedcommit, preserve exact frozen source/snapshot paths and hashes; do notdelete/move/blanketgitadd. User has not authorized commit/push. See git-checkpoint-review.json and README for recommendation. No further research started after final closeout.
