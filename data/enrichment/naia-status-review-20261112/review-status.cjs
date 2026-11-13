'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),nav=path.join(root,'naia-navigation-recovery-20261112');
const read=f=>JSON.parse(fs.readFileSync(f)),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const closeout=path.join(nav,'closeout-audit-2026-11-12T15-55-29-680Z-c996317c'),receipt=path.join(nav,'approved-navigation-staff-2026-11-12T15-45-50-640Z-cf0b5eb9');
const report=read(path.join(closeout,'report.json')),holds=read(path.join(closeout,'remaining-holds.json'));
assert.equal(report.mode,'READ_ONLY_NAIA_NAVIGATION_STAFF_CLOSEOUT_PASSED');assert.equal(report.changedOrMissingRecords,0);
const files=fs.readdirSync(receipt);const matching=files.filter(f=>/snapshot/i.test(f)).filter(f=>hash(path.join(receipt,f))===hash(path.join(closeout,'fresh-read-only-snapshot.json')));assert(matching.length,'Latest closeout must match committed verification snapshot bytes');
const evidence=read(path.join(__dirname,'institution-status-evidence.json'));
for(const item of evidence.results){assert.equal(item.status,200);assert.equal(hash(path.join(__dirname,item.sourcePath)),item.sha256);}
const faq=fs.readFileSync(path.join(__dirname,evidence.results.find(r=>r.key==='uhsp-student-faq').sourcePath),'utf8');
assert(/sufficient number of players/i.test(faq));assert(/2026-27/.test(faq));
assert.equal(holds.memberMatchedStaffHolds.length,65);
const queue=holds.memberMatchedStaffHolds.map(r=>({name:r.name,state:r.state,slug:r.slug,collegeId:r.collegeId,programId:r.programId,workstream:r.slug==='uhsp'?'CURRENT_BASEBALL_SPONSORSHIP_UNRESOLVED':r.slug==='oakwood'?'CURRENT_HEAD_ROLE_UNRESOLVED':'PUBLISHED_OFFICIAL_SOURCE_DISCOVERY',databaseChangeApproved:false}));
const result={databaseAccess:false,databaseWrites:0,baselineCloseout:path.basename(closeout),baselineSnapshotSHA256:hash(path.join(closeout,'fresh-read-only-snapshot.json')),committedSnapshotByteMatch:true,memberMatchedPrograms:187,programsWithActiveHead:122,staffHolds:65,programsWith2027Roster:56,rosterHolds:131,storedNAIAPrograms:194,storedCountIsNotVerifiedNationalBaseballTotal:true,nationalBaseballInventoryVerified:false,naiaEnrichmentComplete:false,uhspDisposition:'HOLD_NO_DATABASE_CHANGE',limitations:['Institution-wide conditional athletics language does not establish current baseball sponsorship.','Archived navigation and missing staff listings do not authorize deletion or reclassification.','The 187 matched campuses are a working reconciliation set, not a verified national baseball total.'],staffWorkQueue:queue};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(__dirname,'status-review.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...result,staffWorkQueue:undefined,publicInstitutionEvidenceFilesVerified:evidence.results.length},null,2));
