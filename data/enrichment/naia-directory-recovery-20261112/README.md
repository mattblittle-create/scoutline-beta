# Directory and current-roster recovery

Proposed additions: six coaches, including two explicit heads, plus 40 Goshen 2027 roster players and one snapshot. No existing field changes, deletions, merges, verification promotions or YouTube updates. Approval is NOT_GRANTED for this new scope.

| Program | Staff additions | Roster additions |
| --- | --- | --- |
| Defiance College, Ohio | Ben Babcock, assistant; Shane Gardner, head | None |
| Goshen College, Indiana | Brad Stoltzfus, head; James Stricker, recruiting/assistant pitching; Isaac Lehman, catchers/strength and conditioning; Adam Amodei, pitching | 40 players, one 2027 snapshot |

Defiance's canonical university directory supplies baseball-specific department cards. All nine pages were captured using literal published pagination links. Staff contacts come from the named cards, including the two explicitly printed university emails. No historical handbook appointments were used.

Goshen's canonical athletics staff directory was reached through navigation on the primary head-coach biography. Only rows whose semantic headers identify the Baseball department are included. Isaac Lehman's explicit Catcher's Coach role supports inclusion with his full published dual-role title. Mike Brouillette's Leadership Coach role is held as support. Split email strings were read literally; no scripts were evaluated. Older unrelated staff and third-party contact listings were not used.

The roster URL was published in the same official navigation. Its title, selected season and native roster rows identify 2027 varsity baseball. The parser yields 40 distinct player rows. An embedded JSON-LD position value of 39 is not treated as a player count. Older headshot filenames do not establish a different roster season. Missing player attributes stay null; generic P does not establish throwing handedness. Snapshot metrics are generated only where attributes are sufficiently complete. No existing roster is replaced.

Doane's public institutional directory returned 403 and remains held; it was not retried. No synthesized or guessed season URLs were fetched. Captures are raw HTML with SHA-256 hashes in `directory-captures.json` and `followup-captures.json`.

Candidate SHA-256: `723779157fbeb604a72f6660b0a35ea7d320c9c5b1744d818d0217096b00e17b`.

Baseline: `naia-institution-staff-20261112/closeout-audit-2026-11-12T16-29-17-968Z-19f5f825`, independently byte-matched to committed verification. Global baseline: 1,580 colleges, 5,058 coaches, 22,392 players, 570 snapshots; 194 stored NAIA programs. The stored count is not a verified national baseball total.

Run the offline preflight followed by the live read-only preview:

```powershell
node .\data\enrichment\naia-directory-recovery-20261112\preview-directory-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-directory-recovery-20261112\preview-directory-recovery.cjs
```

The no-argument command checks all 16 state sections in a read-only transaction and saves an exact reviewed plan for approval. No apply script exists. Previous batch approvals do not apply. If separately approved and verified, head coverage would rise from 124 to 126 of 187 matched programs (61 holds); roster coverage from 56 to 57 (130 holds). National inventory and overall NAIA enrichment remain incomplete.

## Approved import — offline preflight passed
User approved the exact saved preview read-only-preview-2026-11-12T16-35-22-644Z-4b833685. Reviewed-plan SHA-256: 97bedaa72e734b3ad599f22a7d144f5aa935b35d9f9c3dd33db95278467cc27b. The frozen candidate retains its historical NOT_GRANTED marker; approval.json records the authorization separately.

The apply preflight PASSED 31 negative preservation checks plus two parameterized lock checks, with no database access. The script creates only six coaches, 40 players and one snapshot in a Serializable transaction, locking two College and two Program rows. All existing state remains unchanged. Expected global totals: 5,064 coaches, 22,432 players and 571 snapshots.

Run once:

```powershell
node .\data\enrichment\naia-directory-recovery-20261112\apply-approved-directory-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-directory-recovery-20261112\apply-approved-directory-recovery.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Send the output for a pinned read-only closeout. The receipt and created records are saved before fresh read-only verification. Do not blindly retry a failed apply or rerun previous imports.

## Import complete; read-only closeout next
Receipt approved-directory-recovery-2026-11-12T16-37-53-737Z-bc0589eb passed fresh verification with zero differences. Do not rerun the apply. Offline closeout preflight PASSED at 2026-11-12T16:39:10.230Z with 23 negative preservation checks and all 16 state sections. Saved coverage: 126 supported heads (61 holds), 57 current rosters (130 holds).

```powershell
node .\data\enrichment\naia-directory-recovery-20261112\audit-directory-recovery-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-directory-recovery-20261112\audit-directory-recovery-closeout.cjs
```

The live closeout only reads the database. It checks the complete committed state and exports the next baseline, remaining holds and verified created record IDs.
