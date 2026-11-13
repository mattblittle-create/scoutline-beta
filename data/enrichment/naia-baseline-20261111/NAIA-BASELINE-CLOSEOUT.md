# NAIA baseline closeout — November 11, 2026

The user-run live database audit passed at 14:01:28 UTC (9:01 a.m. Eastern) with zero writes and PostgreSQL READ ONLY confirmed. The assistant subsequently inspected only saved files and public sources. No database correction, enrichment import, deployment, commit or push occurred.

| Stored coverage | Result |
| --- | ---: |
| NAIA programs | 180 |
| Active/inactive coaches | 0 / 0 |
| Roster players / snapshots, all seasons | 0 / 0 |
| Roster needs / metric averages / portal / outcomes | 0 in every table |
| Baseball / roster / schedule URL fields | 180 / 176 / 176 |
| Questionnaire / camps / contact URL / contact email | 0 in every field |
| Logo / X / Instagram | 0 in every field |
| Academic-area entries | 23 |
| Structured academic / admissions / financial / campus / NIL profiles | 0 in every model |

Populated links are not evidence of correct campus, season, availability or current membership. The old local CSV has 180 rows, 178 unique slugs, duplicate Bethel and Concordia campus rows, historical 2024–25 stats URLs, template scholarship text and default booleans. Preserve Embry-Riddle Prescott/Daytona separation.

## Official-reference reconciliation

The NAIA-linked 2026–27 member PDF has 233 institutions across all sports and is dated September 17, 2026. The linked interactive map contains 235 entries. The PDF was downloaded and parsed; all 233 rows reconstructed exactly from its saved reading-order text. Its count is not the national baseball count.

- 172 stored NAIA records join to the member list by normalized name plus state, using explicit review aliases where needed. These joins do not independently verify current baseball campus identity.
- Eight stored records have separate dispositions: Oakland City suspension evidence; Providence Christian, St. Andrews, Trinity Christian, Lourdes and Siena Heights closure evidence; Middle Georgia State and Shawnee State provisional NCAA D2 transition evidence.
- St. Andrews remains an evidence hold: official indexed text was available, but the direct capture failed. Oakland City evidence is from a receiving public college, not a captured OCU primary statement. Neither is a deletion proposal.
- Middle Georgia State's current institution page reports advancement to provisional year two. Shawnee State's current NCAA 2026–27 directory reports provisional year one and baseball. Do not promote either to full NCAA membership automatically.
- 61 additional member institutions lack a name/state join to the stored NAIA cohort. These include schools without baseball; the count is not 61 missing baseball programs. Bethel Indiana needs a separate campus disposition. Concordia Ann Arbor's official statement discontinues athletics after 2024–25, so the old Michigan CSV row does not authorize creating a current baseball program.

## Public-source review

One public GET pass followed links published in the map across all 235 entries. It captured 97 explicit baseball homepages, 72 of whose body texts mention 2027; these are research counts, not verified current baseball programs. No guessed sport paths, access-control bypasses, form submissions or retries were used. Home responses included 167 HTTP 200, 39 HTTP 202, six 403, twelve 404, one 520, seven failed requests and three entries without usable links. HTTP 202 and all failed/denied responses remain held.

Four demonstrably misdirected map links are explicitly held: York Nebraska to York Canada, Loyola New Orleans to Loyola Maryland, Holy Cross Indiana to Holy Cross Massachusetts, and Indiana South Bend to Indiana Southeast. Other map entries also require campus checks. Do not import a destination just because it is published on the association map.

## Saved artifacts and next stage

`baseline-closeout/` contains the report, 180 stored-record dispositions, 61-member review queue, four link hazards, public-source summary, and 352-file input SHA256 manifest. Full manifest rehash passed. `official-inventory-sources/` and `official-school-baseball-review/` retain raw evidence and research decisions. The live directory retains the fresh full snapshot and coverage/default/mirror/URL reports.

Next: verify campus identities and current baseball sponsorship, resolve exceptional existing records and missing programs, then prepare an explicit reviewed correction preview. Do not rerun frozen collectors, mutate existing records, delete closed schools, overwrite nonblank fields or classify a default as verified. X and Instagram only; prefer X. The baseline audit is complete; national baseball inventory verification and NAIA enrichment remain incomplete. No user command or import approval is pending for this closeout.
