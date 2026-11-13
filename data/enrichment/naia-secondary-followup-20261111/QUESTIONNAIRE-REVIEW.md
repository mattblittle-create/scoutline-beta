# Next NAIA proposal: recruiting questionnaires

The USER-run logo closeout passed at 2026-11-11T16:53:34.788Z with zero drift and 150 populated logos. Its saved snapshot exactly matches the committed post-import snapshot and is the baseline for this separate proposal. Do not reapply the logo import.

Proposed: **14 blank Program questionnaire URLs and 14 blank College recruiting-questionnaire mirrors**, 28 field changes. Candidate SHA256: `866c1b2b5632370407a9abc267e66a263f3e922b154780b0aa54950e4d4d6664`. Approval is NOT_GRANTED for this new batch.

Reviewed campuses: Andrew College, Aquinas, Bellevue, Bryan, Calumet College of St. Joseph, Cornerstone, MidAmerica Nazarene, Milligan, Mount Marty, Peru State, Saint Mary (Kansas), Southwestern Christian, Warner Pacific and Warner (Florida).

Every destination returned HTTP 200 and contains a native anonymous-entry form with contact fields and explicit baseball scope in its heading or a Baseball sport option. Multi-sport forms are useful recruiting destinations; they are not described as baseball-only forms. No form was submitted and submission/delivery was not tested. Exact published link chains are reconstructed from saved official baseball pages, sometimes through an official recruiting directory. External form providers are accepted only through those published links. No guessed routes.

`questionnaire-review-summary.json` records each destination, scope and field count. The new builder reconstructs all changes from raw captures and exact link relationships; frozen source hashes include the new full baseline and schema. The read-only preview compares all 16 state sections, preserving the 4,931 coaches, 22,231 players, 567 snapshots, previous imports, ownership and verification metadata. No creates, deletes, merges, camp/social/logo changes, season rollover, verification promotion or YouTube changes.

USER runs:

```powershell
node .\data\enrichment\naia-secondary-followup-20261111\preview-questionnaires.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-secondary-followup-20261111\preview-questionnaires.cjs
if ($LASTEXITCODE -ne 0) { throw 'Preview failed; inspect the report.' }
```

No apply mode exists. After the live read-only preview passes, seek approval of this exact new 28-field plan before preparing its guarded import. Prior logo approval does not cover questionnaires. Preserve frozen candidate/source/build files after preview.

## Remaining evidence holds

The two Front Rush frame destinations remain unresolved. Sidearm/JavaScript forms without a verified native entry remain held. Camp captures are research only: no camp updates are proposed here. Arizona Christian has future numeric camp dates but unrelated template coach content, so requires further primary review. General camp hubs, expired events and roster/coach names containing “Camp” are excluded. No registration availability is claimed.

NAIA is still incomplete: 37 logo holds, 98 matched head/staff holds, 134 current 2027 roster holds, seven stale/duplicate stored exceptions, and current sport-list evidence holds remain. Stored NAIA count 194 is not a verified national baseball total.
Offline preflight PASSED at 2026-11-11T16:59:58.162Z: 22 negative preservation/scope checks, complete prior import chain verified, no database access.

## Exact plan approved; guarded apply

The USER's live preview `read-only-questionnaire-preview-2026-11-11T17-49-32-809Z-d43495cc` passed. Its saved candidate matched the frozen candidate and its full snapshot bytes matched the preceding logo closeout. Reviewed-plan SHA256: `296c199fcc4a7a84d7f3345dd0c705020560b94cefe423d4c4a779ee172a84c7`. The user explicitly replied “Approve” for this exact 28-field plan. `questionnaire-approval.json` records that authorization; historical candidate/preview approval labels remain unchanged.

The approved apply validates the complete frozen source and prior receipt chain, checks a fresh read-only baseline, locks 14 Colleges and 14 Programs in a Serializable transaction, then performs two parameterized null-only update batches. Only approved questionnaire values and the affected College/Program updatedAt timestamps may change. It verifies all 16 state sections before commit, saves the committed receipt, then performs fresh read-only verification. No automatic retry, create, upsert, delete or merge path exists.

USER runs once:

```powershell
node .\data\enrichment\naia-secondary-followup-20261111\apply-approved-questionnaires.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-secondary-followup-20261111\apply-approved-questionnaires.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected: `FRESH_READ_ONLY_NAIA_QUESTIONNAIRES_VERIFICATION_PASSED`, 28 field changes, zero differences, 18 populated NAIA questionnaires, 150 logos and unchanged global counts. After an interruption/failure, inspect saved receipts and current state before any retry. After success, prepare a pinned read-only closeout; do not reapply any completed import.
Approved apply offline preflight PASSED: 28 negative preservation checks, seven SQL/scope checks, all 16 state sections and no database access.

## Import succeeded; read-only closeout

USER receipt approved-questionnaires-2026-11-11T18-14-53-045Z-99bfedce passed fresh verification at 18:15:09.323Z:28updates,18Programquestionnaires,150logos,zero differences and unchanged global counts. Do not reapply.

```powershell
node .\data\enrichment\naia-secondary-followup-20261111\audit-questionnaires-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-secondary-followup-20261111\audit-questionnaires-closeout.cjs
```

The pinned closeout audits the approved preview, exact two-batch commit, all 16 before/after sections and fresh read-only state. Expected READ_ONLY_NAIA_QUESTIONNAIRES_CLOSEOUT_PASSED, zero changed/missing records. Saves the next full baseline and remaining holds. This does not establish NAIA completeness.
Closeout offline preflight PASSED at 2026-11-11T18:17:39.241Z: 24 negative preservation checks, exact receipt chain, all 16 sections, no database access.
