# NAIA alternate-directory staff review

The USER-run core closeout `closeout-audit-2026-11-11T20-14-58-815Z-ee358047` passed with zero drift. Its saved full snapshot independently matched the committed verification snapshot exactly and is the new baseline. Do not reapply completed imports.

Final separate proposal: **26 coaches, including seven explicit head flags across seven programs**, with no player/snapshot additions or existing-field changes. Candidate SHA256: `793cd1a093cde9828222f0b56bd003105cea4f0250a4b7d65807f8e3c0975b6d`. New scope approval NOT_GRANTED.

Programs: British Columbia, Carolina University, Champion Christian, Concordia Nebraska, Indiana Southeast, La Sierra and Southwestern Christian. Saved official directory captures are reused; no new network requests were needed. Exact published link chains and raw hashes are checked. Explicit Baseball department headers, semantic cell associations or a role explicitly naming baseball establish scope. Concordia uses four native cards, including assistants without bio links. Duplicate administration listings are excluded in favor of the explicit Baseball department. Mixed JV/developmental/support roles are held. Champion's older-season Parker Ashton bio reference is blank; the current canonical directory's staff facts remain supported. No scripts were executed to decode literal published email halves.

Current canonical directory evidence is not independent confirmation of every future-season appointment. New records remain unverified. Existing 5,016 coaches, 22,327 players, 569 snapshots and all 16 state sections must match the baseline. No overwrites, deletions, merges, claims/ownership/manual-verification changes, season rollover or YouTube work.

USER runs:

```powershell
node .\data\enrichment\naia-staff-followup-20261111\preview-staff-followup.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-staff-followup-20261111\preview-staff-followup.cjs
if ($LASTEXITCODE -ne 0) { throw 'Preview failed; inspect the report.' }
```

Read-only only; no apply script exists. After live preview passes, obtain approval of this exact new scope before preparing a guarded import. Preserve frozen final candidate/source/build/preview files. `superseded-unapproved-r1` is diagnostic only; its preliminary 23-coach candidate was never presented for approval or imported.

If approved/imported, global coaches would reach 5,042; matched head-coach coverage would reach 119 of 187, leaving 68 head/staff holds. Current roster holds remain 132. Nelson and Reinhardt's current-season captures contain empty roster table templates and no current player bio links; those holds remain. Seven stale/duplicate stored exceptions, national baseball inventory reconciliation and secondary gaps remain open. Stored194 is not a verified national baseball total; NAIA remains incomplete.

Final offline preflight PASSED at 2026-11-11T20:20:56.917Z: 24 negative preservation/scope checks, all 16 state sections and complete prior source/receipt chain, no database access.

## Exact staff batch approved; guarded apply

USER live preview `read-only-preview-2026-11-11T21-08-20-981Z-8ab9be39` passed and its saved candidate/full baseline snapshot independently matched the frozen proposal and previous closeout. Reviewed-plan SHA256: `7103ed4d45d36b8b2648e262b3a05b8b050eb1692ec9154d52b7488395e6f6a4`. The user explicitly replied “Approve” to this exact 26-coach/seven-head batch. `approval.json` records authorization; historical preview/candidate approval labels remain unchanged.

The guarded apply validates frozen sources and the complete receipt chain, reads and compares a fresh read-only baseline, locks the affected Colleges and Programs, then creates only approved coaches in a Serializable transaction. No player/snapshot create, update, delete, upsert or automatic retry path exists. All existing fields/timestamps/records across 16 state sections must remain identical; all new scalar/default/identity/timestamp values are checked before commit. The commit receipt and created records are saved before fresh read-only verification.

USER runs once:

```powershell
node .\data\enrichment\naia-staff-followup-20261111\apply-approved-staff-followup.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-staff-followup-20261111\apply-approved-staff-followup.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected `FRESH_READ_ONLY_NAIA_STAFF_FOLLOWUP_VERIFICATION_PASSED`, 26 new coaches/seven heads, zero differences, global5,042coaches/22,327players/569snapshots. After an interrupted/failed attempt, inspect saved receipts/current state before any retry. After success prepare a pinned read-only closeout; do not rerun completed imports. No assistant database/env access.
Approved apply offline preflight PASSED: 25 negative preservation checks, two parameterized lock checks, seven College/Program locks, all 16 state sections and no database access.

## Import succeeded; read-only closeout

USER receipt approved-staff-followup-2026-11-11T21-21-48-342Z-c1099c68 passed fresh verification21:22:02.196Z:26coaches/sevenheads/zero differences,global5042coaches22327players569snapshots. Do not reapply.

```powershell
node .\data\enrichment\naia-staff-followup-20261111\audit-staff-followup-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-staff-followup-20261111\audit-staff-followup-closeout.cjs
```

Expected READ_ONLY_NAIA_STAFF_FOLLOWUP_CLOSEOUT_PASSED with zero changed/missing records,119matchedprogramswithheads/55withcurrent2027rosters. The pinned audit checks saved approval/commit/createdrows/defaults, all16beforeaftersections andfreshreadonlystate;exportsnextbaseline/holds/createdIDs. NAIA remains incomplete,68head/staffholds and132currentrosterholds.
Closeout offline preflight PASSED at 2026-11-11T21:25:22.279Z: 23 negative preservation checks, all 16 state sections, exact created-record/receipt chain, no database access.
