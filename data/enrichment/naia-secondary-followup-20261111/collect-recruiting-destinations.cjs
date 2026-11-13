'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),u=require('../naia-inventory-review-20261111/source-utils.cjs');
const root=__dirname,prior=path.resolve(root,'../naia-enrichment-review-20261111');
const read=f=>JSON.parse(fs.readFileSync(f));
const discovery=read(path.join(root,'recruiting-link-discovery.json')),old=read(path.join(prior,'secondary-review.json')),source=read(path.join(prior,'source-review.json'));
const baseline=read(path.join(root,'logo-closeout-audit-2026-11-11T16-53-34-788Z-ca528a87/fresh-read-only-snapshot.json'));
const host=s=>{try{return new URL(s).hostname.replace(/^www\./,'');}catch{return null;}};
const blocked=new Set((source.blockedHosts||[]).map(x=>typeof x==='string'?x:x.host).filter(Boolean));
const existing=new Map();for(const r of old.results)for(const entry of Object.values(r.destinations||{}))if(entry?.capture)existing.set(entry.published.url,entry.capture);
const jobs=[];
for(const r of discovery.results){const school=baseline.schools.find(x=>x.id===r.campus.collegeId);if(!school)throw Error('Campus missing');
 for(const kind of ['questionnaire','camps']){if(school.baseballProgram[kind==='camps'?'campsUrl':'questionnaireUrl'])continue;
  const candidates=r.links.filter(a=>kind==='camps'?/\bcamps?\b|\bclinics?\b/i.test(a.label+' '+new URL(a.url).pathname):/questionnaire|recruit|prospective/i.test(a.label+' '+new URL(a.url).pathname)).filter(a=>! /alumni|committed|brochure|\.pdf(?:$|\?)/i.test(a.label+' '+a.url));
  candidates.sort((a,b)=>(/baseball|\/bsb\//i.test(b.url+' '+b.label+' '+b.context)?10:0)-(/baseball|\/bsb\//i.test(a.url+' '+a.label+' '+a.context)?10:0));
  const chosen=candidates.find(a=>existing.has(a.url)||!blocked.has(host(a.url)));if(chosen)jobs.push({name:r.name,state:r.state,campus:r.campus,kind,published:chosen});
 }
}
// Follow only literal published frame URLs from the already-reviewed baseball forms.
for(const slug of ['ciu','concordia']){const r=old.results.find(x=>x.campus.slug===slug),entry=r.destinations.questionnaire,c=entry.capture,q=u.ch.load(fs.readFileSync(path.resolve(prior,c.sourcePath),'utf8'));for(const el of q('iframe[src]').toArray()){const url=q(el).attr('src');if(!/^https:\/\/www\.frontrush\.com\//i.test(url))continue;jobs.push({name:r.name,state:r.state,campus:r.campus,kind:'questionnaire-frame',published:{url,publishedFrom:c.sourcePath,publishedSourceUrl:c.finalUrl,sourceSHA256:c.sha256}});}}
const out=path.join(root,'recruiting-destination-captures.json');if(fs.existsSync(out))throw Error('Already captured; do not blindly retry');fs.mkdirSync(path.join(root,'recruiting-sources'),{recursive:true});let cursor=0;const results=[];
async function worker(){while(cursor<jobs.length){const i=cursor++,job=jobs[i],saved=existing.get(job.published.url);if(saved){results.push({...job,capture:{...saved,sourcePath:'../naia-enrichment-review-20261111/'+saved.sourcePath},reused:true});continue;}
 try{const res=await fetch(job.published.url,{signal:AbortSignal.timeout(25000)}),html=await res.text(),file='recruiting-sources/'+String(i+1).padStart(4,'0')+'.html';fs.writeFileSync(path.join(root,file),html,{flag:'wx'});results.push({...job,capture:{url:job.published.url,finalUrl:res.url,status:res.status,sourcePath:file,checkedAtUtc:new Date().toISOString(),sha256:crypto.createHash('sha256').update(html).digest('hex')}});}catch(e){results.push({...job,capture:{url:job.published.url,status:'FAILED',errorType:e.name}});}
}}
(async()=>{await Promise.all(Array.from({length:5},worker));results.sort((a,b)=>(a.name+a.kind).localeCompare(b.name+b.kind));fs.writeFileSync(out,JSON.stringify({checkedAtUtc:new Date().toISOString(),databaseAccess:false,databaseWrites:0,results},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({databaseAccess:false,databaseWrites:0,jobs:jobs.length,reused:results.filter(r=>r.reused).length,status200:results.filter(r=>r.capture.status===200).length,held:results.filter(r=>r.capture.status!==200).length}));})().catch(e=>{console.error(e);process.exitCode=1;});
