# Next NAIA proposal: seven blank camp URLs

USER questionnaire closeout `questionnaire-closeout-audit-2026-11-11T18-23-32-721Z-d1386d07` passed with zero drift across all 16 sections. Its saved full snapshot exactly matches the committed post-import verification snapshot and is the new baseline. All previous imports are complete; do not reapply them.

Candidate SHA256: `f29f3bb2a24c777d602e5e0ef4a7b23c8e4a22c56f463c9b02507f893a7de41d`. **Seven null-only Program.campsUrl fills**, no College mirrors or other changes. Approval NOT_GRANTED for this separate batch.

| Program | Published evidence |
| --- | --- |
| Andrew College | Baseball development camp December 5, 2026 |
| Johnson University | Baseball winter skills/prospect camp January 16, 2027; information page, not checkout |
| Mount Marty | Baseball academy session January 10–31, 2027 |
| Aquinas | Dedicated baseball camp hub explicitly says no upcoming events |
| Cumberland University | Dedicated baseball camp hub explicitly says no upcoming events |
| Marian University, Indianapolis | Dedicated baseball camp hub explicitly says no upcoming events |
| Southeastern University | Dedicated baseball camp page explicitly says no active sessions |

Registration availability, payment and submission/delivery have not been tested. The four empty hubs provide official camp information without implying an open registration. Source link relationships, campus/program IDs, raw capture hashes, explicit future date strings or no-event statements are reconstructed offline by `build-camp-review.cjs`. No dates inferred from graduating class years. Older-only events, generic athletics hubs, roster/coach names containing Camp, blocked pages and Arizona Christian's conflicting template coach content remain held. No new public requests were needed for this batch.

USER runs:

```powershell
node .\data\enrichment\naia-secondary-followup-20261111\preview-camps.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-secondary-followup-20261111\preview-camps.cjs
if ($LASTEXITCODE -ne 0) { throw 'Preview failed; inspect the report.' }
```

Read-only preview only; no apply mode exists. All 16 state sections must match the new baseline. Expected seven proposed Program URL fills, zero writes, unchanged 4,931 coaches, 22,231 players and 567 snapshots. The proposal would raise populated NAIA camp URLs from 7 to 14, including the four explicitly empty hubs. After live preview passes, seek approval of this exact new scope before preparing a guarded import. Previous approvals do not cover this batch. Preserve frozen source/candidate/build files after preview.

NAIA remains incomplete: 98 matched head/staff holds, 134 current 2027 roster holds, 37 logo holds, seven stale/duplicate stored exceptions and current sport-list evidence holds remain. Stored 194 is not a verified national baseball total. No YouTube, ownership or verification changes.
Offline camp preflight PASSED at 2026-11-11T18:27:30.176Z with 22 negative preservation/scope checks and no database access.

## Exact camp plan approved; guarded import

USER live preview `read-only-camp-preview-2026-11-11T19-03-46-473Z-d3419308` passed. Its saved candidate matched the frozen candidate and its full snapshot bytes matched the questionnaire closeout baseline. Reviewed-plan SHA256: `3d2f1ea58859184f59bc05adf56ff431a6a630df9212202bf1ede90ca44cf1d7`. The user explicitly replied “Approve” to this exact seven-URL plan. `camp-approval.json` records authorization; historical candidate/preview approval labels remain unchanged.

The guarded import checks frozen evidence, the complete prior receipt chain and a fresh read-only baseline. A Serializable transaction locks seven Colleges and seven Programs, rechecks all 16 state sections, executes one parameterized null-only NAIA camp URL update, and verifies all other data before commit. Only those seven camp URLs and their Program updatedAt timestamps may change. The commit receipt is saved before fresh read-only verification. No automatic retry, create, upsert, delete or merge path exists.

USER runs once:

```powershell
node .\data\enrichment\naia-secondary-followup-20261111\apply-approved-camps.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-secondary-followup-20261111\apply-approved-camps.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected: `FRESH_READ_ONLY_NAIA_CAMPS_VERIFICATION_PASSED`, seven camp URL fills, 14 populated camp URLs, zero differences and unchanged global counts. After interruption/failure, inspect saved receipts and current state before any retry. After success, prepare a pinned read-only closeout; do not reapply completed imports. Four URLs are explicitly empty camp hubs, so no open-registration claim is made.
Approved apply offline preflight PASSED: 26 negative preservation checks, four SQL/scope checks, all 16 state sections, no database access.

## Import succeeded; read-only closeout

USER receipt approved-camps-2026-11-11T19-14-13-990Z-5981b402 passed fresh verification19:14:45.634Z:sevenfills/14campURLs/zero differences. Do not reapply.

```powershell
node .\data\enrichment\naia-secondary-followup-20261111\audit-camps-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-secondary-followup-20261111\audit-camps-closeout.cjs
```

Expected READ_ONLY_NAIA_CAMPS_CLOSEOUT_PASSED with zero changed/missing records. Pinned audit checks saved approval, commit, exact before/after changes and fresh read-only state across all 16 sections; exports next full baseline and holds. NAIA remains incomplete.
Closeout offline preflight PASSED at 2026-11-11T19:18:54.144Z: 22 negative preservation checks, all 16 state sections, no database access.
