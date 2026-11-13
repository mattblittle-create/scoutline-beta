# NAIA roster holds and Concordia PDF review — November 12, 2026

Latest USER live closeout `naia-staff-followup-20261111/closeout-audit-2026-11-11T21-29-46-505Z-e6e14ec3` passed with zero drift across 16 sections. Its full snapshot independently matched the committed verification bytes. Baseline:1580Colleges/5042coaches/22327players/569snapshots,194storedNAIA,119matchedheads/55currentrosters. Do not reapply completed imports.

## All 132 roster holds classified from saved evidence

| Evidence classification | Programs |
| --- | ---: |
| Only older-season roster captured | 62 |
| No reviewed roster destination capture | 62 |
| Published roster destination access hold | 4 |
| Current-season heading, empty template/no player entries in capture | 3 |
| Page scope unresolved in HTML collector; now resolved via PDF review | 1 |

No remaining HTML page parsed as an additional current roster. Of 62 without a roster destination capture, Arkansas Baptist has a reviewed baseball homepage but no selected roster link; 61 have no reviewed baseball homepage capture in that collection. These are source discovery/access queues, not proof of absent or unpublished rosters. Older captures likewise do not prove a 2027 roster is unavailable elsewhere. Empty pages: Crowley's Ridge, Nelson and Reinhardt. Avoid guessing URLs, bypassing challenges, rolling seasons forward or inventing empty-team snapshots.

## Separate proposal: Concordia Nebraska's official PDF

The official roster page literally links to the PDF captured in `concordia-pdf-capture.json`. The previous generic HTML collector had decoded this binary document as text; that file cannot establish PDF contents. A fresh binary capture verified HTTP200, PDF magic and SHA256. A temporary hash-checked PyMuPDF package was used for read-only extraction/rendering without changing project dependencies. Both complete rendered pages were visually inspected. The explicit heading is “2027 Concordia Baseball Roster.” There are 45 players on page one and20 on page two.

New candidate: **65 players and one 2027 roster snapshot**, zero coaches or existing-field changes. SHA256:`5614e02d1540b68eff0c96895c1cf3332531248ae714704f7f73f004ee39f190`. Approval NOT_GRANTED. Exact established Nebraska campus ID is used; stored state spelling NEB. is preserved. Names/position/height/year are extracted by stable row coordinates and checked against the visual columns; weights and player bio URLs remain null. No inference from B/T to pitching handedness. PDF staff-footer differences remain held, with no changes to existing coach records proposed.

`extract-concordia-pdf.py` reproduces the row sidecar; `build-pdf-roster-review.cjs` validates its source hash, page counts, row formats, native published link and all derived player/snapshot values. Manifest pins the original PDF, extraction script/rows, official source HTML, builder, schema and latest full baseline. All old 5042coaches/22327players/569snapshots and 16state sections must remain identical. New rows remain unverified; no deletes/merges/ownership/manual-verification/YouTube changes.

USER runs:

```powershell
node .\data\enrichment\naia-roster-holds-20261112\preview-pdf-roster.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-roster-holds-20261112\preview-pdf-roster.cjs
if ($LASTEXITCODE -ne 0) { throw 'Preview failed; inspect the report.' }
```

Read-only only; no apply script exists. After live preview passes, obtain approval of this exact new scope before preparing guarded apply. Prior staff approval does not cover this roster. Preserve frozen source/candidate/build files. If imported, current roster coverage would rise55->56of187; remaining132->131. Still68head/staffholds,37logoholds,sevenstoredexceptions and inventory/evidence gaps. Stored194 is not a verified national baseball total. NAIA remains incomplete.

Final offline preflight PASSED at2026-11-12T15:13:06.757Z:24negative preservation/scope checks,all16state sections,no database access. The new preview validates the latest pinned approved checkpoint directly (approval,plan,sources,commit,created records/defaults,full before/after state and matching closeout snapshot), avoiding redundant reconstruction of every historical batch. Existing approved scripts remain unchanged. The earlier superseded preflight manifest is diagnostic only; candidate SHA is unchanged.

## Exact roster batch approved; guarded apply

USER live preview `read-only-preview-2026-11-12T15-16-02-196Z-7a4eb304` passed. Its saved candidate and full baseline snapshot independently matched the frozen proposal and prior closeout. Reviewed-plan SHA256:`275c5ff5af58dd36465ad209fa3be19b5e83bcd58d218b2f3e6628bc1c62ce6a`. The user explicitly replied “Approve” for these65players/one2027snapshot. `approval.json` records authorization; historical candidate/preview approval labels remain unchanged.

The guarded apply checks the latest pinned approved checkpoint and frozen PDF evidence, compares a fresh read-only baseline, locks the one College and one Program, then creates only65players and one snapshot in a Serializable transaction. No coach creates, existing-field updates, upserts, deletes or automatic retries. Every old row/timestamp across16sections remains identical; new row identities/scalars/defaults/timestamps are checked before commit. The committed receipt and created records are saved before fresh read-only verification. No assistant database/env access.

USER runs once:

```powershell
node .\data\enrichment\naia-roster-holds-20261112\apply-approved-pdf-roster.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-roster-holds-20261112\apply-approved-pdf-roster.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected `FRESH_READ_ONLY_NAIA_PDF_ROSTER_VERIFICATION_PASSED`, zero differences, global5042coaches/22392players/570snapshots. Offline approved-apply preflight PASSED:27negative preservation checks,two parameterized lock checks,all16sections,no database access. After an interrupted/failed attempt inspect saved receipts/current state before any retry. After success prepare pinned read-only closeout; do not reapply completed imports.

## Import succeeded; read-only closeout

USER receipt approved-pdf-roster-2026-11-12T15-22-33-096Z-d78160dd passed fresh verification15:22:46.126Z:65players/one2027snapshot,zero differences;global5042coaches22392players570snapshots. Do not reapply.

```powershell
node .\data\enrichment\naia-roster-holds-20261112\audit-pdf-roster-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-roster-holds-20261112\audit-pdf-roster-closeout.cjs
```

Expected READ_ONLY_NAIA_PDF_ROSTER_CLOSEOUT_PASSED with zero changed/missing records,119matchedheads/56current2027rosters. Pinned audit verifies saved approval/commit/createdrowdefaults and all16beforeaftersections,thenfreshreadonlystate;exportsnextbaseline/remainingholds/createdIDs. OfflinecloseoutpreflightPASSED2026-11-12T15:25:07.012Z with23negativepreservationchecks andnoDBaccess. Remaining68head/staffholds/131rosterholds;NAIA incomplete.
