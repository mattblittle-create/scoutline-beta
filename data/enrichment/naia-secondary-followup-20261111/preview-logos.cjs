'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const reader=require('../naia-inventory-review-20261111/correction-review/preview-corrections.cjs');
const closeout=require('../naia-enrichment-review-20261111/audit-enrichment-closeout.cjs');
const read=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,f),'utf8'));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,f))).digest('hex');
const norm=x=>JSON.parse(JSON.stringify(x));
function validate(c,baseline){
 assert.equal(c.scope,'NAIA_BLANK_PROGRAM_LOGOS_ONLY_20261111');assert.equal(c.approval,'NOT_GRANTED');assert.equal(c.changes.length,38);
 const seen=new Set();for(const r of c.changes){
  assert.equal(r.model,'CollegeBaseballProgram');assert.equal(r.field,'logoUrl');assert.equal(r.before,null);
  const s=baseline.schools.find(x=>x.id===r.collegeId);assert(s);assert.equal(s.slug,r.slug);assert.equal(s.baseballProgram.id,r.programId);assert.equal(s.baseballProgram.division,'NAIA');assert.equal(s.baseballProgram.logoUrl,null);assert(!s.programProfileUpdatedByUserId);
  assert(!seen.has(r.programId));seen.add(r.programId);assert.equal(new URL(r.after).protocol,'https:');
  const capture=read('conference-logo-captures.json').results.find(x=>x.campus.programId===r.programId);
  assert(capture?.capture?.decoded);assert.equal(capture.capture.status,200);assert.equal(r.after,capture.capture.finalUrl);assert.equal(sha(capture.capture.sourcePath),capture.capture.sha256);
  assert.equal(r.publishedName,capture.selected.publishedName);assert.equal(r.conferenceSource,capture.selected.sourceFile);assert.equal(sha('../naia-inventory-review-20261111/'+r.conferenceSource),capture.selected.sourceSHA256);
 }
 for(const k of ['recordDeletions','recordMerges','coachesCreated','playersCreated','snapshotsCreated','verificationPromotions','youtubeUpdates'])assert.equal(c[k],0);
}
function load(){const manifest=read('logo-manifest.json');for(const [file,hash]of Object.entries(manifest.hashes))assert.equal(sha(file),hash,'Frozen file changed: '+file);
 const candidate=read('logo-candidate.json'),baseline=read(candidate.baseline);closeout.compare(baseline,closeout.load());validate(candidate,baseline);return{candidate,baseline,manifest};}
function compare(fresh,x){for(const key of reader.stateKeys)assert.deepStrictEqual(fresh[key],x.baseline[key],'Baseline drift: '+key);validate(x.candidate,fresh);return{checkedAtUtc:new Date().toISOString(),mode:'READ_ONLY_NAIA_LOGO_PREVIEW_PASSED',databaseWrites:0,transactionReadOnly:'on',candidateSHA256:sha('logo-candidate.json'),blankProgramLogosProposed:38,stateSectionsCompared:reader.stateKeys.length,globalCoachesPreserved:fresh.coaches.length,globalPlayersPreserved:fresh.players.length,globalSnapshotsPreserved:fresh.snapshots.length,recordDeletions:0,recordMerges:0,verificationPromotions:0,youtubeUpdates:0,nationalBaseballInventoryVerified:false,naiaEnrichmentComplete:false,importApproval:'NOT_GRANTED'};}
async function main(){assert(process.argv.length===2||process.argv.length===3&&process.argv[2]==='--preflight','Read-only preview only');const x=load();
 if(process.argv[2]==='--preflight'){const summary=compare(x.baseline,x);let guards=0;for(const key of reader.stateKeys){const bad=norm(x.baseline);if(bad[key].length)bad[key].pop();else bad[key].push({id:'unexpected'});assert.throws(()=>compare(bad,x));guards++;}
  for(const mutate of [c=>c.changes[0].field='verificationStatus',c=>c.changes[0].before='existing',c=>c.changes[0].after='https://example.invalid/logo.png',c=>c.changes[0].programId='wrong-campus',c=>c.recordDeletions=1,c=>c.youtubeUpdates=1]){const bad=norm(x.candidate);mutate(bad);assert.throws(()=>validate(bad,x.baseline));guards++;}
  console.log(JSON.stringify({...summary,mode:'OFFLINE_NAIA_LOGO_PREFLIGHT_PASSED',databaseAccess:false,negativePreservationAndScopeChecks:guards},null,2));return;}
 const repo=path.resolve(__dirname,'../../..');require('dotenv').config({path:path.join(repo,'.env.local'),quiet:true});require('dotenv').config({path:path.join(repo,'.env'),quiet:true});const {PrismaClient}=require('@prisma/client'),db=new PrismaClient({log:[]});let fresh;
 try{fresh=await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');assert.equal((await tx.$queryRawUnsafe('SHOW transaction_read_only'))[0].transaction_read_only,'on');return reader.state(tx);},{isolationLevel:'RepeatableRead',timeout:120000});}finally{await db.$disconnect();}
 const summary=compare(fresh,x),out=path.join(__dirname,'read-only-logo-preview-'+summary.checkedAtUtc.replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8));fs.mkdirSync(out);
 for(const [file,value]of Object.entries({'verification-summary.json':summary,'reviewed-plan.json':{summary,candidate:x.candidate},'fresh-read-only-snapshot.json':{databaseWrites:0,transactionReadOnly:'on',...fresh}}))fs.writeFileSync(path.join(out,file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(summary,null,2));console.log('REPORT_PATH='+path.join(out,'verification-summary.json'));
}
module.exports={load,validate,compare};if(require.main===module)main().catch(e=>{console.error(JSON.stringify({mode:'NAIA_LOGO_PREVIEW_STOPPED',errorType:e.name,message:e.message,databaseWrites:0}));process.exitCode=1;});
