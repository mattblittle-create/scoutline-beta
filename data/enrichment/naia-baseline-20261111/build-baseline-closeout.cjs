'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), crypto = require('crypto');
const root = __dirname;
const read = file => JSON.parse(fs.readFileSync(path.join(root, file)));
const live = 'live-audit-2026-11-11T14-01-28-197Z-5a38848d/';
const snapshot = read(live + 'fresh-read-only-snapshot.json'), baseline = read(live + 'report.json');
assert.equal(baseline.mode, 'READ_ONLY_NAIA_BASELINE_CAPTURED'); assert.equal(baseline.databaseWrites, 0); assert.equal(baseline.transactionReadOnly, 'on');
const members = read('official-inventory-sources/member-institutions-2026-27.json');
const map = read('official-inventory-sources/school-map-institutions.json');
const research = read('official-school-baseball-review/research-decisions.json');
assert.equal(members.length, 233); assert.equal(map.length, 235); assert.equal(research.length, 235);
assert.equal(new Set(research.map(r => r.mapId)).size, 235);
const normal = s => s.toLowerCase().replace(/\bst\.?\b/g, 'saint').replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !['university', 'college', 'the', 'of', 'at'].includes(w)).sort().join(' ');
const state = s => { const key = (s || '').toUpperCase().replace(/\./g, ''); return ({ NEB: 'NE', MICH: 'MI', TENN: 'TN', ARK: 'AR', CALIF: 'CA', FLA: 'FL', IND: 'IN', KAN: 'KS', ALA: 'AL', IDAHO: 'ID', MISS: 'MS' })[key] || key; };
// These are explicit review joins only: no database values, names or slugs change.
const aliases = {
  'embry-riddle': 'Embry-Riddle Aeronautical University', 'abraham-baldwin': 'Abraham Baldwin Agricultural College',
  'brewton-parker': 'Brewton-Parker Christian University', 'calumet': 'Calumet College of St. Joseph',
  'ciu': 'Columbia International University', 'harris-stowe': 'Harris-Stowe State University',
  'iu-columbus': 'Indiana University Columbus', 'lsu-alexandria': 'Louisiana State University Alexandria',
  'lsu-shreveport': 'Louisiana State University Shreveport', 'wvu-tech': 'West Virginia University Tech.',
  'houston-victoria': 'Texas A&M University - Victoria', 'iu-kokomo': 'Indiana University Kokomo',
  'lawrence-tech': 'Lawrence Technological University', 'oregon-tech': 'Oregon Institute of Technology',
  'ouaz': 'Ottawa University Arizona', 'uhsp': 'Health Sciences & Pharmacy, University'
};
const exceptions = {
  'oakland-city': { disposition: 'HELD_SUSPENDED_UNDERGRADUATE_OPERATIONS_2026_27', source: 'official-inventory-sources/exception-evidence/oakland-city.html', evidenceScope: 'Receiving public college reports the suspension; primary OCU statement not captured. Not a permanent-closure classification.' },
  'providence-christian': { disposition: 'REVIEW_CLOSED_IN_2026', source: 'official-inventory-sources/exception-evidence/providence.html', evidenceScope: 'California regulator reports June 30 closure and May 15, 2026 last instruction.' },
  'st-andrews': { disposition: 'HELD_CLOSURE_OFFICIAL_INDEXED_TEXT_ONLY', sourceUrl: 'https://www.sa.edu/about/', evidenceScope: 'Official page indexed text reports May 5, 2025 cessation. Direct request failed; no raw page capture. Keep evidence hold.' },
  'trinity-christian': { disposition: 'REVIEW_CLOSED_AFTER_2025_26', source: 'official-inventory-sources/exception-evidence/trinity.html', evidenceScope: 'Institution homepage announces cessation after the 2025–26 academic year.' },
  'lourdes': { disposition: 'REVIEW_CLOSURE_2026', source: 'official-inventory-sources/exception-evidence/lourdes.html', evidenceScope: 'Institution closure page contains February 2026 announcement and subsequent wind-down updates.' },
  'siena-heights': { disposition: 'REVIEW_CLOSED_IN_2026', source: 'official-inventory-sources/exception-evidence/siena.html', evidenceScope: 'Current institution page explicitly states the university is now closed.' },
  'middle-georgia-state': { disposition: 'REVIEW_NCAA_D2_PROVISIONAL_YEAR_2', source: 'official-inventory-sources/exception-evidence/middle-georgia.html', evidenceScope: 'Institution transition page reports July 2026 advancement to provisional year two; no automatic promotion to full membership.' },
  'shawnee-state': { disposition: 'REVIEW_NCAA_D2_PROVISIONAL_YEAR_1', source: 'official-inventory-sources/exception-evidence/shawnee-ncaa-directory.html', sourceUrl: 'https://web3.ncaa.org/directory/orgDetail?id=30284', evidenceScope: 'Current NCAA 2026–27 directory lists provisional Division II and baseball. Earlier university URL returned 404 and was not used as proof.' }
};
const identity = c => ({ collegeId: c.id, programId: c.baseballProgram?.id, slug: c.slug, name: c.name, city: c.city, state: c.state, programDivision: c.baseballProgram?.division });
const db = snapshot.schools.filter(c => c.baseballProgram?.division === 'NAIA');
const dispositions = db.map(c => {
  const matchName = aliases[c.slug] || c.name;
  const matched = members.filter(m => normal(m.name) === normal(matchName) && m.state === state(c.state));
  assert(matched.length <= 1, 'Ambiguous member join: ' + c.slug);
  if (matched.length) return { ...identity(c), disposition: 'MEMBER_NAME_STATE_JOIN_BASEBALL_CAMPUS_REVIEW_PENDING', member: matched[0], joinUsesExplicitAlias: !!aliases[c.slug], independentlyVerifiedBaseballIdentity: false };
  assert(exceptions[c.slug], 'Unreviewed unmatched NAIA record: ' + c.slug);
  return { ...identity(c), ...exceptions[c.slug], databaseChangeApproval: 'NOT_GRANTED' };
});
assert.equal(dispositions.filter(r => r.member).length, 172);
assert.equal(dispositions.filter(r => !r.member).length, 8);
const joinedMembers = new Set(dispositions.filter(r => r.member).map(r => r.member.name + '|' + r.member.state));
const memberReviewQueue = members.filter(m => !joinedMembers.has(m.name + '|' + m.state)).map(m => ({ ...m, disposition: 'MEMBER_NOT_JOINED_TO_STORED_NAIA_COHORT_BASEBALL_SPONSORSHIP_UNESTABLISHED', exactNormalizedNameMatchesInDatabase: snapshot.schools.filter(c => normal(c.name) === normal(m.name) && state(c.state) === m.state).map(identity), mustNotAssumeMissingBaseballProgram: true }));
assert.equal(memberReviewQueue.length, 61);
const linkHazards = [
  { mapId: 10769, school: 'York University, Nebraska', returnedHost: 'yorkulions.ca', issue: 'Map link leads to York University in Canada; cannot establish Nebraska program.' },
  { mapId: 10805, school: 'Loyola University New Orleans', returnedHost: 'loyolagreyhounds.com', issue: 'Map link leads to Loyola Maryland; cannot establish Louisiana program.' },
  { mapId: 10692, school: 'Holy Cross College, Indiana', returnedHost: 'www.holycross.edu', issue: 'Map link leads to College of the Holy Cross, Massachusetts; cannot establish Indiana program.' },
  { mapId: 10694, school: 'Indiana University South Bend', returnedHost: 'southeast.iu.edu', issue: 'Map link redirects to Indiana University Southeast; do not merge the campuses.' }
];
for (const hazard of linkHazards) { const r = research.find(r => r.mapId === hazard.mapId); assert.equal(new URL(r.home.finalUrl).hostname, hazard.returnedHost); }
const publicSourceSummary = { schoolsOnMap: 235, homeHttpStatuses: research.reduce((out, r) => { const key = String(r.home?.status || 'NO_LINK'); out[key] = (out[key] || 0) + 1; return out; }, {}), capturedBaseballPages: research.filter(r => r.baseball?.status === 200).length, baseballPageBodiesMentioning2027: research.filter(r => r.baseball?.status === 200 && r.mentions2027).length, http202ResponsesRequireReview: true, linkHazards: linkHazards.length, nationalBaseballInventoryVerified: false, sourcePassIsNotCompletedSchoolIdentityVerification: true };
const report = { checkedAtUtc: new Date().toISOString(), mode: 'READ_ONLY_NAIA_BASELINE_RECONCILED_WITH_OFFICIAL_MEMBER_REFERENCE', databaseWrites: 0, assistantDatabaseAccess: false, liveBaselineSource: live + 'report.json', liveBaselineCheckedAtUtc: baseline.checkedAtUtc, storedNAIAPrograms: 180, currentMemberReferenceYear: '2026-2027', currentMemberReferenceLastModified: '2026-09-17', allSportMemberReferenceRows: 233, storedProgramsWithMemberNameStateReviewJoin: 172, storedProgramsWithExceptionDispositions: 8, otherMemberInstitutionsRequiringBaseballReview: 61, nationalBaseballInventoryVerified: false, baselineAuditComplete: true, naiaEnrichmentComplete: false, importApproval: 'NOT_GRANTED', publicSourceSummary, nextStage: 'Verify campus identity and current baseball sponsorship before preparing explicit reviewed corrections. Hold closures, suspensions, missing campuses, current-year transitions and misdirected links separately. No record deletion or reclassification is authorized.' };
const out = path.join(root, 'baseline-closeout'); fs.mkdirSync(out, { recursive: true });
const files = { 'report.json': report, 'stored-naia-member-reconciliation.json': dispositions, 'other-member-baseball-review-queue.json': memberReviewQueue, 'official-map-link-hazards.json': linkHazards, 'public-source-summary.json': publicSourceSummary };
for (const [file, value] of Object.entries(files)) fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const inputPaths = [live + 'report.json', live + 'fresh-read-only-snapshot.json', 'manifest.json', 'audit-naia-baseline.cjs', 'capture-official-inventory.cjs', 'review-school-map-baseball.cjs', 'build-baseline-closeout.cjs'];
for (const directory of ['official-inventory-sources', 'official-school-baseball-review']) {
  const walk = relative => { for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) { const file = relative + '/' + entry.name; if (entry.isDirectory()) walk(file); else inputPaths.push(file); } }; walk(directory);
}
const hashes = Object.fromEntries(inputPaths.sort().map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
fs.writeFileSync(path.join(out, 'evidence-manifest.json'), JSON.stringify({ createdAtUtc: new Date().toISOString(), files: inputPaths.length, hashes }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
