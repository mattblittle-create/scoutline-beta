# NAIA division-wide enrichment proposal — November 11, 2026

**Approved import committed and freshly verified at 2026-11-11T16:25:45.422Z. Do not rerun the import. The read-only closeout audit is ready. No assistant database access or writes occurred.**

The successful receipt is `approved-enrichment-2026-11-11T16-25-23-711Z-33e3ebdb`. Offline verification independently checked the exact approval/preview/commit chain, 19 batch counts, all created IDs/scalars/defaults, applied fields and saved full before/after state. All 814 fields, 368 coaches, 89 heads, 2,474 players and 53 snapshots match; zero differences. Global totals are 1,580 Colleges, 4,931 coaches, 22,231 players and 567 snapshots. Stored NAIA programs remain 194, not a verified national total.

## Run the read-only closeout audit

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-enrichment-review-20261111\audit-enrichment-closeout.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Closeout preflight failed; stop.' }
node .\data\enrichment\naia-enrichment-review-20261111\audit-enrichment-closeout.cjs
```

Offline closeout preflight passed 27 negative preservation checks with no database access. `closeout-manifest.json` pins 11 receipt/audit inputs. The live command uses an enforced read-only transaction, requires exact equality with the saved post-commit state across all 16 sections (including timestamps), and re-verifies the approved change set. It saves `report.json`, a new full baseline, `remaining-holds.json` and created-record IDs. Expected mode: `READ_ONLY_NAIA_ENRICHMENT_CLOSEOUT_PASSED`, with zero changed/missing records. No apply mode exists.

Post-import populated coverage: baseball URLs 192, roster URLs 185, schedule URLs 183, questionnaires 4, camps 7, contacts 89, general emails 0, logos 112, X 51, Instagram 59. These populated totals include historical/unverified values. Reviewed current evidence remains 116 official baseball homepages, 68 current schedules, 53 current rosters and 89 staff programs. Active NAIA coaches: 368; active head flags: 89. There are 98 member-matched head/staff holds and 134 member-matched current-roster holds, plus the seven separately held stale/duplicate records. Full NAIA enrichment and national inventory verification remain incomplete.

The user-run preview `read-only-preview-2026-11-11T16-14-32-905Z-a0198a52` passed. Reviewed plan SHA256: `94b32042b6f49afd91b6ee83a09de05b04b0d5b37a0fc825fe4524ac197e4489`. The user then replied **“Approve”** to the exact 814-field/368-coach/2,474-player/53-snapshot plan. `approval.json` records this authorization separately; the frozen proposal's historical `NOT_GRANTED` markers are intentionally unchanged.

## Completed approved import — historical commands; do not reapply

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-enrichment-review-20261111\apply-approved-enrichment.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-enrichment-review-20261111\apply-approved-enrichment.cjs --apply
if ($LASTEXITCODE -ne 0) { throw 'Inspect the report directory before retrying.' }
```

The apply script accepts only explicit `--preflight` or `--apply`; no default write mode exists. Offline preflight passed 35 negative preservation checks and five SQL/scope checks, without database access. Seven apply inputs are pinned separately in `apply-package-manifest.json`, including the exact approval, reviewed preview and shared state reader; the original 656 frozen inputs remain unchanged.

Apply first requires a fresh read-only match to the reviewed global baseline. One Serializable transaction (120-second timeout) then locks 129 affected College rows and 129 Program rows in stable order, rechecks the full baseline, performs 19 parameterized update batches for exactly 814 before/after field changes, and uses create-only inserts: coaches in chunks of 200, players in chunks of 250 and snapshots in one chunk. There is no `skipDuplicates`, upsert, deactivation or deletion. Only the normal `updatedAt` on actually updated parent rows may advance. All existing scalar fields/records, every new scalar/default/identity and all 16 state sections are checked before commit. Frozen hashes are rechecked before writing and before commit without repeating the expensive source reconstruction inside the transaction.

The committed receipt, created IDs/records and applied field list are saved before fresh read-only post-commit verification. Expected success mode: `FRESH_READ_ONLY_NAIA_ENRICHMENT_VERIFICATION_PASSED`, with zero remaining differences, 4,931 global coaches, 22,231 global players and 567 global snapshots. School/program counts stay 1,580/194 stored NAIA. Preserve the report directory and paste the result. If interrupted or any failure/disconnect is reported, inspect the receipts and current state before retrying; the script does not claim zero writes after an uncertain attempt or commit.

After the successful apply receipt, prepare the pinned read-only closeout audit. No further approval is needed for this exact approved import. NAIA's remaining evidence/coverage holds remain open.

The final candidate is `candidate.json`, SHA256 `e18b1804830fa27a85db58ff0d572fde2c2527ed83ec87a41ac1db124cade84f`. Its 656 input files and schema are pinned in `manifest.json`. Do not regenerate builders, collectors or frozen inputs after the live preview or approval. `candidate-draft.json`, `candidate-review.json` and `superseded-unapproved-r1/` are superseded research outputs, not import plans.

The review covers all 187 member-matched stored NAIA campuses together. Seven other stored NAIA records remain held as closure, suspension or duplicate exceptions. The stored count of 194 is not a verified national baseball total.

## Proposed changes

- 814 field changes: 585 program fields and 229 College fields/mirrors.
- 368 additive coaches across 89 programs, including 89 explicit head-coach flags.
- 2,474 published players from 53 explicitly current 2027 varsity rosters, with 53 additive snapshots.
- Program fields include 107 baseball-homepage corrections, 53 current roster URLs, 68 current schedule URLs, 89 official staff/contact pages, 112 logos, 51 X references, 59 Instagram references, four questionnaires, seven camps links, and supported recruiting-coordinator fields.
- Two program conference corrections: St. Ambrose to Heart of America; Jarvis Christian baseball to HBCUAC. St. Ambrose's blank College conference field receives the institution's explicitly announced affiliation. Jarvis's College conference is preserved because its all-sport listing differs from the baseball-specific conference source.

College changes include 116 program-website mirrors, 51 X mirrors, 57 Instagram mirrors, four questionnaire mirrors and the one St. Ambrose conference addition. Existing different/nonblank secondary values remain intact. Core URL replacements and the two conference corrections have explicit before/after rows for review.

No school/program creation, division changes, deletions, merges, staff deactivation, existing player/snapshot updates, verification promotion or YouTube enrichment is proposed. Preserve the prior two approved imports, all ownership/claim/verification metadata, all existing global coaches/players/snapshots, and all seven program dependency/eight school profile sections.

## Evidence and quality checks

`source-review.json` records the full 187-campus collection. `secondary-review.json` records official recruiting/camp destinations, program-social publications and header-logo references. `current-page-recovery.json` follows eight independently published alternative/current-season links, all HTTP 200. Prior access-denied/challenge responses remain held; no challenge bypass or guessed season rollover was used.

`dispositions.json` records each campus's supported fields, current-roster holds, staff exclusions and secondary holds. `inventory-overlay-final.json` is supplemental membership research; its five source/navigation holds are a historical intermediate count before final institution sources and the broader enrichment collection, not a new national total.

Current roster labels must explicitly identify 2027 or 2026–27. Older and nonvarsity sources do not become 2027 rosters. Empty/partial/unresolved current pages remain held. Snapshot size counts published roster entries; completeness of the entire future-season team is not independently guaranteed. Unknown classes, attributes and ambiguous totals remain null. Generic pitcher positions never infer handedness. Graceland's explicit class suffixes are separated from player names with normalization records; St. Francis Illinois's first/last-name columns are joined explicitly. Native/table roster counts are compared where both views exist.

Coaches come from current canonical baseball directories or explicit 2027 roster coaching sections. Explicit 2025–26/older seasonal staff lists remain held. A current canonical directory can retain a 2026 roster-year heading; that is not independent verification of a future 2027 staff. Published roles, including dual roles, remain exact. Associate, developmental, prospect-team, strength-only and JV head titles do not become varsity head-coach flags. Support-only roles and ambiguous student-assistant roles are excluded. Marian's duplicate published bio references are held as URLs while identical staff facts are retained once. Older-season bio URLs remain blank; no old biography facts are copied.

General athletics social accounts and malformed `@`/space profile paths remain held. Accepted program social references are explicitly published in baseball context; their account contents are not independently audited. All 112 proposed logo assets decoded, and four contact sheets were visually inspected. Bushnell uses its separately published primary B mark rather than its co-branded character-award graphic. Questionnaires require a native form/anonymous entry with baseball scope; JavaScript-only/unconfirmed forms remain held. Camp links are information resources supported by future dates or an explicit no-upcoming-events hub, not a claim that registration is open.

Offline source-parser audit passed 23 source/negative checks. Final preview preflight passed 24 preservation/scope checks plus four season/head-role checks, reconstructing the exact candidate and checking the prior approved baseline chain. Database access was false. No application source or schema changes, commit, push or deployment occurred.

## Completed live read-only preview — historical commands

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-enrichment-review-20261111\preview-enrichment.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'Preflight failed; stop.' }
node .\data\enrichment\naia-enrichment-review-20261111\preview-enrichment.cjs
if ($LASTEXITCODE -ne 0) { throw 'Preview failed; inspect the report before proceeding.' }
```

The no-argument preview uses PostgreSQL RepeatableRead with transaction read-only enforced. It compares all 16 global state sections against the approved follow-up closeout and saves the complete reviewed plan, summary and fresh snapshot. This step has passed and the exact resulting plan is now approved. Do not regenerate its frozen inputs or rerun prior completed imports.

After a passing live preview, obtain the exact plan approval, prepare the guarded atomic import against that saved preview, verify the committed result with a fresh read-only transaction, and then close out the full NAIA review with honest supported/held coverage. Expected additive global totals, if this exact proposal is approved and applied: 4,931 coaches, 22,231 players and 567 snapshots; 1,580 Colleges and 194 stored NAIA programs remain unchanged.

## Remaining work

The proposal does not make full NAIA enrichment or national baseball inventory verification complete. There are 98 member-matched campuses without proposed staff and 134 without an accepted 2027 roster. Many have older/unpublished rosters or denied/unreachable primary pages. The seven stale/duplicate records still need an approved lifecycle disposition. Life Pacific and Montana State–Northern retain current sport-list evidence limits. Institution/profile/intelligence defaults are not facts and are not promoted by this package.

After the import, continue supported fallbacks for the remaining program links/logos/socials/recruiting forms, including conference-published institutional marks and anonymous form frames where available. Current public source gaps should remain explicit, not be filled by guessed URLs, inferred people, fabricated roster seasons, or unsupported academic/financial/NIL facts.
