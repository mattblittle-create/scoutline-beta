'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),{createRequire}=require('module');
const repo=path.resolve(__dirname,'../../..'),req=createRequire(path.join(repo,'package.json'));
const apply=require('./apply-approved-followup.cjs'),preview=require('./preview-followup.cjs'),reader=require('../naia-inventory-review-20261111/correction-review/preview-corrections.cjs');
const RECEIPT='approved-followup-2026-11-11T15-06-40-312Z-1db82f00';
const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f))),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,f))).digest('hex'),norm=x=>JSON.parse(JSON.stringify(x));
const state=s=>Object.fromEntries(reader.stateKeys.map(key=>[key,s[key]]));
let phase='arguments';
function load(){
  phase='follow-up closeout receipt hashes';const manifest=read('closeout-manifest.json');assert.equal(manifest.receipt,RECEIPT);
  const required=['audit-followup-closeout.cjs','apply-package-manifest.json',...['verification-summary.json','commit-receipt.json','pre-apply-snapshot.json','read-only-current-before-apply.json','fresh-read-only-snapshot.json','applied-field-changes.json','created-records.json','approved-plan.json','write-attempt.json'].map(file=>RECEIPT+'/'+file)].sort();
  assert.deepStrictEqual(Object.keys(manifest.hashes).sort(),required);for(const[file,hash]of Object.entries(manifest.hashes))assert.equal(sha(file),hash,'Saved receipt or audit changed');
  phase='approved follow-up and prior import chain';const d=apply.load(),summary=read(RECEIPT+'/verification-summary.json'),commit=read(RECEIPT+'/commit-receipt.json'),approved=read(RECEIPT+'/approved-plan.json');
  const beforeFile=read(RECEIPT+'/pre-apply-snapshot.json'),afterFile=read(RECEIPT+'/fresh-read-only-snapshot.json');
  assert.equal(sha(RECEIPT+'/pre-apply-snapshot.json'),sha(RECEIPT+'/read-only-current-before-apply.json'));
  for(const s of [beforeFile,afterFile]){assert.equal(s.databaseWrites,0);assert.equal(s.transactionReadOnly,'on');}
  const before=state(beforeFile),expected=state(afterFile);preview.validateState(before,d);
  assert.deepStrictEqual(approved.approval,d.approval);assert.deepStrictEqual(approved.candidate,d.candidate);
  for(const r of [summary,commit,approved]){assert.equal(r.candidateSHA256,d.manifest.candidateSHA256);assert.equal(r.reviewedPlanSHA256,d.approval.reviewedPlanSHA256);}
  for(const[key,value]of Object.entries({mode:'FRESH_READ_ONLY_NAIA_FOLLOWUP_VERIFICATION_PASSED',newColleges:2,newPrograms:2,newInstitutionWebsiteUrls:2,newBaseballHomepageUrls:0,collegeSchoolTypeChanges:4,existingProgramFieldChanges:0,remainingDifferences:0,globalColleges:1580,storedNAIAPrograms:194,storedCountIsNotVerifiedNationalBaseballTotal:true,previousNineSchoolImportPreserved:true,globalCoachesPreserved:4563,globalPlayersPreserved:19757,globalSnapshotsPreserved:514,programDependencyModelsPreserved:7,schoolProfileModelsPreserved:8,newRecordsUnverified:true,existingOwnershipAndVerificationMetadataPreserved:true,middleGeorgiaDuplicateHeld:true,closedAndSuspendedRecordsHeld:true,baseballHomepageAccessHoldsPreserved:2,newManualVerificationMarkers:0,recordDeletions:0,recordMerges:0,youtubeChanges:0,nationalBaseballInventoryVerified:false,naiaEnrichmentComplete:false}))assert.equal(summary[key],value,'Receipt summary mismatch');
  for(const[key,value]of Object.entries({newColleges:2,newPrograms:2,collegeSchoolTypeChanges:4,existingProgramFieldChanges:0}))assert.equal(commit[key],value);
  assert.deepStrictEqual(commit.updatedRows,[...d.candidate.changes].sort((a,b)=>a.collegeId.localeCompare(b.collegeId)).map(x=>({collegeId:x.collegeId,slug:x.slug,field:x.field,before:x.before,after:x.after,rowsUpdated:1})));
  assert.deepStrictEqual(read(RECEIPT+'/applied-field-changes.json'),d.candidate.changes);const created=read(RECEIPT+'/created-records.json');assert.deepStrictEqual(created,commit.createdRecords);
  assert(Number.isFinite(commit.transactionWindow.start)&&Number.isFinite(commit.transactionWindow.end)&&commit.transactionWindow.end>=commit.transactionWindow.start);
  apply.verify(before,expected,d,created,commit.transactionWindow);
  const attempt=read(RECEIPT+'/write-attempt.json');assert.equal(attempt.candidateSHA256,d.manifest.candidateSHA256);assert.equal(attempt.atomicTransactionRequested,true);
  return{d,before,expected,created,window:commit.transactionWindow,summary};
}
function compare(fresh,x){
  for(const key of reader.stateKeys){phase='exact post-commit comparison: '+key;assert.deepStrictEqual(fresh[key],x.expected[key],'Current state drift');}
  apply.verify(x.before,fresh,x.d,x.created,x.window);
  const naia=fresh.schools.filter(c=>c.baseballProgram?.division==='NAIA'),ids=new Set(naia.map(c=>c.baseballProgram.id));
  const coverage=Object.fromEntries(['baseballWebsiteUrl','rosterUrl','scheduleUrl','questionnaireUrl','campsUrl','generalContactUrl','generalContactEmail','logoUrl','programXUrl','programInstagramUrl'].map(field=>[field,naia.filter(c=>typeof c.baseballProgram[field]==='string'&&c.baseballProgram[field].trim()).length]));
  const corrected=x.d.candidate.changes.map(row=>{const c=fresh.schools.find(c=>c.id===row.collegeId);assert.equal(c.schoolType,'FOUR_YEAR');return{collegeId:c.id,slug:c.slug,name:c.name,schoolType:c.schoolType};});
  return{checkedAtUtc:new Date().toISOString(),mode:'READ_ONLY_NAIA_FOLLOWUP_CLOSEOUT_PASSED',databaseWrites:0,transactionReadOnly:'on',committedReceipt:RECEIPT,candidateSHA256:x.d.manifest.candidateSHA256,approvedPreviewAndCommitChainVerified:true,previousNineSchoolImportPreserved:true,cumulativeNewColleges:11,cumulativeNewPrograms:11,cumulativeExistingFieldChanges:28,followupNewCollegesVerified:2,followupNewProgramsVerified:2,followupCollegeSchoolTypeChangesVerified:4,followupExistingProgramFieldChanges:0,globalCollegesChecked:1580,storedNAIAPrograms:194,storedCountIsNotVerifiedNationalBaseballTotal:true,globalCoachesChecked:4563,globalPlayersChecked:19757,globalSnapshotsChecked:514,programDependencyModelsChecked:7,schoolProfileModelsChecked:8,fullStateSectionsCompared:16,changedOrMissingRecords:0,naiaCoaches:fresh.coaches.filter(c=>ids.has(c.programId)).length,naiaRosterPlayers:fresh.players.filter(c=>ids.has(c.programId)).length,naiaRosterSnapshots:fresh.snapshots.filter(c=>ids.has(c.programId)).length,coverage,correctedSchoolTypes:corrected,newRecordsRemainUnverified:true,existingClaimAndVerificationMetadataPreserved:true,baseballHomepageAccessHoldsPreserved:2,middleGeorgiaDuplicateHeld:true,closedAndSuspendedRecordsHeld:true,newManualVerificationMarkers:0,recordDeletions:0,recordMerges:0,youtubeUpdates:0,nationalBaseballInventoryVerified:false,naiaEnrichmentComplete:false};
}
function holds(x){return{...x.d.candidate.remainingHolds,resolvedFormerJuniorCollegeSchoolTypeHolds:x.d.candidate.changes.map(row=>({slug:row.slug,field:row.field,after:row.after})),oldStoredCohortSourceHoldsRemain:true,nationalBaseballInventoryVerified:false};}
async function main(){
  assert(process.argv.length===2||process.argv.length===3&&process.argv[2]==='--preflight','Read-only closeout accepts no apply mode');const x=load(),result=compare(x.expected,x);
  if(process.argv[2]==='--preflight'){
    const first=s=>s.schools.find(c=>c.slug==='oklahoma-panhandle-state-university'),changed=s=>s.schools.find(c=>c.slug==='andrew-college');
    const mutations=[s=>s.schools.pop(),s=>first(s).state='TX',s=>first(s).baseballProgram.collegeId='wrong-parent',s=>first(s).baseballProgram.baseballWebsiteUrl='https://unapproved.example/baseball',s=>first(s).baseballProgram.verificationStatus='VERIFIED',s=>changed(s).schoolType='JUNIOR_COLLEGE',s=>changed(s).baseballProgram.updatedAt=new Date().toISOString(),s=>changed(s).updatedAt=new Date().toISOString(),s=>s.schools.find(c=>c.slug==='bethel-university-indiana').state='TN',s=>s.schools.find(c=>c.slug==='middle-georgia-state').baseballProgram.division='NCAA_D2',...reader.stateKeys.filter(k=>k!=='schools').map(k=>s=>s[k].push({id:'unapproved-row'}))];
    for(const mutate of mutations){const bad=norm(x.expected);mutate(bad);assert.throws(()=>compare(bad,x));}
    console.log(JSON.stringify({...result,mode:'OFFLINE_NAIA_FOLLOWUP_CLOSEOUT_PREFLIGHT_PASSED',databaseAccess:false,negativePreservationChecks:mutations.length},null,2));return;
  }
  phase='fresh read-only audit';req('dotenv').config({path:path.join(repo,'.env.local'),quiet:true});req('dotenv').config({path:path.join(repo,'.env'),quiet:true});const{PrismaClient}=req('@prisma/client'),db=new PrismaClient({log:[]});let fresh;try{fresh=await apply.readOnly(db);}finally{await db.$disconnect();}
  const liveResult=compare(fresh,x),remaining=holds(x),out=path.join(__dirname,'closeout-audit-'+liveResult.checkedAtUtc.replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8));fs.mkdirSync(out);
  for(const[file,value]of Object.entries({'report.json':liveResult,'fresh-read-only-snapshot.json':{databaseWrites:0,transactionReadOnly:'on',...fresh},'remaining-holds.json':remaining,'verified-created-campuses.json':x.created.map(c=>({collegeId:c.id,programId:c.baseballProgram.id,slug:c.slug,name:c.name,state:c.state,websiteUrl:c.websiteUrl,baseballWebsiteUrl:c.baseballProgram.baseballWebsiteUrl,verificationStatus:c.baseballProgram.verificationStatus}))}))fs.writeFileSync(path.join(out,file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(liveResult,null,2));console.log('REPORT_PATH='+path.join(out,'report.json'));
}
module.exports={load,compare,holds};if(require.main===module)main().catch(e=>{console.error(JSON.stringify({status:'NAIA_FOLLOWUP_READ_ONLY_CLOSEOUT_STOPPED',phase,errorType:e.name,databaseWrites:0,action:'Inspect saved receipt or baseline drift locally. Do not rerun either completed import.'}));process.exitCode=1;});
