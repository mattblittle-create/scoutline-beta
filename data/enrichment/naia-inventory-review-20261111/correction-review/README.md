# NAIA campus and membership correction review

Candidate SHA256: `1471b38ec9dbd0d06ba352b3652b5aeb1a434989354a47e9b3386a128c2d065c`

Prepared November 11, 2026. The user-run preview passed, and the user explicitly approved: "Approve the nine-school, five-program correction import." No assistant database connection or import execution occurred. The frozen proposal's original NOT_GRANTED marker is preserved as historical evidence; `approval.json` records the subsequent authorization.

## Proposed new campuses

Each row creates one College and one baseball program. The name/state identity comes from the official 2026–27 member reference and independently reviewed official baseball evidence. Each new program has an explicit campus-specific slug, division, conference, confirmed official baseball homepage and UNVERIFIED status. City, academic facts, scholarship allocations, coach/roster data and secondary links are not invented.

| Proposed school | State | Proposed slug |
| --- | --- | --- |
| Bethel University (Indiana) | IN | bethel-university-indiana |
| Champion Christian College | AR | champion-christian-college |
| Mid-America Christian University | OK | mid-america-christian-university |
| Oklahoma City University | OK | oklahoma-city-university |
| College of the Ozarks (Missouri) | MO | college-of-the-ozarks-missouri |
| Southwestern Christian University | OK | southwestern-christian-university |
| Texas Wesleyan University | TX | texas-wesleyan-university |
| United States Sports University | AL | united-states-sports-university |
| Warner Pacific University | OR | warner-pacific-university |

University of the Ozarks, Arkansas (D3), Warner University, Florida, and Bethel's Tennessee and Minnesota campuses remain separate. The new records retain schema defaults as defaults, not verified academic/financial/intelligence facts. No manual verification date or marker is proposed.

## Existing program corrections

| Existing slug | Before | Proposed classification | Source |
| --- | --- | --- | --- |
| andrew-college | NJCAA D1 / Region 17 | NAIA / Southern States Athletic Conference | Current institutional transition announcement and official baseball page |
| bismarck-state-college | NJCAA D2 / Region 13 | NAIA / Frontier Conference | Institution explicitly lists baseball in its NAIA sports lineup |
| hesston-college | NJCAA D2 / Region 6 | NAIA / Continental Athletic Conference | Institution's July 2025 transition and current baseball source |
| east-georgia-college | NJCAA D1 / Region 17 | NAIA / Continental Athletic Conference | Georgia Southern explicitly identifies the former East Georgia State campus, current baseball sponsorship and July 2026 transition |
| shawnee-state | NAIA / River States Conference | NCAA D2 / Mountain East Conference | Current NCAA 2026–27 baseball directory; provisional year one, not full membership |

Twenty program-field changes total: division/conference plus clearing two obsolete generic scholarship-template fields on each of these five records. The cleared text/URLs are pinned to the exact existing NAIA/NJCAA seed values; no school-specific award amount is replaced or inferred.

Four College-field changes: East Georgia's name becomes `Georgia Southern University – East Georgia Campus`, its blank city becomes `Swainsboro`, Bethel's existing name becomes `Bethel University (Tennessee)`, and Concordia's becomes `Concordia University (Nebraska)`. Existing slugs and IDs remain intact. Georgia Southern's main-campus D1 program remains separate. Institution schoolType values on the four former junior-college records are preserved pending a separate academic classification review.

## Preserved records and holds

- Middle Georgia already has an enriched D2 record (`middle-georgia`: 3 coaches, 43 players, 1 snapshot) and a stale NAIA duplicate (`middle-georgia-state`). Both remain unchanged; no second D2 classification or merge is proposed.
- Closed/suspended schools remain held. The schema has no reviewed program-closure disposition in this candidate; there are no deletions or inferred reclassifications for them. St. Andrews has indexed official closure text but no successful raw capture; Oakland City suspension evidence is from a receiving public college.
- All 4,563 coaches, 19,757 players, 514 snapshots, seven program dependencies, eight school-profile tables, existing contact/social/logo fields, ownership, claims and verification metadata must exactly match the saved baseline. Only the 24 listed existing fields and normal updatedAt values on the rows eventually modified could change under a future approved apply.
- Only X/Instagram are social enrichment targets, with X preferred. This candidate makes no social or YouTube changes.

## Full review and limits

All 233 all-sport member rows received source dispositions. Among the 61 outside the stored-NAIA name/state join: 12 have captured official baseball pages, East Georgia has an explicit university baseball-sponsorship statement, 38 have no baseball listed in captured sport menus, and 10 remain source/menu holds. A missing menu entry is not proof that a team does not exist. Additional source holds remain in the previously stored cohort. National baseball inventory verification is still false.

The review rejected 16 map campus destinations, including additional wrong-institution links found in this pass. Conference research includes earlier wrong-sport menu selections and a binary standings-PDF parsing attempt as diagnostics; none is accepted as candidate proof. Current 2027 and historical 2026 standings are distinguished. The exact candidate proof, membership reference, reviewed dispositions, scripts and saved full baseline are pinned in a 37-input manifest. The broad diagnostic-file freeze was stopped offline and replaced with this focused proof set; no database connection occurred.

The projected stored NAIA count would be 192, including held stale records. It is not the independently verified current national baseball count.

## Run the read-only preview

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-inventory-review-20261111\correction-review\preview-corrections.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Offline preflight failed; stop.' }
node .\data\enrichment\naia-inventory-review-20261111\correction-review\preview-corrections.cjs
if ($LASTEXITCODE -ne 0) { throw 'Read-only preview stopped; inspect before continuing.' }
```

The live preview already passed at `read-only-preview-2026-11-11T14-34-30-016Z-88705753`. Do not rerun it merely to apply this approved plan. Its plan SHA256 is `348fe5307dca1392ee8e56994f853ba45a7b7a2d5960ccc30cfbd2244490eeda`. Do not rebuild/refreeze the approved candidate.

Offline verification passed: syntax, exact source/identity checks, and 20 negative state/campus preservation checks. Live mode confirms PostgreSQL READ ONLY and compares every saved record in all 16 state sections before writing local preview files. Any baseline drift stops the preview.

## Apply the approved plan once

**Completed:** the user-run apply passed at `approved-corrections-2026-11-11T14-43-11-246Z-192ad7df`, with fresh verification at 14:43:28 UTC on November 11. The saved commit, created records, 24 applied field changes and full before/after snapshots were independently verified offline. Do not rerun this completed import. The commands below are historical; use the closeout command at the end of this file.

`apply-approved-corrections.cjs` is pinned by `apply-package-manifest.json` to the exact approved preview, original source manifest and authorization. Offline apply preflight passed: 34 negative preservation checks and three update/SQL safety checks. No credentials or database environment are loaded by --preflight.

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-inventory-review-20261111\correction-review\apply-approved-corrections.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Approved import preflight failed; stop.' }
node .\data\enrichment\naia-inventory-review-20261111\correction-review\apply-approved-corrections.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Import stopped or needs verification. Inspect the report directory before any retry.' }
```

The apply runs a fresh read-only baseline comparison, then one Serializable transaction. It locks seven existing College and five existing Program rows, rechecks the entire baseline inside the transaction, performs eight Prisma updates with exact before-value guards, and creates nine Colleges with their nine nested Programs. It verifies every scalar on new records against approved values, nulls and schema defaults and compares all 16 state sections before commit. Only the three modified existing Colleges and five modified existing Programs may advance updatedAt. All other existing values must remain exact.

The commit receipt is saved before the independent post-commit read-only verification. Success mode: `FRESH_READ_ONLY_NAIA_CORRECTIONS_VERIFICATION_PASSED`, nine College/Program pairs created, 24 existing fields changed, zero remaining differences, and all held/dependent records preserved. An interrupted or failed apply does not claim zero writes after an attempt; inspect its receipts before retrying. A repeat apply stops on baseline drift rather than reapplying changes.

Share the printed verification summary and REPORT_PATH. Then prepare the read-only closeout audit from that exact committed receipt. National inventory verification and the remaining NAIA enrichment stages remain incomplete.

## Pending read-only closeout

**Completed:** the user-run closeout passed at `closeout-audit-2026-11-11T14-47-27-367Z-ca49d221`, zero changed/missing records. Its saved full snapshot was independently checked offline and is the baseline for the separate `../../naia-inventory-followup-20261111/` proposal. The closeout commands below are historical; no rerun is needed to resume work.

The receipt-pinned `audit-corrections-closeout.cjs` passed offline preflight, including 23 negative preservation checks. It validates the original approval/preview, exact committed updates and created IDs/defaults, and the consecutive full snapshots. Live mode uses PostgreSQL READ ONLY and requires exact equality with the final committed snapshot, including every updatedAt value. It exports a fresh baseline, verified new-campus IDs and remaining source/duplicate/closure/institution-classification holds.

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-inventory-review-20261111\correction-review\audit-corrections-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-inventory-review-20261111\correction-review\audit-corrections-closeout.cjs
if ($LASTEXITCODE -ne 0) { throw 'Read-only closeout stopped. Inspect receipts or drift; do not rerun the import.' }
```

Expected success: `READ_ONLY_NAIA_CORRECTIONS_CLOSEOUT_PASSED`, zero changed/missing records, 1,578 global Colleges, 192 stored NAIA programs, all 4,563 coaches / 19,757 players / 514 snapshots preserved. Stored NAIA coverage is baseball-home 192, roster-link 179, schedule-link 179; audited secondary fields and NAIA coach/player/snapshot records remain zero. Historical URL presence is not current-season verification. The stored count includes stale held records and is not the verified national baseball total.

After this audit passes, resume the remaining inventory and evidence holds. No new import approval, coaching completeness, roster completeness, public production verification or full NAIA completion is implied by this correction closeout.
