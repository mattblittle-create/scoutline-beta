# NJCAA inventory exception review

Offline source review, November 18, 2026. No database changes.

All 28 exceptions from the complete paginated directory comparison have an individual disposition: five division conflicts, eight unmatched official entries, and 15 unmatched stored programs. A disposition can remain an evidence hold. The 51 cross-filter team IDs remain an explicit unresolved division queue; no claim is made that all national membership decisions are resolved.

Five correction drafts are isolated for later review: Harper DIII to DII, Hocking DII to DIII, Tonkawa WA to OK, Southwest Virginia IA to VA, and Minnesota North Itasca CA to MN. These are not an approved executable import plan. Harper's current catalog content was available through indexed results, but direct retrieval returned a JavaScript verification page. Capture that live document before preparing the write preview.

Key status findings:
- Southwest Virginia officially announced the end of athletics after 2025-26. Preserve institution and historical records; review program status without deletion.
- Lackawanna identifies 2025-26 as its final NJCAA season and continues baseball during its NCAA/PSAC transition. Do not label it a closed college or automatically promote it to active NCAA membership.
- Monroe New Rochelle expressly says it is pursuing NCAA membership and is not currently an NCAA member. Keep the transition separate from Bronx campus identity.
- Five Dallas and three Minnesota North unmatched stored campus programs have independent institutional baseball support. Preserve the campus distinctions.
- Carteret, Northeast Iowa, and Quincy have independent NJCAA/baseball support for addition review. Their creation still requires full institution/campus/division checks.
- Southwestern Oregon's official baseball biography identifies NWAC. Do not add it as NJCAA baseball because a general directory also lists it.
- Berkshire explicitly paused baseball in a 2026 update. Permanent closure and spring 2027 status are not established.

Files `*-open.json`, `*-search.json`, and research observation JSON contain web-tool observations, which can include indexed text, retrieval errors, and unrelated search results. `source-observations.json` distinguishes their supported scope. They are not original downloaded HTML or guaranteed live-page availability evidence.

`build-exception-review.cjs` regenerates the offline review and verifies the original page-capture hash chain. `preview-inventory-review.cjs --preflight` checks the pinned review inputs and exercises rejection of drift in all 16 baseline sections. Running it without flags reads the database in a read-only transaction and confirms the full baseline remains unchanged. It never imports a correction.

Next: run the read-only baseline check, finish the outstanding current-season identity/division evidence, then prepare one consolidated write preview. Keep additions, transitions, status changes, and field corrections explicit. Preserve access holds separately from genuine publication gaps. Today’s backup and Git checkpoint remain pending.
