# Consolidated NAIA recovery review

This pass reviews 23 programs together. Current primary evidence supports additions at 14 programs: **51 coaches, 14 explicit head flags, 97 players and two 2027 snapshots**. The remaining outcomes and the entire remaining staff/roster queue are consolidated in `exceptions-report.json`, with source-by-source assessments in `source-assessments.json`. There is one preview, exact approval, import and closeout cycle for the supported batch.

| Program | Coaches | Head flags | 2027 players |
| --- | ---: | ---: | ---: |
| Bluefield University, Virginia | 4 | 1 | 0 |
| Briar Cliff, Iowa | 5 | 1 | 64 |
| Dickinson State, North Dakota | 3 | 1 | 0 |
| Embry-Riddle Prescott, Arizona | 6 | 1 | 0 |
| The Master's University, California | 3 | 1 | 0 |
| Park, Missouri | 5 | 1 | 0 |
| Park Gilbert, Arizona | 9 | 1 | 0 |
| Talladega, Alabama | 3 | 1 | 0 |
| Taylor, Indiana | 4 | 1 | 33 |
| Point, Georgia | 3 | 1 | 0 |
| Morningside, Iowa | 2 | 1 | 0 |
| William Penn, Iowa | 1 | 1 | 0 |
| Jarvis Christian, Texas | 2 | 1 | 0 |
| St. Thomas, Florida | 1 | 1 | 0 |
| **Total** | **51** | **14** | **97** |

The two roster snapshots cover Briar Cliff and Taylor. Missing player attributes stay null, generic P does not establish handedness, and aggregate metrics are filled only where attributes are sufficiently complete. No previous roster or coach is replaced. These are unverified source-supported additions, not verification promotions or confirmation of every future-season appointment.

Canonical baseball department headers establish staff scope at the eight Sidearm directories. Administration duplicates are excluded; support, student manager, leadership-only and development-team roles are not promoted into varsity coaching roles. Explicit dual roles retain their full titles, while head flags recognize only their explicit head-coaching segment. Taylor's published coach cards, Point/Morningside/Jarvis institutional directories, and William Penn/St. Thomas canonical profiles provide the other staff evidence. Full names, exact titles, contacts and source URLs are in `bulk-review-summary.json`.

Point's obfuscated email strings are held null. No scripts are evaluated and no email addresses are inferred or copied from third parties. Published contact spellings, including apparent typos, remain as supplied; delivery has not been tested. Missing profile/contact values stay null.

The 44 saved source outcomes include 36 readable HTTP200 captures. Literal published navigation is followed for staff, baseball and roster discovery; previously denied hosts and redirects into those hosts are held. HTTP404/discovery failures are not evidence of a program closing. The third-party search results were discovery leads only. Wrong-campus results for Embry-Riddle Daytona, St. Francis Illinois and St. Lawrence are not used for the Prescott AZ or Saint Francis IN records. Both Park campuses and Bluefield University versus Bluefield State are kept distinct.

Nine reviewed programs have no supported additions in this pass: Simpson, Viterbo, Waldorf, Westcliff, Wilberforce, Huntington, Sterling, Midland and Georgetown. Access/discovery holds remain. Huntington's institutional sport assignment does not explicitly establish a head-coach title, so no head flag is inferred. Older-season rosters and dated coaching pages remain held even when readable. Dickinson State has a current roster label but no resolved player rows; it gets staff additions only. St. Thomas gets only the current canonical Jorge Perez profile, not staff from its dated 2026 coaches/roster pages. Current canonical directories are used independently of their schools' older roster pages.

`exceptions-report.json` retains all remaining 40 head-role and 126 current-roster holds after the proposed scope, plus the seven unchanged stored inventory exceptions and national baseball membership reconciliation limitations. Counts overlap and are not a unique school total. Missing captured evidence does not establish that a roster is unpublished or a program absent. Existing older queue notes are historical; use this pass's source assessments for current outcomes.

Candidate SHA-256: `fbb66a1889cc348a8347bf21f2272d947b2cdd6d0cc00f5e0859f1d7492e04ed`. Approval is NOT_GRANTED for this new batch. No apply script exists.

Baseline is the successful campus-directory closeout `closeout-audit-2026-11-12T18-44-55-300Z-f2dd38b7`. Its snapshot hash `8015b7d5001c25dfebd4e7172bee3962a6db31e9ba49d50a4c052119dbfe300e` independently matches committed verification bytes. Global baseline: 1,580 colleges, 5,088 coaches, 22,523 players and 573 snapshots; 194 stored NAIA programs. The stored count is not a verified national baseball total.

The offline preflight PASSED at 2026-11-12T18:55:57.725Z: 30 negative preservation/scope checks, all 16 state sections, no database access or writes. It pins all raw evidence, source reconstruction, schema, prior receipt chain and exception reports. Source reconstruction is cached within this new process to avoid repeatedly parsing the full batch during negative checks; source hashes and full candidate equality remain required. Prior approved scripts are unchanged.

Run one read-only preview for the entire batch:

```powershell
node .\data\enrichment\naia-bulk-recovery-20261112\preview-bulk-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-bulk-recovery-20261112\preview-bulk-recovery.cjs
```

The no-argument command compares all 16 fresh state sections in a read-only transaction and saves the exact reviewed plan for approval. Prior approvals do not authorize this scope. If separately approved, imported and verified, supported head coverage would become 147 of 187 matched programs, and 2027 roster coverage 61. Expected global totals would be 5,139 coaches, 22,620 players and 575 snapshots. No existing field changes, deletions, merges, ownership/verification changes or YouTube updates are proposed. National inventory and NAIA enrichment remain incomplete.

## Entire consolidated batch approved — one guarded apply ready
User approved read-only-preview-2026-11-12T19-22-33-291Z-0441d324. Reviewed-plan SHA-256: 90db426d62f05c5b2c1c741282e0295ba1fe103e082ffc9da103e83c3d966615. The frozen candidate retains its historical NOT_GRANTED marker; approval.json separately records authorization.

Offline preflight PASSED 31 negative preservation checks and two parameterized lock checks, with no database access. One Serializable transaction creates the approved 51 coaches, 97 players and two snapshots, locking 14 College and 14 Program parent rows. All existing records/scalars/timestamps/ownership and verification metadata must remain unchanged across all 16 state sections. New fields/defaults/identities/timestamps are checked. Receipts and created records are saved before fresh read-only verification. There are no automatic retries, updates, upserts or deletes.

Run once for the entire batch:

```powershell
node .\data\enrichment\naia-bulk-recovery-20261112\apply-approved-bulk-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-bulk-recovery-20261112\apply-approved-bulk-recovery.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected global totals: 5,139 coaches, 22,620 players and 575 snapshots. Send output for one pinned read-only closeout. Do not rerun prior imports. The exceptions report is research-only and does not authorize disposition changes.

## Bulk import complete — one read-only closeout next
Receipt approved-bulk-recovery-2026-11-12T19-26-41-538Z-212bd2fc passed fresh verification with zero differences. Do not rerun the apply. Offline closeout preflight PASSED at 2026-11-12T19:34:53.946Z with 23 negative checks and all 16 state sections. Saved coverage: 147 supported heads (40 holds), 61 current rosters (126 holds).

```powershell
node .\data\enrichment\naia-bulk-recovery-20261112\audit-bulk-recovery-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-bulk-recovery-20261112\audit-bulk-recovery-closeout.cjs
```

The live closeout only reads the database. It checks the complete committed state and exports the next baseline, remaining holds and verified created record IDs for the entire batch. The stored NAIA count remains unverified nationally; overall enrichment remains incomplete.
