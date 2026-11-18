# NJCAA expanded published navigation review

Baseline: recovery closeout November 18, 2026, 15:44 UTC. The core, secondary, and recovery imports are closed; never reapply them.

This public collection covers all 403 stored NJCAA programs in one run, follows up to six additional published navigation links per program with four workers, and reuses saved core evidence. It does not invent URLs, retry access-held hosts, load environment credentials, access the database, or approve imports. Newly reached sources require explicit campus and content review; existing source-campus decisions are context only, not national membership verification.

Run `node collect-expanded.cjs --preflight` followed by `node collect-expanded.cjs` on success. Existing captures support resumption without repeating requests. Assistant runtime validation has not been performed. Full source inputs are frozen in manifest.json. Remaining gaps: 361 head-coach programs, 384 current 2027 roster programs, 15 campus identity holds, and national inventory reconciliation. Missing data does not establish program closure.
Expanded collection USER passed 15:49 UTC:403 programs,605 attempted pages,112 programs with new readable pages. Next run analyze-expanded.cjs offline; all output proposals require campus/content review. Existing heads/current rosters skipped, Harper held, nonhistorical populated fields retained, exactly one explicit head required. Assistant runtime not executed.
