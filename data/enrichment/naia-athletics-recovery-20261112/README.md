# Published athletics recovery

New unapproved proposal: 13 coaches, two head flags, 44 Lawrence Tech 2027 players and one roster snapshot. No existing field changes, deletions, merges, verification promotions or YouTube updates.

| Program | Coaches | Players / snapshots |
| --- | --- | --- |
| Lawrence Technological University, Michigan | Stan Eldridge (head), Tom Compian, Ryan Hilton, Anthony Hermelyn, Jim Mancuso, Brad Roth, Anthony Puente | 44 / 1 |
| Indiana Wesleyan University, Indiana | Mathew Bair (head), Kyle Baker, Carlos Leyva, Steve Friend, Dalton Miller, Caleb Olsen | None; player roster unresolved |

Lawrence Tech's [official 2027 coaches page](https://ltuathletics.com/sports/baseball/coaches) supplies the seven baseball coaches and their published contacts. Its literal navigation links lead to the [2027 roster](https://ltuathletics.com/sports/baseball/roster), which yields 44 distinct supported varsity player rows. Athletic training and communications support rows are excluded.

Indiana Wesleyan's current [head-coach profile](https://iwuwildcats.com/staff-directory/mathew-bair/566) provides a literal navigation link to the [2027 roster page](https://iwuwildcats.com/sports/baseball/roster). Its explicit Baseball Coaching Staff section supports six coaches. Player extraction remains empty, partial or unresolved and is held; a 2027 heading alone does not justify player additions. Coach contact fields absent from the roster staff rows remain null. No third-party contacts, old Ian Macdonald coaching profile, or historical catalog appointments were copied. Training, communications and strength-only support staff are excluded.

The five HTTP200 raw captures and exact source hashes are saved in `captures.json`. Both campus IDs are checked against the latest closeout, NAIA division and absence of existing coaches; Lawrence Tech's roster and snapshot are also checked for absence. New records remain unverified. Missing player attributes remain null; generic P does not establish throwing handedness. Snapshot totals are populated only where supported by complete attributes.

Candidate SHA-256: `0e00aeac9db0cc39153e5b460483a25fb6517c843efb12a800975e7b1ef23859`.

Baseline: directory-recovery closeout `closeout-audit-2026-11-12T16-40-27-359Z-c90fb19f`, independently byte-matched to committed verification. Global counts: 1,580 colleges, 5,064 coaches, 22,432 players and 571 snapshots; 194 stored NAIA programs. The stored count is not a verified national baseball total.

Run the offline preflight followed by the live read-only preview:

```powershell
node .\data\enrichment\naia-athletics-recovery-20261112\preview-athletics-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-athletics-recovery-20261112\preview-athletics-recovery.cjs
```

The no-argument command checks all 16 baseline state sections inside a read-only transaction and saves the exact reviewed plan. Approval remains NOT_GRANTED; previous approvals apply only to completed imports. No apply script exists. If separately approved and verified, matched head coverage would become 128 of 187 (59 holds), and 2027 roster coverage 58 (129 holds). National baseball inventory and NAIA enrichment remain incomplete.

## Exact reviewed plan approved — guarded apply ready
User approved read-only-preview-2026-11-12T16-58-40-189Z-09235cee. Reviewed-plan SHA-256: c5ba4203cc08f28a878b660daf2b06b3ca67329e74cfe3bcc2aa8080c47152f3. The candidate remains frozen with its historical NOT_GRANTED marker; approval.json separately records authorization.

Offline import preflight PASSED 31 negative preservation checks and two parameterized lock checks, without database access. The script creates only 13 coaches, 44 players and one snapshot in a Serializable transaction, locking two College and two Program parent rows. All 16 existing state sections and existing ownership/verification metadata must remain unchanged. Every new scalar, generated ID, default and timestamp is checked. Receipts are saved before fresh read-only verification; no automatic retries, updates or upserts.

Run once:

```powershell
node .\data\enrichment\naia-athletics-recovery-20261112\apply-approved-athletics-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-athletics-recovery-20261112\apply-approved-athletics-recovery.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected global totals: 5,077 coaches, 22,476 players and 572 snapshots. Send output for a pinned read-only closeout. Do not rerun completed imports.

## Import complete — read-only closeout next
Receipt approved-athletics-recovery-2026-11-12T18-08-29-710Z-5ec4b823 passed fresh verification with zero differences. Do not rerun the apply. Offline closeout preflight PASSED at 2026-11-12T18:11:22.458Z with 23 negative preservation checks and all 16 state sections. Saved coverage: 128 supported heads (59 holds), 58 current rosters (129 holds).

```powershell
node .\data\enrichment\naia-athletics-recovery-20261112\audit-athletics-recovery-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-athletics-recovery-20261112\audit-athletics-recovery-closeout.cjs
```

The live closeout only reads the database. It checks the complete committed state and exports the next baseline, remaining holds and verified created record IDs.
