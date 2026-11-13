# Campus directory staff recovery

New proposal: five coaches, including three explicit head flags, with no existing field changes or player/snapshot additions. No deletion, merge, verification promotion or YouTube update is proposed. Import approval is NOT_GRANTED for this new batch.

| Campus | Proposed staff | Primary source |
| --- | --- | --- |
| Culver-Stockton, Missouri | Brad Gyorkos, Head Baseball Coach | https://culver.edu/directory/brad-gyorkos/ |
| Fisher, Massachusetts | Scott Dulin, Athletics Director, Head Baseball Coach | https://www.fisher.edu/learn-more/faculty-and-staff-info/staff-directory?const_page=2 |
| Clarke, Iowa | Brian McCabe, Head Baseball Coach | https://www.clarke.edu/person/brian-mccabe/ |
| Clarke, Iowa | Jaden Rolffs and Anthony Ruden, Assistant Baseball Coaches | https://clarke.edu/person/page/4/ |

All four raw institutional pages returned HTTP200; source hashes are in `captures.json`. They are current canonical directory entries, not dated articles or old handbooks. Exact campus IDs, NAIA division, absence of existing coaches and lack of user-owned profiles are checked against the latest baseline. The same-named Culver Academies, Clark University and St. John Fisher are excluded by campus identity.

Culver's explicitly printed university email and phone/extension are included. Fisher's obfuscated email remains held; no script was executed and no third-party contact copied. Fisher has no profile URL copied from its fragment link. Clarke contact values remain null where absent. Its two Last, First directory labels are normalized at the explicit comma boundary. Scott Dulin's dual director/head title remains intact, with the explicit head role recognized. All new coaches remain NEEDS_REVIEW and unverified, with claim/manual-verification fields null. These sources do not establish future-season rosters or complete staff coverage.

Candidate SHA-256: `d57a864cb6cc01319a4ee226bd74597960a6d0868b4e4379fa170ba6210975fd`.

Baseline: current-source closeout `closeout-audit-2026-11-12T18-35-47-794Z-d4f76680`, independently byte-matched to committed verification. Global counts: 1,580 colleges, 5,083 coaches, 22,523 players and 573 snapshots; 194 stored NAIA programs. Stored count is not a verified national baseball total.

Offline preview preflight PASSED at 2026-11-12T18:38:15.285Z with 24 negative checks and all 16 state sections; no database access or writes. Run the user-side preflight and live read-only preview:

```powershell
node .\data\enrichment\naia-campus-directory-recovery-20261112\preview-campus-directory-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-campus-directory-recovery-20261112\preview-campus-directory-recovery.cjs
```

The no-argument command only reads the database and saves the exact reviewed plan. No apply script exists. Previous approvals do not authorize this batch. If separately approved and verified, head coverage would become 133 of 187 matched programs (54 holds); roster coverage remains 59 (128 holds). National baseball inventory and overall NAIA enrichment remain incomplete.

## Exact plan approved — guarded apply ready
User approved read-only-preview-2026-11-12T18-40-03-112Z-2f97b2cc. Reviewed-plan SHA-256: c58d4e38df80b79aaf7761eed1c1c2b9f47db90e6f2fde79913b98b0c6c78cf4. The frozen candidate retains its historical NOT_GRANTED marker; approval.json records authorization separately.

Offline preflight PASSED 25 negative preservation checks and two parameterized lock checks, with no database access. The script creates only five coaches in a Serializable transaction, locking three College and three Program rows. All existing records, scalars, timestamps, ownership and verification metadata must remain unchanged across all 16 state sections. New row fields/defaults/IDs/timestamps are verified. Receipts are saved before fresh read-only verification; no automatic retries, updates or upserts.

Run once:

```powershell
node .\data\enrichment\naia-campus-directory-recovery-20261112\apply-approved-campus-directory-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-campus-directory-recovery-20261112\apply-approved-campus-directory-recovery.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected global totals: 5,088 coaches, 22,523 players and 573 snapshots. Send the output for a pinned read-only closeout. Do not rerun completed imports.

## Import complete — read-only closeout next
Receipt approved-campus-directory-recovery-2026-11-12T18-42-00-306Z-26f25966 passed fresh verification with zero differences. Do not rerun the apply. Offline closeout preflight PASSED at 2026-11-12T18:42:59.436Z with 23 negative checks and all 16 state sections. Saved coverage: 133 supported heads (54 holds), 59 current rosters (128 holds).

```powershell
node .\data\enrichment\naia-campus-directory-recovery-20261112\audit-campus-directory-recovery-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-campus-directory-recovery-20261112\audit-campus-directory-recovery-closeout.cjs
```

The live closeout only reads the database. It checks the complete committed state and exports the next baseline, remaining holds and verified created record IDs.
