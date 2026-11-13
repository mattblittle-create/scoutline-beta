# NAIA inventory follow-up — November 11, 2026

The prior nine-school/five-program correction import and its live closeout passed. Its new authoritative baseline is `../naia-inventory-review-20261111/correction-review/closeout-audit-2026-11-11T14-47-27-367Z-ca49d221/fresh-read-only-snapshot.json`. The saved closeout was independently checked offline against the exact approved and committed snapshots. Do not rerun that import.

The user explicitly approved this separate proposal: "Approve the two-school import and four school-type corrections." It has not been applied by the assistant. Candidate SHA256: `3c88cb19f58e41b00ed7ad653791a90777334e98284462b0b70d0db156d78ccb`. The frozen proposal's NOT_GRANTED field remains historical; `approval.json` records the subsequent authorization.

## Proposed records

| Action | School | Exact proposed fields |
| --- | --- | --- |
| Create College + Program | Oklahoma Panhandle State University, OK | College name, unique slug, state, confirmed institutional website, UNVERIFIED; Program NAIA, Sooner Athletic Conference, UNVERIFIED |
| Create College + Program | University of Science and Arts of Oklahoma, OK | Same explicit field set with its distinct institutional name, slug and website |
| Update College | Andrew College | schoolType JUNIOR_COLLEGE → FOUR_YEAR |
| Update College | Bismarck State College | schoolType JUNIOR_COLLEGE → FOUR_YEAR |
| Update College | Hesston College | schoolType JUNIOR_COLLEGE → FOUR_YEAR |
| Update College | Georgia Southern University – East Georgia Campus | schoolType JUNIOR_COLLEGE → FOUR_YEAR |

The two institution websites returned HTTP 200 and identify the proper universities. Both schools appear in the official 2026–27 NAIA member reference. Oklahoma City University's official **2027 varsity baseball schedule** explicitly publishes three Sooner Athletic Conference games against each school. This resolves current program-existence evidence through an independent official source without retrying their previously held HTTP 202 athletics responses. Both campuses are absent from the entire 1,578-College saved database snapshot across all divisions.

No baseball-homepage URL is proposed for either new program. Those direct page-access holds remain. There are no guessed baseball paths, new coach contacts, roster records, scholarship claims, social links or manual verification markers. Other nullable values and schema defaults on new records remain defaults, not independently verified school facts.

## School-type evidence

- Andrew's current accreditation page explicitly lists its own BA and BS degrees alongside its associate programs.
- Bismarck's 2026–27 catalog lists its own Bachelor of Applied Science; its current academics page separately describes four-year degrees.
- Hesston's current engineering page describes its accredited Bachelor of Science program, including 126 credits.
- Georgia Southern's current consolidation page identifies the unified university effective January 1, 2026 and describes East Georgia's targeted bachelor-degree offerings. The Swainsboro campus remains separate from Georgia Southern's main-campus baseball identity.

FOUR_YEAR here classifies a bachelor-degree-granting school/campus in the existing schema. It does not claim every program is four years or that associate degrees ceased. No tuition, academic-area, admissions, financial, campus or NIL facts are imported under these four field changes.

## Other research dispositions

Independent institutional sport lists resolved four previously incomplete menu reviews: Columbia College SC, College of Saint Mary NE, Nevada State and the University of the Virgin Islands. Their published lists do not include baseball; this is a bounded publication finding, not an absolute claim that no team could exist. Among the original other-member source holds, Fisk, Life Pacific, Montana State–Northern and Paul Quinn remain unresolved. Additional source holds from the previously stored cohort remain.

Middle Georgia's enriched D2 record and stale NAIA duplicate remain untouched. Closed/suspended-school holds remain. No deletions, merges, status promotion or existing program-field changes are proposed. All prior nine-school corrections, 4,563 coaches, 19,757 players, 514 snapshots and all seven program-dependency/eight school-profile models must match the passed closeout exactly.

The projected stored NAIA total would be 194 and the global College count 1,580. The stored total includes unresolved stale records and is not an independently verified current national baseball count. National inventory verification and NAIA enrichment remain incomplete.

## Run the read-only preview

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-inventory-followup-20261111\preview-followup.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Follow-up preflight failed; stop.' }
node .\data\enrichment\naia-inventory-followup-20261111\preview-followup.cjs
if ($LASTEXITCODE -ne 0) { throw 'Read-only preview stopped; inspect source or baseline drift.' }
```

The user-run preview passed at `read-only-preview-2026-11-11T15-00-02-647Z-83ff6cfb`. Its saved plan and full baseline were independently checked offline, and it is explicitly approved. Reviewed plan SHA256: `fb140a9b9c2e4867e1a041a8ae2a538567055ddf2746bc76f5277fd1811cdec8`. No preview rerun or additional approval is needed to apply this exact scope.

Offline preflight passed: 21 negative preservation/scope checks, source assertions, prior approval/import/closeout chain and the full fresh baseline. A first source assertion omitted the words “at Hesston College”; it was corrected to match the exact published sentence before approval. No candidate fields or source bytes changed. The frozen manifest pins 24 inputs. Do not rebuild/refreeze after approval.

## Apply the approved follow-up once

**Completed:** the user-run import passed at `approved-followup-2026-11-11T15-06-40-312Z-1db82f00`, with fresh verification at 15:07:01 UTC. The saved commit/created records/applied changes and full snapshot chain were independently validated offline. Do not rerun this completed import. The apply commands below are historical; use the pending closeout command at the end.

`apply-approved-followup.cjs` pins the exact approved candidate, live preview and original evidence manifest through `apply-package-manifest.json`. Offline apply preflight passed 34 negative preservation checks and three scope/SQL checks. It does not load database environment files or connect to a database in --preflight mode.

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-inventory-followup-20261111\apply-approved-followup.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Approved follow-up preflight failed; stop.' }
node .\data\enrichment\naia-inventory-followup-20261111\apply-approved-followup.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before any retry.' }
```

The script reads a fresh baseline in a confirmed PostgreSQL READ ONLY transaction. The write phase uses one Serializable transaction, locks the four existing Colleges and their four Programs, rechecks all 16 saved state sections, performs four exact-before-value guarded College updates and creates two Colleges with nested Programs. All newly created scalar fields must match approved values, nulls and literal schema defaults. Only the four existing College updatedAt values may advance; every existing Program field, including updatedAt, remains exact.

It saves a commit receipt before the independent fresh read-only verification. Expected mode: `FRESH_READ_ONLY_NAIA_FOLLOWUP_VERIFICATION_PASSED`, two school/program pairs created, four school-type fields changed, zero remaining differences, 1,580 global Colleges, 194 stored NAIA Programs. Existing coaches, players, snapshots and all dependency/profile rows remain unchanged. Both new Program baseballWebsiteUrl values remain null. The stored total still includes stale held records and is not a verified national baseball count.

Share the printed verification summary and REPORT_PATH. If interrupted after a write attempt, inspect the receipt/current state before retrying; the diagnostics distinguish confirmed commit from uncertain outcome. After success, prepare the next read-only closeout audit from that exact receipt. No previous import should be rerun.

## Pending follow-up closeout

`audit-followup-closeout.cjs` pins the exact successful receipt through `closeout-manifest.json`. Offline preflight passed 25 negative preservation checks, both approved import chains and all saved transaction/record receipts. Live mode accepts no apply argument, confirms PostgreSQL READ ONLY, and compares all 16 state sections exactly with the final follow-up snapshot, including updatedAt values.

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-inventory-followup-20261111\audit-followup-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-inventory-followup-20261111\audit-followup-closeout.cjs
if ($LASTEXITCODE -ne 0) { throw 'Read-only closeout stopped. Inspect receipts or drift; do not rerun either import.' }
```

Expected mode: `READ_ONLY_NAIA_FOLLOWUP_CLOSEOUT_PASSED`, zero changed/missing records. Cumulative two-batch changes: 11 College/Program pairs created and 28 existing fields corrected. Global College count 1,580; stored NAIA count 194 (not a verified national baseball total). All 4,563 coaches, 19,757 players, 514 snapshots and seven dependency/eight profile tables are preserved. NAIA program data still has no coaches or roster records; links are populated at home 192, roster 179, schedule 179, with audited secondary fields zero.

The audit saves a fresh full baseline, the two new campus IDs/websites, four corrected school types and remaining holds. Four academic-type holds are resolved, while two direct baseball-homepage access holds, the Middle Georgia duplicate, closed/suspended schools and other source holds remain. After the live audit passes, resume that remaining inventory/evidence review. No national inventory completion, NAIA enrichment completion or production web check is implied.

## Follow-up closeout confirmed; held-reference audit next

The user-run live closeout `closeout-audit-2026-11-11T15-11-06-341Z-2f16fdf1` passed with zero drift across all 16 state sections. Cumulative approved changes: 11 new Colleges and Programs and 28 existing field changes. Stored NAIA programs: 194, not a verified national baseball total.

`audit-held-references.cjs` is a new read-only audit for the six closed/suspended records, the stale Middle Georgia duplicate, and the canonical D2 Middle Georgia campus. Offline preflight passed: 27 schema/logical reference paths, including two logical verification-submission paths. It exports counts only, compares the approved baseline in a read-only RepeatableRead transaction, and proposes no deletions, merges or field changes. JSON/text/external references are outside its coverage. No inactive/archive field exists on the parent school/program models; no disposition is approved.

Next user commands:

```powershell
node .\data\enrichment\naia-inventory-followup-20261111\audit-held-references.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-inventory-followup-20261111\audit-held-references.cjs
```
