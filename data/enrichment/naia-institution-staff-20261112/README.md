# Institutional directory staff recovery

New proposal: six coaches, including two explicit head coaches, with no changes to existing records or program/college fields. No roster players or snapshots are proposed. Import approval is not granted.

| Campus | Proposed coaches | Primary source |
| --- | --- | --- |
| Avila, Missouri | Chris Begg; Matt Carpenter (head); Tyler Cody; Erick Mojica; Carlisle Walker | https://www.avila.edu/directory/ |
| Cleary, Michigan | Andrew Maki (head) | https://www.cleary.edu/staff/andrew-maki-3/ |

Each source is a current canonical institutional directory, rather than a dated historical article or season-specific archive. Current directory listings support these roles but do not establish a 2027 roster. All proposed coach rows remain unverified and NEEDS_REVIEW, with no claim/manual verification metadata. Exact campus IDs are joined to the saved latest closeout and checked for existing coaches and user-owned profiles.

Avila provides four assistant emails but no head-coach email. All Avila phone values are null; the one displayed value contains N/A. Cleary supplies a phone and extension but no coach email. General admissions contacts and third-party contact details are excluded. No emails were inferred. Contact availability or delivery has not been tested.

Other researched directories remain held: Bethany has no usable captured staff entries; Briar Cliff's captured HTML supplies no matching baseball staff rows despite search-index content; Brescia's student directory returned 403. Search snippets alone were not imported, and no blocked route was retried. Five source attempts and their statuses/hashes are saved in the two capture manifests.

Candidate SHA-256: `7d960582d0a4e9675c61edb39b820c308c85caa5de23b072962c96c2d29599d2`.

Baseline: navigation closeout `closeout-audit-2026-11-12T15-55-29-680Z-c996317c`, with 5,052 coaches, 22,392 players and 570 snapshots globally. Direct pinned receipt verification avoids rerunning historical builders; source reconstruction and all 16 state sections are still checked. Previous approvals do not authorize this batch.

Run the new preflight and read-only preview:

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-institution-staff-20261112\preview-institution-staff.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-institution-staff-20261112\preview-institution-staff.cjs
```

The no-argument command uses a read-only transaction and compares all 16 saved baseline sections. It saves the exact reviewed plan and fresh snapshot for approval. No apply script has been prepared. If approved and subsequently verified, matched head coverage would rise from 122 to 124 of 187; 63 head-role holds and 131 roster holds would remain. National baseball inventory reconciliation and NAIA enrichment remain incomplete. No deletion, merge, verification promotion or YouTube change is proposed.

## Exact plan approved; guarded apply prepared

The user approved the six-coach plan from `read-only-preview-2026-11-12T16-20-19-009Z-976ee72d`. Its reviewed-plan SHA-256 is `4908f1d808f08ca59efea61b8e49086134fc2aa4df957e2fefdadf70fd7a3fb6`. The candidate and original source manifests remain frozen with their historical NOT_GRANTED marker; `approval.json` records approval separately.

`apply-approved-institution-staff.cjs` permits only six new coaches, with two head flags, at the two approved programs. It pins seven approved inputs plus all source-manifest inputs, compares the complete fresh baseline, locks both College and Program parent rows, and uses a Serializable transaction. It verifies all existing rows, timestamps and metadata unchanged across all 16 sections, and checks every new scalar, generated ID, default and timestamp. It saves the committed receipt and created rows before fresh read-only verification. No automatic retries, updates or upserts are used.

Run once:

```powershell
node .\data\enrichment\naia-institution-staff-20261112\apply-approved-institution-staff.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-institution-staff-20261112\apply-approved-institution-staff.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected global counts after success: 5,058 coaches, 22,392 players, 570 snapshots, 1,580 colleges and 194 stored NAIA programs. Send the output to prepare the pinned read-only closeout. Do not rerun any earlier import.

## Import complete — read-only closeout next
Receipt approved-institution-staff-2026-11-12T16-24-08-877Z-05025ec4 passed fresh verification with zero differences. Do not rerun the apply. The offline closeout preflight PASSED at 2026-11-12T16:25:50.011Z: 23 negative preservation checks and all 16 state sections. Confirmed saved coverage: 124 supported heads, 63 head holds, 56 current rosters, 131 roster holds.

```powershell
node .\data\enrichment\naia-institution-staff-20261112\audit-institution-staff-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-institution-staff-20261112\audit-institution-staff-closeout.cjs
```

This command only reads the database. It exports the next baseline, remaining holds and verified created IDs after comparing the full fresh state to the saved committed state.
