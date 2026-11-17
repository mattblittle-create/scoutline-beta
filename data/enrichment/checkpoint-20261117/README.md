# November 17 D3 checkpoint and NJCAA handoff

D3's current review pass is closed with documented holds. Both approved imports passed database closeout, and public production verification matched 379 programs, 3,790 program fields, 379 questionnaire mirrors and six new 2027 rosters. Full D3 enrichment is not complete. NJCAA baseline scripts are prepared but have not been run.

The commit contains scripts, candidates, manifests, plans, receipts, reports and handoff notes. Raw captured sources, per-page discovery reviews, discovered-links.json and full database snapshots are archive-only. Frozen manifests intentionally reference archive-only inputs; a fresh checkout alone cannot replay all audits.

Keep the new two-folder backup, the November 12 NAIA backup, and the original Data Enrichment pt 3 historical D3 folder. Existing scripts reference those older inputs and original paths. To restore, inspect archives before extraction, restore the required source/snapshot files to their original relative paths without overwriting newer tracked scripts, and verify manifest hashes. The backup is a file archive, not a database restore dump.

Run backup-nov17.ps1 first, then prepare-stage-plan.ps1. The latter creates a path list without staging anything. After explicit path-list staging, verify-stage-bytes.ps1 checks exact file selection and raw bytes against the Git index. Do not use Stage All, git add ., or broad renormalization. There is no deployment or database action in this checkpoint.
