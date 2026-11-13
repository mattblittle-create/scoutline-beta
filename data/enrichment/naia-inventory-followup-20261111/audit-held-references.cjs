'use strict';
// Counts only. No user identifiers, messages, invite tokens or credentials are exported.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const closeout=require('./audit-followup-closeout.cjs'),reader=require('../naia-inventory-review-20261111/correction-review/preview-corrections.cjs');
const repo=path.resolve(__dirname,'../../..');
const slugs=['oakland-city','providence-christian','st-andrews','trinity-christian','lourdes','siena-heights','middle-georgia-state','middle-georgia'];
const saved='closeout-audit-2026-11-11T15-11-06-341Z-2f16fdf1';
function references(models){
  const result=[];
  for(const m of models){
    for(const f of m.fields.filter(f=>f.kind==='object'&&['College','CollegeBaseballProgram'].includes(f.type)&&f.relationFromFields?.length)){
      assert.equal(f.relationFromFields.length,1);assert.deepStrictEqual(f.relationToFields,['id']);
      result.push({model:m.name,field:f.relationFromFields[0],target:f.type,declaredRelation:true});
    }
    for(const f of m.fields.filter(f=>f.kind!=='object'&&['collegeId','programId','baseballProgramId'].includes(f.name))){
      if(!result.some(r=>r.model===m.name&&r.field===f.name)){
        assert.equal(m.name,'ProgramVerificationSubmission','Unreviewed logical reference');
        assert(['collegeId','baseballProgramId'].includes(f.name));
        result.push({model:m.name,field:f.name,target:f.name==='collegeId'?'College':'CollegeBaseballProgram',declaredRelation:false});
      }
    }
  }
  return result.sort((a,b)=>(a.model+'.'+a.field).localeCompare(b.model+'.'+b.field));
}
function targets(snapshot){return slugs.map(slug=>{const c=snapshot.schools.find(c=>c.slug===slug);assert(c?.baseballProgram);assert.equal(c.baseballProgram.division,slug==='middle-georgia'?'NCAA_D2':'NAIA');return{slug,name:c.name,state:c.state,collegeId:c.id,programId:c.baseballProgram.id,role:slug==='middle-georgia'?'CANONICAL_PRESERVE':'HELD_NO_DISPOSITION_APPROVED'};});}
async function counts(tx,refs,campuses){
  const output=[];
  for(const campus of campuses){const rows=[];for(const r of refs){const delegate=r.model[0].toLowerCase()+r.model.slice(1);assert.equal(typeof tx[delegate]?.count,'function');const count=await tx[delegate].count({where:{[r.field]:r.target==='College'?campus.collegeId:campus.programId}});assert(Number.isSafeInteger(count)&&count>=0);rows.push({...r,count});}output.push({...campus,references:rows});}
  return output;
}
async function main(){
  assert(process.argv.length===2||process.argv.length===3&&process.argv[2]==='--preflight','Only read-only audit or --preflight supported');
  const x=closeout.load(),snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,saved,'fresh-read-only-snapshot.json')));closeout.compare(snapshot,x);
  const {Prisma,PrismaClient}=require('@prisma/client'),refs=references(Prisma.dmmf.datamodel.models),campuses=targets(snapshot);
  const summary={mode:'OFFLINE_HELD_REFERENCE_PREFLIGHT_PASSED',databaseAccess:false,databaseWrites:0,heldRecords:7,canonicalRecordsPreserved:1,referencePaths:refs.length,logicalReferencePaths:refs.filter(r=>!r.declaredRelation).length,deletionsProposed:0,mergesProposed:0,dispositionApproval:'NOT_GRANTED'};
  if(process.argv[2]==='--preflight'){
    assert.equal(refs.length,27);assert.equal(summary.logicalReferencePaths,2);
    const mock=Object.fromEntries(refs.map(r=>[r.model[0].toLowerCase()+r.model.slice(1),{count:async args=>{assert.equal(Object.keys(args.where).length,1);return 0;}}]));
    assert.equal((await counts(mock,refs,campuses)).length,8);
    assert.throws(()=>references([{name:'Unexpected',fields:[{name:'collegeId',kind:'scalar'}]}]));
    const bad=JSON.parse(JSON.stringify(snapshot));bad.schools.find(c=>c.slug==='middle-georgia').baseballProgram.division='NAIA';assert.throws(()=>targets(bad));
    console.log(JSON.stringify({...summary,offlineGuardChecks:4},null,2));return;
  }
  require('dotenv').config({path:path.join(repo,'.env.local'),quiet:true});require('dotenv').config({path:path.join(repo,'.env'),quiet:true});
  const db=new PrismaClient({log:[]});let result;
  try{result=await db.$transaction(async tx=>{
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');const setting=await tx.$queryRawUnsafe('SHOW transaction_read_only');assert.equal(setting[0].transaction_read_only,'on');
    const fresh=await reader.state(tx);closeout.compare(fresh,x);
    return await counts(tx,refs,targets(fresh));
  },{isolationLevel:'RepeatableRead',timeout:120000});}finally{await db.$disconnect();}
  const checkedAtUtc=new Date().toISOString(),out=path.join(__dirname,'held-reference-audit-'+checkedAtUtc.replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8));
  const report={...summary,mode:'READ_ONLY_HELD_REFERENCE_AUDIT_PASSED',databaseAccess:true,transactionReadOnly:'on',checkedAtUtc,baselineCloseout:saved,baselineSectionsCompared:16,campuses:result,limitations:['Counts cover Prisma-declared inbound school/program relations and reviewed scalar ID fields; JSON, text and external-system references are not inventoried.','Zero references do not authorize deletion, merge, reclassification or verification promotion.','Institution evidence holds and national baseball inventory reconciliation remain open.']};
  fs.mkdirSync(out);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({...report,campuses:result.map(c=>({slug:c.slug,referencePathsWithRows:c.references.filter(r=>r.count>0).length}))},null,2));console.log('REPORT_PATH='+path.join(out,'report.json'));
}
module.exports={references,targets,counts};if(require.main===module)main().catch(e=>{console.error(JSON.stringify({mode:'HELD_REFERENCE_AUDIT_STOPPED',errorType:e.name,databaseWrites:0,action:'Inspect baseline drift or schema changes locally; no imports should be rerun.'}));process.exitCode=1;});
