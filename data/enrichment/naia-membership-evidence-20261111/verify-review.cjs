'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=__dirname,read=f=>JSON.parse(fs.readFileSync(path.join(root,f))),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const manifest=read('review-verified/input-manifest.json');for(const[file,sha]of Object.entries(manifest.hashes))assert.equal(hash(path.resolve(root,file)),sha,'Input changed: '+file);
const report=read('review-verified/report.json'),rows=read('review-verified/all-member-review.json'),teams=read('review-verified/current-2027-conference-teams.json');
const closeout=require('../naia-inventory-followup-20261111/audit-followup-closeout.cjs');const baseline=read('../naia-inventory-followup-20261111/closeout-audit-2026-11-11T15-11-06-341Z-2f16fdf1/fresh-read-only-snapshot.json');closeout.compare(baseline,closeout.load());
assert.equal(rows.length,233);assert.equal(new Set(rows.map(r=>r.name+'|'+r.state)).size,233);assert.equal(teams.length,47);
assert.equal(rows.filter(r=>r.currentStoredCampus?.division==='NAIA').length,187);
assert.equal(rows.filter(r=>r.currentSeasonEvidence||r.scheduleEvidence.length).length,report.membersWith2027StandingsOrScheduleEvidence);
assert.equal(rows.filter(r=>r.currentStoredCampus?.division==='NAIA'&&r.reviewDisposition.startsWith('HELD')).length,report.remainingStoredMemberSourceHolds);
for(const r of rows)for(const e of r.scheduleEvidence){assert.equal(e.memberName,r.name);assert.equal(e.memberState,r.state);assert(!/tournament|classic|^TBD$/i.test(e.label));assert(e.sourcePath.startsWith('conference-schedules/'));}
const inBethel=teams.find(r=>r.label==='Bethel (IN)'),neConcordia=teams.find(r=>r.label==='Concordia (NE)');assert.equal(inBethel.state,'IN');assert.equal(neConcordia.state,'NE');
assert.equal(rows.find(r=>r.name==='Columbia College'&&r.state==='SC').reviewDisposition,'NO_BASEBALL_LISTED_IN_PRIOR_PRIMARY_SPORT_REVIEW');assert(rows.find(r=>r.name==='Columbia College'&&r.state==='MO').reviewDisposition.startsWith('SUPPORTED'));
for(const [folder,file]of [['sources','captures.json'],['sources','current-standings-captures.json'],['conference-schedules','captures.json']])for(const r of read(folder+'/'+file)){const c=r.capture;if(c.file)assert.equal(hash(path.join(root,folder,c.file)),c.sha256,'Captured source changed');}
for(const key of ['databaseAccess','nationalBaseballInventoryVerified','naiaEnrichmentComplete'])assert.equal(report[key],false);
for(const key of ['databaseWrites','newImportsProposed','recordDeletionsProposed','recordMergesProposed'])assert.equal(report[key],0);
console.log(JSON.stringify({mode:'OFFLINE_MEMBERSHIP_EVIDENCE_REVIEW_PASSED',databaseAccess:false,databaseWrites:0,inputFilesVerified:Object.keys(manifest.hashes).length,memberRows:233,memberRowsMatchedToStoredNAIA:187,current2027ConferenceTeams:47,public2027Schedules:47,membersWith2027StandingsOrScheduleEvidence:report.membersWith2027StandingsOrScheduleEvidence,previousSourceHoldsNowSupported:report.previousSourceHoldsNowSupported,remainingStoredMemberSourceHolds:report.remainingStoredMemberSourceHolds,nationalBaseballInventoryVerified:false},null,2));
