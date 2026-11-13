# Held-record reference review — 2026-11-11

Source: held-reference-audit-2026-11-11T15-16-33-757Z-d02ea599/report.json. Live transaction read-only; zero writes; approved baseline matched all 16 sections.

The only populated audited inbound reference for each of oakland-city, providence-christian, st-andrews, trinity-christian, lourdes, siena-heights and middle-georgia-state is its own CollegeBaseballProgram (one row). All other audited paths have zero rows, including user links, saved schools, recruiting records, invites, claims/verification submissions, academic profiles and baseball dependencies. This does not cover JSON, text or external references, nor does it establish absence of ownership metadata stored directly on the parent records.

Canonical middle-georgia has its own program, 3 coaches, 43 roster players and 1 roster snapshot. Preserve these records and IDs. Do not reclassify the stale duplicate as a second D2 program.

Disposition remains on hold. No delete, merge, verification-status update or division update is proposed or approved. A dependency count is not institution-closure evidence. Oakland City suspension and St Andrews direct-source evidence retain their documented limitations. Parent College and CollegeBaseballProgram models have no explicit inactive/archive field; NEEDS_REVIEW is a verification status, not a lifecycle status. Removing a division would not reliably retire a campus from general search.

Keep these seven exceptions separate from active-program enrichment. Stored NAIA count 194 remains an unreconciled database count, not a verified national baseball total. Remaining inventory research includes four other-member source holds (Fisk, Life Pacific, Montana State–Northern, Paul Quinn), source holds within the existing cohort, and two baseball-homepage access holds (OPSU and USAO). No repeat import is needed.
