'use strict';
// No import mode. Live reads execute inside a PostgreSQL READ ONLY transaction.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const { createRequire } = require('module');
const repo = path.resolve(__dirname, '../../..');
const req = createRequire(path.join(repo, 'package.json'));
const { parse } = req('csv-parse/sync');
const { Prisma } = req('@prisma/client');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const norm = v => JSON.parse(JSON.stringify(v));
const present = v => v !== null && v !== undefined && (typeof v !== 'string' || !!v.trim()) && (!Array.isArray(v) || v.length > 0);
const webFields = ['baseballWebsiteUrl', 'rosterUrl', 'scheduleUrl', 'questionnaireUrl', 'campsUrl', 'generalContactUrl', 'generalContactEmail', 'logoUrl', 'programXUrl', 'programInstagramUrl'];
const dependencies = { coaches: 'collegeBaseballCoach', players: 'collegeBaseballRosterPlayer', snapshots: 'collegeBaseballRosterSnapshot', rosterNeeds: 'collegeBaseballRosterNeed', metricAverages: 'collegeBaseballMetricAverage', portalActivities: 'collegeBaseballPortalActivity', programOutcomes: 'collegeBaseballProgramOutcome' };
const profiles = ['CollegeAcademicArea', 'CollegeAcademicProfile', 'CollegeAdmissionsProfile', 'CollegeFinancialProfile', 'CollegeCampusProfile', 'CollegeNilProfile', 'CollegeNilCollective', 'CollegeNilSportAllocation'];
const delegate = name => name[0].toLowerCase() + name.slice(1);
const model = name => Prisma.dmmf.datamodel.models.find(m => m.name === name);
const scalarFields = name => model(name).fields.filter(f => f.kind !== 'object');
const metadata = new Set(['id', 'collegeId', 'programId', 'nilProfileId', 'collectiveId', 'createdAt', 'updatedAt', 'sourceUrl', 'dataSourceUrl', 'sourceType', 'confidence', 'verifiedAt', 'lastVerifiedAt', 'verificationStatus']);
function load() {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json')));
  for (const [file, hash] of Object.entries(manifest.inputs)) assert.equal(sha(path.join(repo, file)), hash, 'Pinned input changed: ' + file);
  const refs = parse(fs.readFileSync(path.join(repo, 'data/naia-baseball-programs.csv')), { columns: true, bom: true, skip_empty_lines: true });
  assert(refs.length && refs.every(r => r.name && r.slug && r.division === 'NAIA'));
  return { manifest, refs };
}
function groups(rows, key) {
  const map = new Map();
  for (const row of rows) { const k = key(row); if (!map.has(k)) map.set(k, []); map.get(k).push(row); }
  return [...map].map(([key, rows]) => ({ key, rows }));
}
function coverage(rows, name) {
  return Object.fromEntries(scalarFields(name).filter(f => !metadata.has(f.name)).map(f => {
    const hasLiteralDefault = f.hasDefaultValue && (f.default === null || typeof f.default !== 'object');
    return [f.name, { populated: rows.filter(r => present(r[f.name])).length, ...(hasLiteralDefault ? { equalToSchemaDefault: rows.filter(r => r[f.name] === f.default).length, schemaDefault: f.default } : {}) }];
  }));
}
function analyze(s, refs) {
  for (const k of ['schools', ...Object.keys(dependencies)]) assert(Array.isArray(s[k]), 'Missing state table: ' + k);
  assert.equal(new Set(s.schools.map(c => c.id)).size, s.schools.length);
  assert.equal(new Set(s.schools.map(c => c.slug)).size, s.schools.length);
  const schools = s.schools.filter(c => c.baseballProgram?.division === 'NAIA');
  const ids = new Set(schools.map(c => c.baseballProgram.id));
  assert.equal(ids.size, schools.length, 'Duplicate program ID');
  const bySlug = new Map(s.schools.map(c => [c.slug, c]));
  const referenceSlugs = new Set(refs.map(r => r.slug));
  const identity = c => ({ collegeId: c.id, slug: c.slug, name: c.name, city: c.city, state: c.state, programId: c.baseballProgram?.id, programDivision: c.baseballProgram?.division });
  const duplicateReferenceSlugs = groups(refs, r => r.slug).filter(g => g.rows.length > 1);
  const reconciliation = {
    duplicateReferenceSlugs,
    missingReferenceRows: refs.filter(r => !bySlug.has(r.slug)),
    referenceRowsWithoutProgram: refs.filter(r => bySlug.has(r.slug) && !bySlug.get(r.slug).baseballProgram),
    referenceRowsWithOtherDivision: refs.filter(r => bySlug.get(r.slug)?.baseballProgram && bySlug.get(r.slug).baseballProgram.division !== 'NAIA').map(r => ({ reference: r, stored: identity(bySlug.get(r.slug)) })),
    databaseNAIAOutsideReferenceSlugs: schools.filter(c => !referenceSlugs.has(c.slug)).map(identity),
    collegeDivisionTextWithoutNAIAProgram: s.schools.filter(c => /NAIA/i.test(c.division || '') && c.baseballProgram?.division !== 'NAIA').map(identity),
    duplicateNormalizedDatabaseNames: groups(schools, c => c.name.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(g => g.rows.length > 1).map(g => ({ key: g.key, schools: g.rows.map(identity) })),
    campusSensitiveSchools: s.schools.filter(c => /embry|bethel|concordia/i.test(c.name)).map(identity),
    exactSlugMatchesAreIdentityVerification: false
  };
  const selected = Object.fromEntries(Object.keys(dependencies).map(k => [k, s[k].filter(r => ids.has(r.programId))]));
  const bySeason = rows => Object.fromEntries(groups(rows, r => r.season).map(g => [g.key, g.rows.length]));
  const schoolCoverage = schools.map(c => {
    const p = c.baseballProgram, staff = selected.coaches.filter(r => r.programId === p.id), players = selected.players.filter(r => r.programId === p.id), snaps = selected.snapshots.filter(r => r.programId === p.id);
    return { ...identity(c), conference: p.conference, missingFields: webFields.filter(f => !present(p[f])), activeCoaches: staff.filter(r => r.isActive).length, inactiveCoaches: staff.filter(r => !r.isActive).length, activeHeadFlags: staff.filter(r => r.isActive && r.isHeadCoach).length, rosterPlayersBySeason: bySeason(players), rosterSnapshotsBySeason: bySeason(snaps), has2027Players: players.some(r => r.season === '2027'), has2027Snapshot: snaps.some(r => r.season === '2027'), verificationStatus: p.verificationStatus, lastVerifiedAt: p.lastVerifiedAt };
  });
  const urlIssues = [];
  for (const c of schools) for (const field of webFields.filter(f => f !== 'generalContactEmail')) {
    const value = c.baseballProgram[field]; if (!present(value)) continue;
    let url; try { url = new URL(value); } catch { urlIssues.push({ slug: c.slug, field, value, issue: 'INVALID_URL' }); continue; }
    if (!['http:', 'https:'].includes(url.protocol)) urlIssues.push({ slug: c.slug, field, value, issue: 'NON_HTTP_URL' });
    if (/\/2024-25\//.test(url.pathname)) urlIssues.push({ slug: c.slug, field, value, issue: 'HISTORICAL_2024_25_PATH' });
    if (url.hostname === 'naiastats.prestosports.com') urlIssues.push({ slug: c.slug, field, value, issue: 'ASSOCIATION_STATS_URL_NOT_SCHOOL_SITE' });
  }
  const mirrors = [['baseballWebsiteUrl', 'programWebsiteUrl'], ['questionnaireUrl', 'recruitingQuestionnaireUrl'], ['programXUrl', 'programXUrl'], ['programInstagramUrl', 'programInstagramUrl'], ['logoUrl', 'logoUrl']];
  const mirrorDifferences = schools.flatMap(c => mirrors.filter(([p, f]) => (c.baseballProgram[p] ?? null) !== (c[f] ?? null)).map(([p, f]) => ({ slug: c.slug, programField: p, collegeField: f, programValue: c.baseballProgram[p] ?? null, collegeValue: c[f] ?? null, disposition: 'REVIEW_ONLY_NO_AUTOMATIC_SYNC' })));
  const collegeIds = new Set(schools.map(c => c.id));
  const profileRows = {};
  for (const name of profiles) {
    const rows = s[delegate(name)];
    if (!rows) { profileRows[name] = { captured: false }; continue; }
    let filtered;
    if (name === 'CollegeNilCollective') { const nilIds = new Set((s.collegeNilProfile || []).filter(r => collegeIds.has(r.collegeId)).map(r => r.id)); filtered = rows.filter(r => nilIds.has(r.nilProfileId)); }
    else if (name === 'CollegeNilSportAllocation') { const nilIds = new Set((s.collegeNilProfile || []).filter(r => collegeIds.has(r.collegeId)).map(r => r.id)); const collectiveIds = new Set((s.collegeNilCollective || []).filter(r => nilIds.has(r.nilProfileId)).map(r => r.id)); filtered = rows.filter(r => collectiveIds.has(r.collectiveId)); }
    else filtered = rows.filter(r => collegeIds.has(r.collegeId));
    profileRows[name] = { captured: true, rows: filtered.length, recordsWithSourceUrl: filtered.filter(r => present(r.sourceUrl)).length, recordsWithVerifiedAt: filtered.filter(r => present(r.verifiedAt)).length, coverage: coverage(filtered, name) };
  }
  const templateFields = ['scholarshipNotes', 'scholarshipInfoUrl', 'transferHeavy', 'jucoFriendly', 'tuitionYear', 'schoolType'];
  const referenceTemplateFrequencies = Object.fromEntries(templateFields.map(f => [f, groups(refs, r => r[f]).map(g => ({ value: g.key, rows: g.rows.length }))]));
  return { summary: { databaseNAIAPrograms: schools.length, referenceRows: refs.length, referenceUniqueSlugs: referenceSlugs.size, duplicateReferenceSlugGroups: duplicateReferenceSlugs.length, nationalInventoryVerified: false, membershipReconciliationRequired: true, coverage: Object.fromEntries(webFields.map(f => [f, schools.filter(c => present(c.baseballProgram[f])).length])), activeCoaches: selected.coaches.filter(r => r.isActive).length, inactiveCoaches: selected.coaches.filter(r => !r.isActive).length, activeHeadCoachFlags: selected.coaches.filter(r => r.isActive && r.isHeadCoach).length, programsWithoutActiveHead: schoolCoverage.filter(c => c.activeHeadFlags === 0).length, rosterPlayersBySeason: bySeason(selected.players), rosterSnapshotsBySeason: bySeason(selected.snapshots), programsWith2027Players: schoolCoverage.filter(c => c.has2027Players).length, programsWith2027Snapshots: schoolCoverage.filter(c => c.has2027Snapshot).length, dependencyRows: Object.fromEntries(Object.entries(selected).map(([k, rows]) => [k, rows.length])), globalRowsCaptured: Object.fromEntries(Object.entries(s).filter(([, v]) => Array.isArray(v)).map(([k, rows]) => [k, rows.length])), urlIssueEntries: urlIssues.length, mirrorDifferences: mirrorDifferences.length, importApproval: 'NOT_GRANTED', platformPreference: 'X', youtubeUpdatesProposed: 0, populatedValuesAreIndependentlyVerifiedFacts: false }, reconciliation, schoolCoverage, urlIssues, mirrorDifferences, profileCoverage: profileRows, collegeFieldCoverage: coverage(schools, 'College'), programFieldCoverage: coverage(schools.map(c => c.baseballProgram), 'CollegeBaseballProgram'), intelligenceCoverage: Object.fromEntries(Object.entries(dependencies).filter(([k]) => !['coaches', 'players'].includes(k)).map(([k, d]) => [k, coverage(selected[k], d[0].toUpperCase() + d.slice(1))])), referenceTemplateFrequencies };
}
function preflight(refs) {
  const state = { schools: [{ id: 'c', slug: 'one', name: 'One', baseballProgram: { id: 'p', division: 'NAIA', rosterUrl: '  ', transferHeavy: false } }, { id: 'd', slug: 'other', name: 'Other', baseballProgram: { id: 'q', division: 'NCAA_D3' } }], ...Object.fromEntries(Object.keys(dependencies).map(k => [k, []])) };
  state.coaches.push({ id: 'h', programId: 'p', isActive: true, isHeadCoach: true }, { id: 'i', programId: 'p', isActive: false, isHeadCoach: true }, { id: 'x', programId: 'q', isActive: true, isHeadCoach: true });
  state.players.push({ id: 'r', programId: 'p', season: '2026' });
  const fixture = [{ slug: 'one', name: 'One' }, { slug: 'one', name: 'Another campus' }, { slug: 'missing', name: 'Missing' }, { slug: 'other', name: 'Other' }];
  const before = JSON.stringify(state), a = analyze(state, fixture);
  assert.equal(a.summary.databaseNAIAPrograms, 1); assert.equal(a.summary.coverage.rosterUrl, 0);
  assert.equal(a.summary.activeCoaches, 1); assert.equal(a.summary.inactiveCoaches, 1); assert.equal(a.summary.activeHeadCoachFlags, 1);
  assert.equal(a.summary.programsWith2027Players, 0); assert.equal(a.summary.rosterPlayersBySeason['2026'], 1);
  assert.equal(a.reconciliation.duplicateReferenceSlugs.length, 1); assert.equal(a.reconciliation.missingReferenceRows.length, 1); assert.equal(a.reconciliation.referenceRowsWithOtherDivision.length, 1);
  assert.equal(a.programFieldCoverage.transferHeavy.equalToSchemaDefault, 1); assert.equal(a.profileCoverage.CollegeNilProfile.captured, false);
  assert.equal(JSON.stringify(state), before);
  const bad = norm(state); bad.schools.push(bad.schools[0]); assert.throws(() => analyze(bad, fixture));
  console.log(JSON.stringify({ mode: 'OFFLINE_NAIA_BASELINE_PREFLIGHT_PASSED', databaseAccess: false, databaseWrites: 0, referenceRows: refs.length, checks: 14 }, null, 2));
}
function save(result, state, mode) {
  const out = path.join(__dirname, mode === 'HISTORICAL_SNAPSHOT_ONLY' ? 'historical-analysis-20261105' : 'live-audit-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomUUID().slice(0, 8));
  fs.mkdirSync(out, { recursive: true });
  const report = { checkedAtUtc: new Date().toISOString(), mode, databaseAccess: mode !== 'HISTORICAL_SNAPSHOT_ONLY', databaseWrites: 0, ...(mode !== 'HISTORICAL_SNAPSHOT_ONLY' ? { transactionReadOnly: 'on' } : { historicalSnapshotDate: '2026-11-05', currentDatabaseStatusEstablished: false }), ...result.summary, limitations: ['Historical CSV and exact slug matches do not establish current membership or campus identity.', 'Populated fields, template text, schema defaults and stored verification markers are not independently verified facts.', 'URL checks are syntactic only; no live URL, season or membership verification is claimed.', 'Historical missing profile tables mean not captured, not empty.', 'No automatic season rollover, mirror sync, imports or verification promotion.'] };
  const artifacts = { 'report.json': report, 'inventory-reconciliation.json': result.reconciliation, 'per-school-coverage.json': result.schoolCoverage, 'url-issues.json': result.urlIssues, 'mirror-differences.json': result.mirrorDifferences, 'profile-coverage.json': result.profileCoverage, 'college-field-coverage.json': result.collegeFieldCoverage, 'program-field-coverage.json': result.programFieldCoverage, 'intelligence-coverage.json': result.intelligenceCoverage, 'reference-template-frequencies.json': result.referenceTemplateFrequencies };
  if (mode !== 'HISTORICAL_SNAPSHOT_ONLY') artifacts['fresh-read-only-snapshot.json'] = { databaseWrites: 0, transactionReadOnly: 'on', ...state };
  for (const [file, value] of Object.entries(artifacts)) fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(report, null, 2)); console.log('REPORT_PATH=' + path.join(out, 'report.json'));
}
async function main() {
  const args = process.argv.slice(2);
  assert(args.length === 0 || args.length === 1 && ['--preflight', '--historical'].includes(args[0]), 'Accepts no arguments, --preflight or --historical only. No apply mode.');
  const d = load();
  if (args[0] === '--preflight') return preflight(d.refs);
  if (args[0] === '--historical') { assert.equal(sha(d.manifest.historicalSnapshot), d.manifest.historicalSnapshotSHA256); return save(analyze(JSON.parse(fs.readFileSync(d.manifest.historicalSnapshot)), d.refs), null, 'HISTORICAL_SNAPSHOT_ONLY'); }
  req('dotenv').config({ path: path.join(repo, '.env.local'), quiet: true }); req('dotenv').config({ path: path.join(repo, '.env'), quiet: true });
  const { PrismaClient } = req('@prisma/client'); const db = new PrismaClient({ log: [] }); let state;
  try {
    state = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      assert.equal((await tx.$queryRawUnsafe('SHOW transaction_read_only'))[0].transaction_read_only, 'on');
      const s = { schools: await tx.college.findMany({ include: { baseballProgram: true }, orderBy: { id: 'asc' } }) };
      for (const [key, name] of Object.entries(dependencies)) s[key] = await tx[name].findMany({ orderBy: { id: 'asc' } });
      for (const name of profiles) s[delegate(name)] = await tx[delegate(name)].findMany({ orderBy: { id: 'asc' } });
      return norm(s);
    }, { isolationLevel: 'RepeatableRead', timeout: 120000 });
  } finally { await db.$disconnect(); }
  load(); save(analyze(state, d.refs), state, 'READ_ONLY_NAIA_BASELINE_CAPTURED');
}
module.exports = { analyze, load, preflight };
if (require.main === module) main().catch(() => { console.error(JSON.stringify({ status: 'NAIA_BASELINE_STOPPED', databaseWrites: 0, action: 'Inspect inputs, connectivity or schema locally. No import was attempted; credentials and raw connection errors are suppressed.' })); process.exitCode = 1; });
