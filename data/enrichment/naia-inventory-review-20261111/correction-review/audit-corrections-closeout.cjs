'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), crypto = require('crypto');
const { createRequire } = require('module');
const repo = path.resolve(__dirname, '../../../..'), req = createRequire(path.join(repo, 'package.json'));
const apply = require('./apply-approved-corrections.cjs'), preview = require('./preview-corrections.cjs');
const RECEIPT = 'approved-corrections-2026-11-11T14-43-11-246Z-192ad7df';
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file)));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, file))).digest('hex');
const norm = value => JSON.parse(JSON.stringify(value));
const state = snapshot => Object.fromEntries(preview.stateKeys.map(key => [key, snapshot[key]]));
let phase = 'arguments';
function load() {
  phase = 'closeout receipt hashes';
  const manifest = read('closeout-manifest.json');
  assert.equal(manifest.receipt, RECEIPT);
  const required = ['audit-corrections-closeout.cjs', 'apply-package-manifest.json', ...['verification-summary.json', 'commit-receipt.json', 'pre-apply-snapshot.json', 'read-only-current-before-apply.json', 'fresh-read-only-snapshot.json', 'applied-field-changes.json', 'created-records.json', 'approved-plan.json', 'write-attempt.json'].map(file => RECEIPT + '/' + file)].sort();
  assert.deepStrictEqual(Object.keys(manifest.hashes).sort(), required);
  for (const [file, hash] of Object.entries(manifest.hashes)) assert.equal(sha(file), hash, 'Closeout input changed');
  phase = 'approved chain and saved transaction verification';
  const d = apply.load(), summary = read(RECEIPT + '/verification-summary.json'), commit = read(RECEIPT + '/commit-receipt.json');
  const beforeFile = read(RECEIPT + '/pre-apply-snapshot.json'), afterFile = read(RECEIPT + '/fresh-read-only-snapshot.json');
  assert.equal(sha(RECEIPT + '/pre-apply-snapshot.json'), sha(RECEIPT + '/read-only-current-before-apply.json'));
  for (const snapshot of [beforeFile, afterFile]) { assert.equal(snapshot.databaseWrites, 0); assert.equal(snapshot.transactionReadOnly, 'on'); }
  const before = state(beforeFile), expected = state(afterFile);
  preview.validateState(before, d);
  const approved = read(RECEIPT + '/approved-plan.json');
  assert.deepStrictEqual(approved.approval, d.approval); assert.deepStrictEqual(approved.candidate, d.candidate);
  for (const row of [summary, commit, approved]) {
    assert.equal(row.candidateSHA256, d.manifest.candidateSHA256); assert.equal(row.reviewedPlanSHA256, d.approval.reviewedPlanSHA256);
  }
  for (const [key, value] of Object.entries({ mode: 'FRESH_READ_ONLY_NAIA_CORRECTIONS_VERIFICATION_PASSED', newColleges: 9, newPrograms: 9, existingProgramsReclassified: 5, existingProgramFieldChanges: 20, existingCollegeFieldChanges: 4, totalExistingFieldChanges: 24, clearedObsoleteScholarshipTemplateFields: 10, remainingDifferences: 0, globalColleges: 1578, storedNAIAPrograms: 192, globalCoachesPreserved: 4563, globalPlayersPreserved: 19757, globalSnapshotsPreserved: 514, programDependencyModelsPreserved: 7, schoolProfileModelsPreserved: 8, existingOwnershipAndVerificationMetadataPreserved: true, newRecordsUnverified: true, middleGeorgiaDuplicateHeld: true, closedAndSuspendedRecordsHeld: true, institutionSchoolTypeHoldsPreserved: true, newManualVerificationMarkers: 0, recordDeletions: 0, recordMerges: 0, youtubeChanges: 0, nationalBaseballInventoryVerified: false, naiaEnrichmentComplete: false })) assert.equal(summary[key], value, 'Receipt summary mismatch');
  assert.equal(commit.newColleges, 9); assert.equal(commit.newPrograms, 9); assert.equal(commit.existingFieldChanges, 24);
  assert(Number.isFinite(commit.transactionWindow.start) && Number.isFinite(commit.transactionWindow.end) && commit.transactionWindow.end >= commit.transactionWindow.start);
  assert.deepStrictEqual(commit.updatedRows, d.updates.map(row => ({ model: row.model, id: row.id, fields: Object.keys(row.data), rowsUpdated: 1 })));
  assert.deepStrictEqual(read(RECEIPT + '/applied-field-changes.json'), d.candidate.changes);
  const created = read(RECEIPT + '/created-records.json'); assert.deepStrictEqual(created, commit.createdRecords);
  apply.verify(before, expected, d, created, commit.transactionWindow);
  const attempt = read(RECEIPT + '/write-attempt.json'); assert.equal(attempt.candidateSHA256, d.manifest.candidateSHA256); assert.equal(attempt.atomicTransactionRequested, true);
  return { d, before, expected, created, window: commit.transactionWindow, summary };
}
function compare(fresh, x) {
  // Closeout is stricter than the apply verifier: even permitted updatedAt values must exactly match the final committed snapshot.
  for (const key of preview.stateKeys) { phase = 'fresh full-state comparison: ' + key; assert.deepStrictEqual(fresh[key], x.expected[key], 'Closeout drift'); }
  apply.verify(x.before, fresh, x.d, x.created, x.window);
  const naia = fresh.schools.filter(c => c.baseballProgram?.division === 'NAIA'), ids = new Set(naia.map(c => c.baseballProgram.id));
  assert.equal(naia.length, 192); assert.equal(fresh.schools.length, 1578);
  const coverage = Object.fromEntries(['baseballWebsiteUrl', 'rosterUrl', 'scheduleUrl', 'questionnaireUrl', 'campsUrl', 'generalContactUrl', 'generalContactEmail', 'logoUrl', 'programXUrl', 'programInstagramUrl'].map(field => [field, naia.filter(c => typeof c.baseballProgram[field] === 'string' && c.baseballProgram[field].trim()).length]));
  return { checkedAtUtc: new Date().toISOString(), mode: 'READ_ONLY_NAIA_CORRECTIONS_CLOSEOUT_PASSED', databaseWrites: 0, transactionReadOnly: 'on', committedReceipt: RECEIPT, candidateSHA256: x.d.manifest.candidateSHA256, approvedPreviewAndReceiptChainVerified: true, savedCommitAndFreshVerificationMatch: true, newCollegesVerified: 9, newProgramsVerified: 9, existingProgramReclassificationsVerified: 5, existingFieldChangesVerified: 24, obsoleteScholarshipTemplateFieldsCleared: 10, globalCollegesChecked: 1578, storedNAIAPrograms: 192, storedCountIsNotVerifiedNationalBaseballTotal: true, globalCoachesChecked: 4563, globalPlayersChecked: 19757, globalSnapshotsChecked: 514, programDependencyModelsChecked: 7, schoolProfileModelsChecked: 8, fullStateSectionsCompared: 16, changedOrMissingRecords: 0, naiaCoaches: fresh.coaches.filter(c => ids.has(c.programId)).length, naiaRosterPlayers: fresh.players.filter(c => ids.has(c.programId)).length, naiaRosterSnapshots: fresh.snapshots.filter(c => ids.has(c.programId)).length, coverage, newRecordsRemainUnverified: true, existingClaimAndVerificationMetadataPreserved: true, middleGeorgiaDuplicateHeld: true, closedAndSuspendedRecordsHeld: true, formerJuniorCollegeAcademicClassificationHeld: true, newManualVerificationMarkers: 0, recordDeletions: 0, recordMerges: 0, youtubeUpdates: 0, nationalBaseballInventoryVerified: false, naiaEnrichmentComplete: false };
}
function holds(x) {
  const all = JSON.parse(fs.readFileSync(path.join(__dirname, '../sponsorship-review/all-member-dispositions.json')));
  return { ...x.d.candidate.holds, sourceOrMenuHoldsAcrossAllMemberRows: all.filter(row => row.disposition.includes('HELD')), noBaseballListedInCapturedMenu: all.filter(row => row.disposition === 'NO_BASEBALL_LISTED_IN_CAPTURED_SPORT_MENU'), absenceOfMenuEntryIsNotProofOfNoTeam: true, nationalBaseballInventoryVerified: false };
}
async function main() {
  assert(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--preflight', 'Read-only closeout has no apply mode');
  const x = load(), result = compare(x.expected, x);
  if (process.argv[2] === '--preflight') {
    const first = s => s.schools.find(c => c.slug === x.d.candidate.creates[0].college.slug);
    const mutations = [s => s.schools.pop(), s => first(s).state = 'TN', s => first(s).baseballProgram.collegeId = 'wrong-campus', s => first(s).baseballProgram.verificationStatus = 'VERIFIED', s => first(s).baseballProgram.logoUrl = 'https://unapproved.example/logo.png', s => s.schools.find(c => c.slug === 'middle-georgia-state').baseballProgram.division = 'NCAA_D2', s => s.schools.find(c => c.slug === 'shawnee-state').baseballProgram.updatedAt = new Date().toISOString(), s => s.schools.find(c => c.slug === 'andrew-college').schoolType = 'FOUR_YEAR', ...preview.stateKeys.filter(k => k !== 'schools').map(k => s => s[k].push({ id: 'unapproved-row' }))];
    for (const mutate of mutations) { const bad = norm(x.expected); mutate(bad); assert.throws(() => compare(bad, x)); }
    console.log(JSON.stringify({ ...result, mode: 'OFFLINE_NAIA_CORRECTIONS_CLOSEOUT_PREFLIGHT_PASSED', databaseAccess: false, negativePreservationChecks: mutations.length }, null, 2)); return;
  }
  phase = 'fresh read-only database audit';
  req('dotenv').config({ path: path.join(repo, '.env.local'), quiet: true }); req('dotenv').config({ path: path.join(repo, '.env'), quiet: true });
  const { PrismaClient } = req('@prisma/client'), db = new PrismaClient({ log: [] }); let fresh;
  try { fresh = await apply.readOnly(db); } finally { await db.$disconnect(); }
  const liveResult = compare(fresh, x), remaining = holds(x);
  const out = path.join(__dirname, 'closeout-audit-' + liveResult.checkedAtUtc.replace(/[:.]/g, '-') + '-' + crypto.randomUUID().slice(0, 8)); fs.mkdirSync(out);
  for (const [file, value] of Object.entries({ 'report.json': liveResult, 'fresh-read-only-snapshot.json': { databaseWrites: 0, transactionReadOnly: 'on', ...fresh }, 'remaining-holds.json': remaining, 'verified-created-campuses.json': x.created.map(c => ({ collegeId: c.id, slug: c.slug, name: c.name, state: c.state, programId: c.baseballProgram.id, division: c.baseballProgram.division, verificationStatus: c.baseballProgram.verificationStatus })) })) fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(liveResult, null, 2)); console.log('REPORT_PATH=' + path.join(out, 'report.json'));
}
module.exports = { load, compare, holds };
if (require.main === module) main().catch(e => { console.error(JSON.stringify({ status: 'NAIA_CORRECTIONS_READ_ONLY_CLOSEOUT_STOPPED', phase, errorType: e.name, databaseWrites: 0, action: 'Inspect saved receipts or baseline drift locally. Do not rerun the completed import.' })); process.exitCode = 1; });
