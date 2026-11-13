# NAIA literal-navigation staff recovery — November 12, 2026

Latest USER live closeout `naia-roster-holds-20261112/closeout-audit-2026-11-12T15-26-54-479Z-eb3538b4` passed with zero drift. Its full snapshot independently matched committed verification bytes. Baseline1580Colleges/5042coaches/22392players/570snapshots,119matchedheads/56current2027rosters. Do not reapply completed imports.

The next roster scan covered all131remaining holds using saved official homepage/roster/schedule/staff evidence. New links appeared for four programs: one PDF explicitly labeled2025 (held as older-season evidence), plus alternate views for Crowley's Ridge/Nelson/Reinhardt. One new view per empty-roster program was checked: Crowley's Ridge403 (held/no retry); Nelson and Reinhardt200with no player rows/bio links. No new roster import is supported by that pass. See `../naia-roster-holds-20261112/alternate-roster-links.json` and `alternate-view-review.json`.

## New proposal:10coaches across3programs

Remaining staff-gap review identified three readable official sources whose directory links were missed by the first collector. Blue Mountain Christian and Keiser publish literal JSON `var obj` navigation data; Hesston has a native `/staff.aspx` anchor. The new helper uses JSON.parse only, without evaluating scripts, synthesizing routes or modifying the frozen shared source helper. All three exact published directories returnedHTTP200.

| Program | New coaches | Head flags |
| --- | ---: | ---: |
| Blue Mountain Christian | 3 | 1 |
| Hesston College | 4 | 1 |
| Keiser University | 3 | 1 |

Candidate SHA256:`5c6323496fa8571b5456f498ad1fca9adc8f515fd44bb17a2e111d52f784cb1e`. Approval NOT_GRANTED for this separate batch. `staff-review-summary.json` records raw published names/titles/contact facts. Explicit Baseball sections establish varsity scope; Blue Mountain's development-team section is excluded. Hesston's Trenton Canaan explicitly holds an Assistant Baseball Coach role alongside administrative duties; one record is proposed. Duplicate listings are collapsed. Literal published email halves are joined without executing scripts. Current directory publication is not independent confirmation of every future-season appointment. New records remain unverified.

Zero existing-field changes, players or snapshots. Exact source-link chains/raw hashes, campus IDs, current empty staff data, schema and latest pinned approved checkpoint are checked. All16state sections must match the baseline, preserving all5042coaches/22392players/570snapshots and claims/ownership/manual-verification metadata. No deletes,merges,seasonrollover,YouTube work or verification promotion.

USER runs:

```powershell
node .\data\enrichment\naia-navigation-recovery-20261112\preview-navigation-staff.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-navigation-recovery-20261112\preview-navigation-staff.cjs
if ($LASTEXITCODE -ne 0) { throw 'Preview failed; inspect the report.' }
```

Read-only only; no apply script exists. After live preview passes obtain approval of this exact new scope before preparing guarded apply. Prior approvals do not cover these ten coaches. Preserve frozen source/candidate/build/preview files.

If approved/imported, globalcoaches5052/matchedheads122of187;headstaffholds68->65. Currentrosterholds131unchanged. The other reachable unresolved directories are UHSP (archived baseball menu/unpublished coach page; sponsorship hold needs review) and Oakwood (published Baseball rows list managers without supported coaches). Sixty-three staff holds have no reviewed baseball homepage in the current source collection. Nationalinventory/fullNAIA remain incomplete;stored194 is not a verified national baseball total.

Offline preflight PASSED2026-11-12T15:36:18.350Z:24negative preservation/scope checks,all16state sections,latest pinned approval/commit/created-record checkpoint and new source chains verified,no database access.

## Exact ten-coach batch approved; guarded apply

USER live preview `read-only-preview-2026-11-12T15-38-28-475Z-d66d29fb` passed. Its saved candidate/full snapshot independently matched the frozen proposal and preceding closeout. Reviewed-plan SHA256:`3edc9af1093ef814594679c54800fedf886b63dbc35a913dc2df1fdbdf1329df`. The user explicitly replied “Approve” for these ten coaches/three head flags. `approval.json` records authorization; historical candidate/preview approval labels remain unchanged.

The apply checks frozen evidence and the latest pinned approved checkpoint, compares a fresh read-only baseline, locks three Colleges and Programs, and creates only the ten approved coaches in a Serializable transaction. All old rows/fields/timestamps across16state sections must remain identical; new scalars/defaults/source identities/timestamps are verified before commit. No player/snapshot creates, field updates, upserts, deletes or automatic retries. The commit receipt and created records are saved before fresh read-only verification. No assistant database/env access.

USER runs once:

```powershell
node .\data\enrichment\naia-navigation-recovery-20261112\apply-approved-navigation-staff.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-navigation-recovery-20261112\apply-approved-navigation-staff.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected `FRESH_READ_ONLY_NAIA_NAVIGATION_STAFF_VERIFICATION_PASSED`, ten new coaches/three heads, zero differences, global5052coaches/22392players/570snapshots. Offline approved-apply preflight PASSED:25negative preservation checks,two parameterized lock checks,three College/Program locks,all16sections,no database access. After interruption/failure inspect receipts/current state before any retry. After success prepare a pinned read-only closeout;do not rerun completed imports.

## Import succeeded; read-only closeout

USER receipt approved-navigation-staff-2026-11-12T15-45-50-640Z-cf0b5eb9 passed fresh verification15:46:07.853Z:ten coaches/three heads,zero differences;global5052coaches22392players570snapshots. Do not reapply.

```powershell
node .\data\enrichment\naia-navigation-recovery-20261112\audit-navigation-staff-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-navigation-recovery-20261112\audit-navigation-staff-closeout.cjs
```

Expected READ_ONLY_NAIA_NAVIGATION_STAFF_CLOSEOUT_PASSED with zero changed/missing records,122matchedheads/56currentrosters. Pinned audit checks approvedplan/commit/createdrowdefaults/full16beforeaftersections andfreshreadonlystate;exportsnextbaseline/holds/createdIDs. OfflinecloseoutpreflightPASSED2026-11-12T15:47:45.936Z with23negativechecks andnoDBaccess. Remaining65headstaff/131rosterholds;NAIA incomplete.

## Navigation live closeout PASSED; institution-status evidence review
USER closeout-audit-2026-11-12T15-55-29-680Z-c996317c passed all16sections/zero drift. Independently verified snapshot SHA fecb1ab7d3b371218a298587db28e5448951ddd9d693c8f0720ad85ffefa8a75 matches committed verification bytes. Baseline1580Colleges5052coaches22392players570snapshots194storedNAIA. DO NOT REAPPLY. Matched187:122heads/65holds,56rosters/131holds. New naia-status-review-20261112 captures two public UHSP institutional transition pages HTTP200/hash-verified. FAQ conditions 2026-27 athletics on sufficient players; announcement describes pending WashU acquisition/academic transition, neither establishes baseball sponsorship. UHSP retained HOLD_NO_DATABASE_CHANGE. review-status.cjs offline passed and writes status-review.json with65staffworkitems (63source-discovery/UHSPsponsorship/Oakwoodheadrole); README explains evidence/limits. No DB/env access, no new import proposed/approved. National baseball inventory and NAIA enrichment remain incomplete. Continue public official alternate-source discovery/current-season evidence; respect challenged-route holds, no guessed season routes. Frozen approved files untouched.
