'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), crypto = require('crypto');
const { createRequire } = require('module');
const repo = path.resolve(__dirname, '../../../..'), req = createRequire(path.join(repo, 'package.json'));
const { Prisma } = req('@prisma/client'), preview = require('./preview-corrections.cjs');
const REVIEW = 'read-only-preview-2026-11-11T14-34-30-016Z-88705753';
const CANDIDATE_SHA = '1471b38ec9dbd0d06ba352b3652b5aeb1a434989354a47e9b3386a128c2d065c';
const PLAN_SHA = '348fe5307dca1392ee8e56994f853ba45a7b7a2d5960ccc30cfbd2244490eeda';
const read = f => JSON.parse(fs.readFileSync(path.join(__dirname, f)));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, f))).digest('hex');
const norm = v => JSON.parse(JSON.stringify(v));
const scalarFields = name => Prisma.dmmf.datamodel.models.find(m => m.name === name).fields.filter(f => f.kind !== 'object');
const allowed = { College: ['name', 'city'], CollegeBaseballProgram: ['division', 'conference', 'scholarshipNotes', 'scholarshipInfoUrl'] };
let phase = 'arguments';
function rows(changes) {
  const out = new Map();
  for (const x of changes) {
    assert(allowed[x.model]?.includes(x.field), 'Unapproved update field');
    const id = x.model === 'College' ? x.collegeId : x.programId, key = x.model + '|' + id;
    if (!out.has(key)) out.set(key, { model: x.model, id, collegeId: x.collegeId, before: {}, data: {} });
    const row = out.get(key); assert(!Object.hasOwn(row.data, x.field), 'Duplicate field update');
    row.before[x.field] = x.before; row.data[x.field] = x.after;
  }
  return [...out.values()].sort((a, b) => (a.model + a.id).localeCompare(b.model + b.id));
}
function load() {
  phase = 'approved package hashes';
  const packageManifest = read('apply-package-manifest.json');
  assert.deepStrictEqual(Object.keys(packageManifest.hashes).sort(), ['apply-approved-corrections.cjs', 'approval.json', 'manifest.json', REVIEW + '/reviewed-plan.json', REVIEW + '/verification-summary.json', REVIEW + '/fresh-read-only-snapshot.json'].sort());
  for (const [file, hash] of Object.entries(packageManifest.hashes)) assert.equal(sha(file), hash, 'Apply package changed');
  const approval = read('approval.json');
  assert.equal(approval.userApproval, 'Approve the nine-school, five-program correction import.');
  assert.equal(approval.approvedPreview, REVIEW); assert.equal(approval.candidateSHA256, CANDIDATE_SHA); assert.equal(approval.reviewedPlanSHA256, PLAN_SHA);
  assert.equal(sha(REVIEW + '/reviewed-plan.json'), PLAN_SHA);
  const d = preview.load(), plan = read(REVIEW + '/reviewed-plan.json'), saved = read(REVIEW + '/fresh-read-only-snapshot.json');
  const summary = read(REVIEW + '/verification-summary.json');
  assert.equal(d.manifest.candidateSHA256, CANDIDATE_SHA); assert.equal(plan.candidateSHA256, CANDIDATE_SHA);
  assert.equal(plan.mode, 'READ_ONLY_NAIA_CORRECTION_PREVIEW_PASSED'); assert.deepStrictEqual(plan.candidate, d.candidate);
  for (const [key, value] of Object.entries({ mode: 'READ_ONLY_NAIA_CORRECTION_PREVIEW_PASSED', databaseWrites: 0, transactionReadOnly: 'on', newCollegesProposed: 9, newProgramsProposed: 9, existingProgramsReclassifiedProposed: 5, existingProgramFieldChangesProposed: 20, existingCollegeFieldChangesProposed: 4, totalExistingFieldChangesProposed: 24, globalCoachesPreserved: 4563, globalPlayersPreserved: 19757, globalSnapshotsPreserved: 514, programDependencyModelsChecked: 7, schoolProfileModelsChecked: 8, recordDeletionsProposed: 0, recordMergesProposed: 0, importApproval: 'NOT_GRANTED' })) { assert.equal(plan[key], value); assert.equal(summary[key], value); }
  assert.equal(saved.databaseWrites, 0); assert.equal(saved.transactionReadOnly, 'on');
  preview.validateState(saved, d);
  const updates = rows(d.candidate.changes);
  assert.equal(updates.length, 8); assert.equal(updates.filter(r => r.model === 'College').length, 3);
  assert.equal(updates.filter(r => r.model === 'CollegeBaseballProgram').length, 5);
  for (const model of ['College', 'CollegeBaseballProgram']) {
    const meta = Prisma.dmmf.datamodel.models.find(m => m.name === model);
    assert(meta && (!meta.dbName || meta.dbName === model));
    for (const field of ['id', 'updatedAt', ...allowed[model]]) {
      const f = meta.fields.find(f => f.name === field); assert(f && (!f.dbName || f.dbName === field));
    }
  }
  return { ...d, approval, updates };
}
function validDate(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function verifyNewScalar(row, name, proposed, extra, window) {
  const fields = scalarFields(name);
  assert.deepStrictEqual(Object.keys(row).sort(), fields.map(f => f.name).sort(), 'Unexpected new-record fields');
  assert(typeof row.id === 'string' && row.id.length > 0);
  for (const field of fields) {
    const key = field.name;
    if (key === 'id') continue;
    if (key === 'createdAt' || key === 'updatedAt') {
      assert(validDate(row[key]));
      assert(Date.parse(row[key]) >= window.start - 60000 && Date.parse(row[key]) <= window.end + 60000, 'New-record timestamp outside operation');
    } else if (Object.hasOwn(extra, key)) assert.deepStrictEqual(row[key], extra[key]);
    else if (Object.hasOwn(proposed, key)) assert.deepStrictEqual(row[key], proposed[key]);
    else if (field.hasDefaultValue && (field.default === null || typeof field.default !== 'object')) assert.deepStrictEqual(row[key], field.default, 'Unexpected literal default: ' + key);
    else { assert(!field.isRequired, 'Unexpected required field without approved value'); assert.equal(row[key], null, 'Unexpected new nonblank field: ' + key); }
  }
  assert(Date.parse(row.updatedAt) >= Date.parse(row.createdAt));
}
const ordered = a => [...a].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
function verify(before, after, d, created, window) {
  assert.equal(created.length, 9); assert.equal(new Set(created.map(c => c.id)).size, 9);
  assert.equal(new Set(created.map(c => c.baseballProgram.id)).size, 9);
  const oldCollegeIds = new Set(before.schools.map(c => c.id)), oldProgramIds = new Set(before.schools.flatMap(c => c.baseballProgram ? [c.baseballProgram.id] : []));
  const expected = norm(before), actual = norm(after), byId = new Map(expected.schools.map(c => [c.id, c]));
  for (const update of d.updates) {
    const college = byId.get(update.collegeId), row = update.model === 'College' ? college : college.baseballProgram;
    assert.equal(row.id, update.id);
    for (const [field, value] of Object.entries(update.before)) assert.deepStrictEqual(row[field], value);
    Object.assign(row, update.data);
    const currentCollege = actual.schools.find(c => c.id === college.id), current = update.model === 'College' ? currentCollege : currentCollege?.baseballProgram;
    assert(current && validDate(current.updatedAt));
    assert(Date.parse(current.updatedAt) >= Date.parse(row.updatedAt));
    assert(Date.parse(current.updatedAt) >= window.start - 60000 && Date.parse(current.updatedAt) <= window.end + 60000);
    current.updatedAt = row.updatedAt;
  }
  for (const proposed of d.candidate.creates) {
    const c = created.find(c => c.slug === proposed.college.slug); assert(c && c.baseballProgram);
    assert(!oldCollegeIds.has(c.id)); assert(!oldProgramIds.has(c.baseballProgram.id));
    const { baseballProgram, ...college } = c;
    verifyNewScalar(college, 'College', proposed.college, {}, window);
    verifyNewScalar(baseballProgram, 'CollegeBaseballProgram', proposed.program, { collegeId: c.id }, window);
    expected.schools.push(norm(c));
  }
  assert.equal(actual.schools.length, before.schools.length + 9);
  for (const key of preview.stateKeys) assert.deepStrictEqual(ordered(actual[key]), ordered(expected[key]), 'Unapproved state difference: ' + key);
  assert.equal(after.coaches.length, 4563); assert.equal(after.players.length, 19757); assert.equal(after.snapshots.length, 514);
  assert.equal(after.schools.filter(c => c.baseballProgram?.division === 'NAIA').length, 192);
  assert.equal(after.schools.filter(c => c.baseballProgram?.division === 'NCAA_D3').length, 379);
}
function lockStatements(d) {
  const collegeIds = [...new Set(d.candidate.changes.map(x => x.collegeId))].sort();
  const programIds = d.updates.filter(x => x.model === 'CollegeBaseballProgram').map(x => x.id).sort();
  assert.equal(collegeIds.length, 7); assert.equal(programIds.length, 5);
  return [
    Prisma.sql`SELECT "id" FROM "College" WHERE "id" IN (${Prisma.join(collegeIds)}) ORDER BY "id" FOR UPDATE`,
    Prisma.sql`SELECT "id" FROM "CollegeBaseballProgram" WHERE "id" IN (${Prisma.join(programIds)}) ORDER BY "id" FOR UPDATE`
  ];
}
async function readOnly(db) {
  return db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    assert.equal((await tx.$queryRawUnsafe('SHOW transaction_read_only'))[0].transaction_read_only, 'on');
    return preview.state(tx);
  }, { isolationLevel: 'RepeatableRead', timeout: 120000 });
}
function fixtureNew(proposed, index, date) {
  function scalar(name, data, extra, id) {
    return Object.fromEntries(scalarFields(name).map(f => [f.name, f.name === 'id' ? id : ['createdAt', 'updatedAt'].includes(f.name) ? date : Object.hasOwn(extra, f.name) ? extra[f.name] : Object.hasOwn(data, f.name) ? data[f.name] : f.hasDefaultValue && typeof f.default !== 'object' ? f.default : null]));
  }
  const collegeId = 'offline-college-' + index;
  return { ...scalar('College', proposed.college, {}, collegeId), baseballProgram: scalar('CollegeBaseballProgram', proposed.program, { collegeId }, 'offline-program-' + index) };
}
function preflight(d) {
  const now = Date.now(), window = { start: now, end: now }, date = new Date(now).toISOString(), created = d.candidate.creates.map((c, i) => fixtureNew(c, i, date));
  const after = norm(d.baseline);
  for (const update of d.updates) { const c = after.schools.find(c => c.id === update.collegeId), row = update.model === 'College' ? c : c.baseballProgram; Object.assign(row, update.data, { updatedAt: date }); }
  after.schools.push(...norm(created)); verify(d.baseline, after, d, created, window);
  const first = s => s.schools.find(c => c.slug === d.candidate.creates[0].college.slug);
  const changed = s => s.schools.find(c => c.slug === 'shawnee-state');
  const mutations = [
    s => s.schools.pop(), s => s.schools.push(norm(s.schools[0])),
    s => first(s).state = 'TN', s => first(s).baseballProgram.collegeId = 'wrong-parent',
    s => first(s).baseballProgram.transferHeavy = true, s => first(s).schoolType = 'JUNIOR_COLLEGE',
    s => first(s).baseballProgram.verificationStatus = 'VERIFIED', s => first(s).lastVerifiedAt = date,
    s => first(s).programProfileUpdatedByUserId = 'unapproved-owner',
    s => first(s).baseballProgram.programYoutubeUrl = 'https://youtube.com/unapproved',
    s => changed(s).baseballProgram.division = 'NAIA', s => changed(s).baseballProgram.scholarshipNotes = 'unapproved text',
    s => s.schools.find(c => c.slug === 'middle-georgia').baseballProgram.division = 'NAIA',
    s => s.schools.find(c => c.slug === 'middle-georgia-state').baseballProgram.division = 'NCAA_D2',
    s => s.schools.find(c => c.slug === 'bethel').name = 'Bethel University (Indiana)',
    s => s.schools.find(c => c.slug === 'andrew-college').schoolType = 'FOUR_YEAR',
    s => changed(s).baseballProgram.updatedAt = '1900-01-01T00:00:00.000Z',
    s => changed(s).updatedAt = date,
    ...preview.stateKeys.filter(k => k !== 'schools').map(k => s => s[k].push({ id: 'unapproved-row' }))
  ];
  for (const mutate of mutations) { const bad = norm(after); mutate(bad); assert.throws(() => verify(d.baseline, bad, d, created, window)); }
  const badReceipt = norm(created); badReceipt[0].baseballProgram.logoUrl = 'https://unapproved.example/logo.png';
  assert.throws(() => verify(d.baseline, after, d, badReceipt, window));
  assert.throws(() => rows([{ ...d.candidate.changes[0], field: 'programYoutubeUrl' }]));
  assert.throws(() => rows([d.candidate.changes[0], d.candidate.changes[0]]));
  const sql = lockStatements(d); assert.deepStrictEqual(sql.map(s => s.values.length), [7, 5]);
  assert(sql.every(s => !s.values.some(v => s.text.includes(v))));
  console.log(JSON.stringify({ mode: 'OFFLINE_APPROVED_NAIA_CORRECTIONS_PREFLIGHT_PASSED', databaseAccess: false, candidateSHA256: CANDIDATE_SHA, approvedPreview: REVIEW, reviewedPlanSHA256: PLAN_SHA, newColleges: 9, newPrograms: 9, existingProgramUpdates: 5, existingCollegeUpdates: 3, existingFieldChanges: 24, guardedPrismaUpdateCalls: 8, serializableTransaction: true, lockedExistingColleges: 7, lockedExistingPrograms: 5, negativePreservationChecks: mutations.length + 1, updateAndSQLSafetyChecks: 3, fullStateSectionsCompared: 16, globalCoachesPreserved: 4563, globalPlayersPreserved: 19757, globalSnapshotsPreserved: 514, manualVerificationChanges: 0, recordDeletions: 0, recordMerges: 0, youtubeChanges: 0 }, null, 2));
}
async function main() {
  assert(process.argv.length === 3 && ['--preflight', '--apply'].includes(process.argv[2]), 'Use exactly --preflight or --apply');
  const d = load(); if (process.argv[2] === '--preflight') return preflight(d);
  phase = 'database setup';
  req('dotenv').config({ path: path.join(repo, '.env.local'), quiet: true }); req('dotenv').config({ path: path.join(repo, '.env'), quiet: true });
  const { PrismaClient } = req('@prisma/client'), db = new PrismaClient({ log: [] });
  const out = path.join(__dirname, 'approved-corrections-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomUUID().slice(0, 8));
  fs.mkdirSync(out); const save = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  console.log('REPORT_DIRECTORY=' + out);
  let attempted = false, committed = false;
  try {
    phase = 'fresh read-only baseline'; const before = await readOnly(db);
    save('read-only-current-before-apply.json', { databaseWrites: 0, transactionReadOnly: 'on', ...before });
    preview.validateState(before, d); load();
    save('pre-apply-snapshot.json', { databaseWrites: 0, transactionReadOnly: 'on', ...before });
    save('approved-plan.json', { approval: d.approval, candidate: d.candidate, candidateSHA256: CANDIDATE_SHA, reviewedPlanSHA256: PLAN_SHA });
    phase = 'serializable guarded apply';
    save('write-attempt.json', { startedAtUtc: new Date().toISOString(), candidateSHA256: CANDIDATE_SHA, atomicTransactionRequested: true, action: 'If completion is interrupted, inspect database and receipts before any retry.' });
    attempted = true;
    const transaction = await db.$transaction(async tx => {
      const start = Date.now(), locks = lockStatements(d);
      assert.equal((await tx.$queryRaw(locks[0])).length, 7); assert.equal((await tx.$queryRaw(locks[1])).length, 5);
      preview.validateState(await preview.state(tx), d);
      const updated = [];
      for (const update of d.updates) {
        const where = { id: update.id, ...update.before };
        if (update.model === 'CollegeBaseballProgram') where.collegeId = update.collegeId;
        const result = update.model === 'College' ? await tx.college.updateMany({ where, data: update.data }) : await tx.collegeBaseballProgram.updateMany({ where, data: update.data });
        assert.equal(result.count, 1, 'Exact-before guard failed');
        updated.push({ model: update.model, id: update.id, fields: Object.keys(update.data), rowsUpdated: result.count });
      }
      const created = [];
      for (const row of d.candidate.creates) created.push(norm(await tx.college.create({ data: { ...row.college, baseballProgram: { create: row.program } }, include: { baseballProgram: true } })));
      const window = { start, end: Date.now() };
      verify(before, await preview.state(tx), d, created, window);
      load();
      return { updated, created, window };
    }, { isolationLevel: 'Serializable', maxWait: 15000, timeout: 120000 });
    committed = true;
    // Persist proof of the committed transaction before the independent post-commit read.
    phase = 'commit receipt';
    save('commit-receipt.json', { committedAtUtc: new Date().toISOString(), candidateSHA256: CANDIDATE_SHA, reviewedPlanSHA256: PLAN_SHA, newColleges: 9, newPrograms: 9, existingFieldChanges: 24, updatedRows: transaction.updated, createdRecords: transaction.created, transactionWindow: transaction.window });
    phase = 'fresh read-only post-commit verification';
    const after = await readOnly(db); verify(before, after, d, transaction.created, transaction.window); load();
    save('fresh-read-only-snapshot.json', { databaseWrites: 0, transactionReadOnly: 'on', ...after });
    save('applied-field-changes.json', d.candidate.changes); save('created-records.json', transaction.created);
    const result = { checkedAtUtc: new Date().toISOString(), mode: 'FRESH_READ_ONLY_NAIA_CORRECTIONS_VERIFICATION_PASSED', candidateSHA256: CANDIDATE_SHA, reviewedPlanSHA256: PLAN_SHA, newColleges: 9, newPrograms: 9, existingProgramsReclassified: 5, existingProgramFieldChanges: 20, existingCollegeFieldChanges: 4, totalExistingFieldChanges: 24, clearedObsoleteScholarshipTemplateFields: 10, remainingDifferences: 0, globalColleges: after.schools.length, storedNAIAPrograms: 192, storedCountIsNotVerifiedNationalBaseballTotal: true, globalCoachesPreserved: 4563, globalPlayersPreserved: 19757, globalSnapshotsPreserved: 514, programDependencyModelsPreserved: 7, schoolProfileModelsPreserved: 8, existingOwnershipAndVerificationMetadataPreserved: true, newRecordsUnverified: true, middleGeorgiaDuplicateHeld: true, closedAndSuspendedRecordsHeld: true, institutionSchoolTypeHoldsPreserved: true, newManualVerificationMarkers: 0, recordDeletions: 0, recordMerges: 0, youtubeChanges: 0, nationalBaseballInventoryVerified: false, naiaEnrichmentComplete: false };
    save('verification-summary.json', result); console.log(JSON.stringify(result, null, 2)); console.log('REPORT_PATH=' + path.join(out, 'verification-summary.json'));
  } catch (e) {
    const diagnostic = { status: committed ? 'COMMITTED_INSPECT_REPORTS' : attempted ? 'APPLY_ATTEMPTED_INSPECT_REPORTS' : 'STOPPED_BEFORE_APPLY', phase, errorType: e.name, databaseWrites: committed ? 'COMMITTED_9_COLLEGES_9_PROGRAMS_24_EXISTING_FIELDS' : attempted ? 'UNCONFIRMED_INSPECT_BEFORE_RETRY' : 0, reportDirectory: out, action: 'Do not blindly rerun. Inspect the receipt and current state; raw connection errors and credentials are suppressed.' };
    try { save('failure-diagnostic.json', diagnostic); } catch {}
    console.error(JSON.stringify(diagnostic)); process.exitCode = 1;
  } finally {
    try { await db.$disconnect(); }
    catch (e) {
      console.error(JSON.stringify({ status: committed ? 'COMMITTED_DISCONNECT_WARNING_INSPECT_RECEIPTS' : 'DISCONNECT_WARNING_INSPECT_RECEIPTS', errorType: e.name, databaseWrites: committed ? 'COMMITTED_9_COLLEGES_9_PROGRAMS_24_EXISTING_FIELDS' : attempted ? 'UNCONFIRMED_INSPECT_BEFORE_RETRY' : 0, reportDirectory: out, action: 'Inspect saved receipts before any retry.' }));
      process.exitCode = 1;
    }
  }
}
module.exports = { load, verify, rows, lockStatements, fixtureNew, readOnly };
if (require.main === module) main().catch(e => { console.error(JSON.stringify({ status: 'APPROVED_NAIA_PACKAGE_REJECTED_BEFORE_DATABASE_ACCESS', phase, errorType: e.name, databaseWrites: 0 })); process.exitCode = 1; });
