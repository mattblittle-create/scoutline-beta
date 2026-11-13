# NAIA baseline — November 11, 2026

Prepared from the Data Enrichment pt 3 checkpoint. The D3 final audit and public production verification passed November 5. D3 publication/evidence holds remain; no prior imports need reapplying. The user selected NAIA baseline as the next task.

## Run in Windows PowerShell

```powershell
Set-Location 'C:\Users\mattb\scoutline-beta'
node .\data\enrichment\naia-baseline-20261111\audit-naia-baseline.cjs --preflight
if ($LASTEXITCODE -ne 0) { throw 'NAIA offline preflight failed; stop here.' }
node .\data\enrichment\naia-baseline-20261111\audit-naia-baseline.cjs
if ($LASTEXITCODE -ne 0) { throw 'NAIA read-only audit stopped; inspect before continuing.' }
```

Share the printed summary and REPORT_PATH. Credentials stay local. Do not share the full snapshot publicly.

The live mode reads all College/program rows, seven program-dependent tables, and eight academic/admissions/financial/campus/NIL tables in one RepeatableRead transaction after setting and confirming PostgreSQL READ ONLY. It saves a new local report directory and full baseline snapshot. It has no apply mode. It does not fetch websites, submit forms, synchronize mirrors, or change records. Only X/Instagram are collection targets; X is preferred.

## Offline work completed

- Syntax and 14 offline assertions passed without loading environment files or connecting to a database.
- Input hashes pin the historical local inventory and current schema. Historical snapshot hash is separately pinned.
- `historical-analysis-20261105/` analyzes the saved November 5 snapshot, not the current database. Eight school-profile tables were not in that snapshot; reports mark them not captured rather than empty.
- Historical local CSV: 180 rows, 178 unique slugs, two duplicate slug groups (Bethel IN/TN and Concordia MI/NE). Every reference baseball URL uses the 2024–25 NAIA stats path. Repeated scholarship language, booleans and tuition year are templates, not school-level evidence.
- Saved November 5 database: 180 NAIA programs; no NAIA coaches, roster players/snapshots, roster needs, metric averages, portal activities or outcomes. Core URL presence: baseball 180, roster 176, schedule 176; all audited secondary fields zero.
- Four reference rows lack exact slug matches, one reference row matches a different division, and seven stored NAIA schools fall outside reference slugs. These are reconciliation flags, not proposed additions/deletions. Exact slug matches also need campus review.
- Stored Bethel is TN and Concordia is NEB.; the additional IN/MI CSV rows must not silently map to those records. Embry-Riddle Prescott AZ remains separate from Daytona Beach FL (D2).

## Live audit and baseline closeout completed

User-run read-only audit passed at `live-audit-2026-11-11T14-01-28-197Z-5a38848d/report.json`. Current counts match the historical program/dependency counts. It additionally captured 23 NAIA academic-area rows and zero NAIA structured academic/admissions/financial/campus/NIL profile rows. These are database presence counts, not verification of academic facts.

See `NAIA-BASELINE-CLOSEOUT.md` and `baseline-closeout/report.json`. Do not rerun the baseline or frozen source collectors merely to resume work. Evidence manifest rehash passed for 352 inputs; all 233 membership rows reconstructed exactly from saved PDF text.

## Next checkpoint

Baseline complete; next stage is current baseball inventory and campus verification. Resolve the eight existing-record exceptions, the missing Bethel Indiana identity, 61 other all-sport member institutions requiring baseball review, and misdirected map links before preparing any candidates. The official 2026–27 all-sport membership PDF has 233 rows, last modified September 17, 2026; this is not a baseball total. The linked map has 235 entries and is an imperfect discovery input. No current national baseball program count has been established. No database writes or import approvals are requested by this baseline.

Field presence, verification markers, schema defaults (including false and UNKNOWN), mirror differences and historical URLs are reported separately from independent verification. Historical analysis produces 1,050 URL issue entries (a URL may have multiple issue types) and 183 mirror differences; those counts are not counts of schools or automatic fixes.
