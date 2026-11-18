# Official NJCAA 2026–27 browser directory capture

Captured the public baseball team directories through the normal Edge browser on November 18, 2026. All published pagination pages were captured: D1 191 entries / 10 pages; D2 189 entries / 10 pages; D3 119 entries / 6 pages.

Official URLs:
- https://www.njcaa.org/sports/teams?sport=bsb&season=2026-27&division=div1
- https://www.njcaa.org/sports/teams?sport=bsb&season=2026-27&division=div2
- https://www.njcaa.org/sports/teams?sport=bsb&season=2026-27&division=div3

The 499 displayed entries resolve to 397 official team IDs. Fifty-one IDs appear under all three filters. Neither 499 nor 397 is asserted to be the verified national baseball inventory. Query-string division is not independent proof of a team's division.

`reconcile-official.cjs` validates all 26 page captures and their pinned hashes against `manifest.json`, checks pagination and row counts, and compares with the latest closed read-only baseline. It uses no database or network access. Run `node .\data\enrichment\njcaa-official-browser-20261118\reconcile-official.cjs` from the repository root to regenerate the review outputs.

Initial comparison: 353 normalized exact-name matches; 35 one-to-one alias leads requiring campus review; one Dallas umbrella/campus hold; eight unmatched official entries; 15 stored programs without a unique match; five single-filter division discrepancies. These queues can overlap. No closures, corrections, additions, deletions, merges, or verification promotions are approved by this analysis.

The separate institutional membership directory displayed 505 loaded institutions. Its native accessibility text was truncated at 20,000 characters. Despite the filename `membership-directory-complete.json`, that file is not a complete saved member-name list. Read `membership-capture-limitations.json`; `membership-athletics-links.json` contains no extracted links. Institutional membership alone does not establish baseball sponsorship.

All database records remain unchanged. NJCAA inventory verification and enrichment remain incomplete. No backup, Git commit, or push for this new review has yet been performed.
