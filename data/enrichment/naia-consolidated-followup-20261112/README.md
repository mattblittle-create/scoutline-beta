# Consolidated contact linkage and native roster recovery

One new review covers **58 blank program contact-page URL fills, 82 new 2027 players and two snapshots**. No coaches, colleges or programs are created. No existing populated field is overwritten; no College mirror change, deletion, merge, verification promotion or YouTube change is proposed. Approval is NOT_GRANTED.

## Program contact links

58 programs have approved imported head-coach records but still have a null `CollegeBaseballProgram.generalContactUrl`. The original enrichment already uses official staff pages for that field. This proposal fills each blank with the exact original approved staff source/contact URL, rather than discovering or inferring a different destination.

`followup-contact-evidence.json` lists all 58 programs, campus IDs, head roles, original source package and source candidate hashes. Each imported head record is compared field-for-field against its frozen original candidate and the latest baseline. Nine historical approved packages were initially checked with their full apply pins. `source-proof.json` consolidates their exact candidate, approval and manifest hashes plus 141 distinct raw source hashes. Subsequent checks verify this evidence directly, avoiding repeated reads of historical database snapshots. The latest full-state committed receipt is independently verified. Previous approved packages and the shared parser remain unchanged.

No new live URL reachability or email delivery check is claimed for these reused captures. Missing coach contact values stay missing. Staff/profile URLs are useful program contact routes but do not guarantee that a coach publishes an email or responds. No social or video URL replaces a contact route.

## Recovered current rosters

| Program | 2027 players | Snapshot |
| --- | ---: | ---: |
| Dickinson State, North Dakota | 42 | 1 |
| Indiana Wesleyan, Indiana | 40 | 1 |

The [Dickinson State source](https://dsubluehawks.com/sports/baseball/roster) and [Indiana Wesleyan source](https://iwuwildcats.com/sports/baseball/roster) were previously captured and held as unresolved layouts. Both explicitly label the varsity roster as 2027 and contain complete named native cards with unique player profile URLs. The old shared parser lacked this native-card extraction path and did not recognize the alternate table name headers. Its files remain frozen.

`native-roster-recovery.cjs` is a new extractor scoped to these two exact source files and hashes. It checks explicit season labels, named card/profile uniqueness, native/table row counts, published position/class agreement and campus IDs. Indiana Wesleyan's table profile identities match all 40 native cards. Dickinson's table omits the name column; all 42 jersey/position/class tuples, including blank jerseys, match the native card multiset. The 42 named cards independently provide unique names and profile URLs. No names are inferred from unnamed table rows or jersey values.

Only explicit card attributes are imported. Missing heights/weights remain null, generic P does not establish throwing handedness, and snapshot aggregates are populated only when sufficiently complete. Both programs have no existing 2027 player/snapshot rows in the pinned baseline. New player/snapshot verification fields remain null. Evidence details are in `followup-roster-evidence.json`.

## Remaining roster evidence

The saved-evidence audit covers all 126 pre-proposal roster holds in `roster-hold-classification.json`:

| Saved evidence classification | Programs |
| --- | ---: |
| Only an older season captured | 68 |
| No reviewed roster destination capture | 49 |
| Current page with no resolved player entries in saved capture | 3 |
| Published destination access hold | 4 |
| Current format/content review needed, recovered in this proposal | 2 |

After this proposed recovery, 124 roster holds remain. These categories describe captured evidence, not whether a current roster is unpublished or a baseball program absent. No season is rolled forward. The seven stored stale/duplicate inventory exceptions and national membership reconciliation remain open.

Additional institution research is saved separately in `institution-captures.json`: seven readable captures and one SUNO institutional 403. These are unapproved staff leads, not coach additions in this batch. Do not retry the denied `www.suno.edu` host. The draft contact-only files are superseded unapproved preparation artifacts; use only the combined preview below.

## Preview

Candidate SHA-256: `2e3f29f3b690586fd4c403086e82737da9ac3ef67fae506e9fb1438748925850`.

Baseline: bulk closeout `closeout-audit-2026-11-12T19-43-34-645Z-c8c1969e`, independently byte-matched to its committed snapshot (`e8a7bb79c278c0b17fb1506748b3b4ef02417a5bcc69eb0eb674c43723002a17`). Global baseline: 1,580 colleges, 5,139 coaches, 22,620 players and 575 snapshots; 194 stored NAIA programs. The stored count is not a verified national baseball total.

Offline preflight PASSED at 2026-11-12T20:00:19.528Z: **40 negative preservation, field-scope, season and native-layout checks**, all 16 state sections, no database access or writes. One live read-only preview covers the whole combined proposal:

```powershell
node .\data\enrichment\naia-consolidated-followup-20261112\preview-consolidated-followup.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-consolidated-followup-20261112\preview-consolidated-followup.cjs
```

The no-argument command compares all 16 fresh baseline sections in a read-only transaction and saves the exact reviewed plan. No apply script exists. Previous approvals do not authorize this scope.

If separately approved, imported and verified, program contact-page coverage would rise from 89 to 147 and current roster coverage from 61 to 63 of 187 matched programs. Head coverage remains 147 (40 holds). Expected global totals: 5,139 coaches, 22,702 players and 577 snapshots. Existing ownership, verification metadata and dependency rows must remain preserved. National baseball inventory and overall NAIA enrichment remain incomplete.

## Exact combined plan approved — one guarded import ready
User approved read-only-preview-2026-11-12T20-03-15-417Z-3cd23833. Reviewed-plan SHA-256: 1b2607d0cc892c4536dfba56d0297de5c511b0ee66211687d7a68d283441dbeb. The frozen candidate retains its historical NOT_GRANTED marker; approval.json records authorization separately.

The apply preflight PASSED 36 preservation checks, five SQL safety checks and two parameterized lock checks, with no database access. One Serializable transaction locks 58 College and 58 Program rows, performs one parameterized null-only contact update, then creates 82 players and two snapshots. Program ID, College ID, NAIA division and lack of a user-owned profile guard every update. All 16 state sections are verified, allowing only the 58 approved Program contact values and their Program.updatedAt timestamps, plus the approved new player/snapshot rows. Existing College timestamps, ownership, verification metadata and dependency rows must remain unchanged. Receipts, created records and exact applied field changes are saved before fresh read-only verification. No automatic retry, upsert or delete is used.

Run once for the whole approved batch:

```powershell
node .\data\enrichment\naia-consolidated-followup-20261112\apply-approved-consolidated-followup.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-consolidated-followup-20261112\apply-approved-consolidated-followup.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected global totals: 5,139 coaches, 22,702 players and 577 snapshots, with 147 populated NAIA program contact URLs. Send the output for one pinned read-only closeout. Do not rerun completed imports.

## Consolidated followup imported; closeout ready
User import receipt approved-consolidated-followup-2026-11-12T20-15-59-382Z-03cba009 passed fresh read-only verification with zero differences: 58 Program contact URL fills, 82 players2027, two snapshots; no coaches. Globals1580 colleges/5139 coaches/22702 players/577 snapshots, storedNAIA194, contactURLs147. DO NOT REAPPLY. audit-consolidated-followup-closeout.cjs and closeout-manifest.json pin all eight receipt files plus apply manifest and audit (10 pins). Offline preflight PASSED 23 negative preservation checks, zero DB access, full16state/approval/commit/field-change/created-record chain verified. USER runs --preflight then noargs read-only audit. Await live closeout before using its fresh snapshot as next baseline. Coverage147/187 heads (40 holds),63/187 current2027rosters (124 holds); national baseball inventory unverified and NAIA incomplete. Continue consolidated larger batches; saved institution leads remain unapproved. Assistant did not load environment files or access DB.
