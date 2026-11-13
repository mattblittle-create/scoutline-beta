# Current published-source recovery

New proposal: six coaches, two explicit head flags, 47 Truett McConnell 2027 players and one snapshot. No existing field changes, deletions, merges, verification promotions or YouTube updates. Approval is NOT_GRANTED for this new scope.

| Program | Coaches proposed | Players / snapshots |
| --- | --- | --- |
| Truett McConnell, Georgia | Mike Croley (head), Ross Roberts | 47 / 1 |
| Midway, Kentucky | Luther Bramblett (head), JaVon Shelby, Dallen Turner, Will Newberry | None; captured roster is 2026 |

Primary sources are Truett McConnell's [2027 roster](https://tmbears.com/sports/baseball/roster) and [canonical staff directory](https://tmbears.com/staff-directory), plus Midway's [canonical staff directory](https://gomidwayeagles.com/staff-directory). Directory destinations were literal navigation links from the official roster or current [Midway head-coach profile](https://gomidwayeagles.com/staff-directory/luther-bramblett/3). Raw captures, timestamps and SHA-256 hashes are saved in `captures.json`.

Only staff rows whose semantic headers identify the Baseball department are considered. Midway's Jeff Smith, titled only Recruiting, is held because no explicit coaching role is established; Zack McClease, Student Assistant, is also held. Dallen Turner's explicit Pitching Coach / Recruiting Coordinator and Will Newberry's Graduate Assistant roles qualify. Missing contacts remain null, split email strings are read literally without evaluation, and older season-specific bio URLs are excluded where present.

The Truett McConnell title, selected season and native player rows establish a 2027 varsity roster. The frozen parser yields 47 distinct players. Missing attributes remain null; generic P does not establish handedness. Snapshot totals are populated only with sufficiently complete attributes. [Midway's captured roster](https://gomidwayeagles.com/sports/baseball/roster) explicitly says 2026 and is not rolled forward. Current directory staff are independently supported by the canonical directory, rather than that older roster.

Candidate SHA-256: `45ac7b5f089516e6ad35fc0adea5e811217e4bcf0aee9051f5032c1748a63e84`.

Baseline: athletics-recovery closeout `closeout-audit-2026-11-12T18-17-14-375Z-f1994b21`, independently byte-matched to committed verification. Global counts: 1,580 colleges, 5,077 coaches, 22,476 players and 572 snapshots; 194 stored NAIA programs. The stored count is not a verified national baseball total.

Run the offline preflight followed by the live read-only preview:

```powershell
node .\data\enrichment\naia-current-source-recovery-20261112\preview-current-source-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-current-source-recovery-20261112\preview-current-source-recovery.cjs
```

The no-argument command compares all 16 state sections in a read-only transaction and saves the exact reviewed plan for approval. No apply script exists. Prior approvals do not apply. If separately approved and verified, supported head coverage would become 130 of 187 matched programs (57 holds), and 2027 roster coverage 59 (128 holds). National baseball inventory and overall NAIA enrichment remain incomplete.

## Exact plan approved — guarded apply ready
User approved read-only-preview-2026-11-12T18-30-28-328Z-01205ed7. Reviewed-plan SHA-256: 4fddd37ad6ebbe699fe19768173c8ae5e4b78e2bebc23b842bf63568d0cd289c. The frozen candidate retains its historical NOT_GRANTED marker; approval.json records approval separately.

Offline preflight PASSED 31 preservation checks and two parameterized lock checks, without database access. The script creates only six coaches, 47 players and one snapshot in a Serializable transaction, locking two College and two Program rows. All existing rows/scalars/timestamps/ownership and verification metadata must remain unchanged across all 16 sections. New scalars, defaults, IDs and timestamps are checked. Receipts and created records are saved before fresh read-only verification; no automatic retries, updates or upserts.

Run once:

```powershell
node .\data\enrichment\naia-current-source-recovery-20261112\apply-approved-current-source-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-current-source-recovery-20261112\apply-approved-current-source-recovery.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected global totals: 5,083 coaches, 22,523 players and 573 snapshots. Send the output for a pinned read-only closeout. Do not rerun completed imports.

## Import complete — read-only closeout next
Receipt approved-current-source-recovery-2026-11-12T18-33-09-055Z-92be924f passed fresh verification with zero differences. Do not rerun the apply. Offline closeout preflight PASSED at 2026-11-12T18:34:36.449Z with 23 negative preservation checks and all 16 state sections. Saved coverage: 130 supported heads (57 holds), 59 current rosters (128 holds).

```powershell
node .\data\enrichment\naia-current-source-recovery-20261112\audit-current-source-recovery-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-current-source-recovery-20261112\audit-current-source-recovery-closeout.cjs
```

The live closeout only reads the database. It checks the complete committed state and exports the next baseline, remaining holds and verified created record IDs.
