# NAIA core recovery review — November 11, 2026

The USER-run camp closeout `camp-closeout-audit-2026-11-11T19-35-17-369Z-2a5e7cce` passed with zero drift. Its saved snapshot independently matched the committed verification snapshot byte for byte. This is the new baseline. Do not reapply completed imports.

New proposal: **85 coaches, including 23 head flags across 23 previously empty staff programs; 96 players and two snapshots for explicitly current 2027 rosters**. No existing fields or records change. Candidate SHA256: `71a02de5fe4342cfbf62f3b89c174ce268b32886d0b665274ab9fdac5c35fc9d`. Approval NOT_GRANTED.

Reviewed 136 campuses with a staff or roster hold. Literal official-page links yielded 39 new destinations, all captured HTTP 200. Only 23 staff directories with explicit Baseball department table boundaries support the coach proposal. Mixed JV/developmental roles are held; assistant/associate head roles do not receive head flags. Pipe-separated titles are treated as separate roles, so Montreat's explicit Head Baseball Coach title is recognized. Literal published email halves are joined without executing scripts. Source titles/names remain published text, including alumni-year suffixes. Canonical current directories are evidence of their published staff, not independent confirmation of every future-season appointment.

College of Idaho's explicitly 2027 roster supports 58 players; Johnson Tennessee's 2026–27 roster supports 38. Strict existing season parsing applies. Unresolved physical/position/class labels remain null rather than inferred; Johnson snapshot aggregates remain null where those facts are unresolved. Other roster attempts remain held (empty/unresolved, non-roster destination or season not established). No roster season rollover.

Every accepted record is reconstructed from raw captured sources and an exact published link chain. Blank existing NAIA staff/roster program data is required for these additions. All 16 state sections must match the latest baseline. Existing 4,931 coaches, 22,231 players, 567 snapshots and all claims/ownership/verification metadata are preserved. New records remain unverified; no deletions, merges, YouTube work or verification promotion.

USER runs:

```powershell
node .\data\enrichment\naia-core-recovery-20261111\preview-core-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-core-recovery-20261111\preview-core-recovery.cjs
if ($LASTEXITCODE -ne 0) { throw 'Preview failed; inspect the report.' }
```

Read-only only; no apply script exists. After the live preview passes, obtain approval of this exact new scope before preparing a guarded import. Prior field-batch approvals do not cover these additions. Freeze source/candidate/parser/build files after preview.

If approved and imported, head/staff holds would decrease from 98 to 75 and current roster holds from 134 to 132 among 187 member-matched programs. NAIA remains incomplete, and stored 194 is not a verified national baseball total. Membership/sport-list evidence, seven stale/duplicate stored exceptions and secondary coverage gaps remain held.

Offline preflight PASSED at 2026-11-11T19:41:46.562Z: 24 negative preservation/scope checks, all 16 state sections, complete prior source/receipt chain, no database access.

## Exact batch approved; guarded apply

USER live preview `read-only-preview-2026-11-11T19-48-26-920Z-1ddcb30c` passed and its saved candidate and full baseline snapshot were independently checked offline. Reviewed-plan SHA256: `1a93ad0a0ec9d373a558950d7c052fc574b4d12d5604b4712c1172d22b5ffeca`. The user explicitly replied “Approve” for this exact batch. `approval.json` records authorization; historical candidate/preview approval labels remain unchanged.

The apply validates frozen evidence and the complete prior receipt chain, reads and compares a fresh read-only baseline, locks all affected Colleges and Programs, then uses a Serializable transaction to create only the approved rows. There are no update/delete/upsert paths and no automatic retries. All existing school/program fields, timestamps, coach/player/snapshot rows and dependency/profile models must remain identical. Every new scalar, default, source identity and generated timestamp is checked before commit. The commit receipt and created records are saved before fresh read-only verification.

USER runs once:

```powershell
node .\data\enrichment\naia-core-recovery-20261111\apply-approved-core-recovery.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-core-recovery-20261111\apply-approved-core-recovery.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

Expected `FRESH_READ_ONLY_NAIA_CORE_RECOVERY_VERIFICATION_PASSED`, zero differences, global totals 5,016 coaches, 22,327 players and 569 snapshots. After an interrupted/failed attempt, inspect receipts and current state before any retry. After success, prepare a pinned read-only closeout; do not rerun completed imports. No assistant database/env access.
Approved apply offline preflight PASSED: 29 negative preservation checks, two parameterized lock checks, 24 College/Program locks, all 16 state sections and no database access.

## Import succeeded; read-only closeout

USER receipt approved-core-recovery-2026-11-11T20-06-13-491Z-176b0e12 passed fresh verification20:06:32.461Z:85coaches/23heads/96players/2snapshots,zero differences;global5016coaches22327players569snapshots. Do not reapply.

```powershell
node .\data\enrichment\naia-core-recovery-20261111\audit-core-recovery-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-core-recovery-20261111\audit-core-recovery-closeout.cjs
```

The pinned read-only audit verifies approved plan, commit, exact created rows/defaults and all 16 before/after state sections, then compares fresh state against the saved post-import snapshot. Expected READ_ONLY_NAIA_CORE_RECOVERY_CLOSEOUT_PASSED with zero changed/missing records,112matchedprogramswithhead/55with2027roster. Exports next baseline, remaining holds and verified created IDs. NAIA remains incomplete.
Closeout offline preflight PASSED at 2026-11-11T20:10:31.299Z: 23 negative preservation checks, all 16 sections, exact receipt/created-record chain, no database access.
