'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'recruiting-destination-review.json'))),jobs=[];
const existing=new Set(rows.map(r=>r.capture.url));
for(const r of rows){if(r.verdict!=='HELD_MANUAL_DESTINATION_REVIEW')continue;for(const a of r.related||[]){if(existing.has(a.url)||/baseballcampsusa\.com|\/sports\/baseball(?:\/(?:roster|schedule))?\/?$|facebook|twitter|instagram/i.test(a.url))continue;
 if(r.kind==='questionnaire'&&!/^baseball(?:\s*\(.*\))?$/i.test(a.label.trim()))continue;
 if(r.kind==='camps'&&!/baseball/i.test(a.label))continue;
 existing.add(a.url);jobs.push({name:r.name,state:r.state,campus:r.campus,kind:r.kind,published:{...a,publishedFrom:r.capture.sourcePath,publishedSourceUrl:r.capture.finalUrl,sourceSHA256:r.capture.sha256,publishedPathRoot:'CURRENT_FOLLOWUP'},parentPublished:r.published});}}
const output=path.join(__dirname,'recruiting-followlink-captures.json');if(fs.existsSync(output))throw Error('Already captured; no blind retry');let cursor=0;const results=[];
async function worker(){while(cursor<jobs.length){const i=cursor++,r=jobs[i];try{const res=await fetch(r.published.url,{signal:AbortSignal.timeout(25000)}),html=await res.text(),file='recruiting-sources/follow-'+String(i+1).padStart(3,'0')+'.html';fs.writeFileSync(path.join(__dirname,file),html,{flag:'wx'});results.push({...r,capture:{url:r.published.url,finalUrl:res.url,status:res.status,checkedAtUtc:new Date().toISOString(),sourcePath:file,sha256:crypto.createHash('sha256').update(html).digest('hex')}});}catch(e){results.push({...r,capture:{url:r.published.url,status:'FAILED',errorType:e.name}});}}}
(async()=>{await Promise.all(Array.from({length:4},worker));fs.writeFileSync(output,JSON.stringify({databaseAccess:false,databaseWrites:0,results},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({jobs:jobs.length,status200:results.filter(r=>r.capture.status===200).length,held:results.filter(r=>r.capture.status!==200).length}));})().catch(e=>{console.error(e);process.exitCode=1;});
