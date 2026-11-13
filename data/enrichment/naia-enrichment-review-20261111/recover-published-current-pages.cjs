'use strict';
const fs=require('fs'),path=require('path'),{capture,links,ch,clean}=require('../naia-inventory-review-20261111/source-utils.cjs');
const root=__dirname,review=JSON.parse(fs.readFileSync(path.join(root,'source-review.json'))),blocked=new Set(review.blockedHosts),seen=new Set();
const parser=require('./source-parser.cjs'),draft=JSON.parse(fs.readFileSync(path.join(root,'dispositions-review.json')));
for(const r of review.results)for(const c of [r.baseballHomepage?.capture,...Object.values(r.core||{}).map(x=>x.capture)].filter(Boolean)){for(const url of [c.url,c.finalUrl].filter(Boolean)){seen.add(url);if([202,403,429,520].includes(c.status))blocked.add(new URL(url).hostname.replace(/^www\./,''));}}
const jobs=[];
for(const r of review.results){const d=draft.find(d=>d.programId===r.campus.programId);for(const kind of ['roster','schedule','coaches']){
 if((kind==='roster'&&d.roster.startsWith('SUPPORTED'))||(kind==='schedule'&&d.schedule.startsWith('SUPPORTED'))||(kind==='coaches'&&d.coaches.startsWith('SUPPORTED')))continue;
 const pages=(kind==='coaches'?[r.core?.coaches,r.baseballHomepage]:[r.core?.[kind]]).filter(x=>x?.capture?.status===200&&x.capture.sourcePath);
 const choices=[];for(const p of pages){const raw=fs.readFileSync(path.resolve(root,p.capture.sourcePath),'utf8'),base=p.capture.finalUrl||p.capture.url;
  for(const a of links(raw,base)){
   const url=new URL(a.url),current=/^(?:2027|2026[-–]27|2026[-–]2027)(?:\s+(?:baseball|season))?$/i.test(a.label.trim());
   if(current&&new RegExp(kind,'i').test(url.pathname+url.search)&&/baseball|\/bsb(?:\/|$)|[?&]path=bsb/i.test(a.url)&&!/\/(?:bios|coaches)\/[^/]+\/\d+/.test(url.pathname))choices.push({a,p,priority:2});
   if(kind==='coaches'&&/^(?:coaches|coaching staff|baseball coaches)$/i.test(a.label.trim())&&/baseball|\/bsb(?:\/|$)|[?&]path=bsb/i.test(a.url+' '+a.context)&&!/record|history|\/year(?:\?|$)|archive|\.pdf/i.test(a.url))choices.push({a,p,priority:1});
  }
 }
 const pick=choices.sort((a,b)=>b.priority-a.priority).find(x=>!seen.has(x.a.url)&&!blocked.has(new URL(x.a.url).hostname.replace(/^www\./,'')));if(pick){seen.add(pick.a.url);jobs.push({name:r.name,state:r.state,campus:r.campus,kind,url:pick.a.url,label:pick.a.label,publishedFrom:pick.p.capture.sourcePath});}
}}
async function main(){const folder=path.join(root,'current-page-recovery');fs.mkdirSync(folder,{recursive:true});let i=0;const results=[];await Promise.all(Array.from({length:4},async()=>{while(i<jobs.length){const index=i++,job=jobs[index],c=await capture(job.url,folder,String(index+1).padStart(3,'0')+'.html');if(c.html){const q=ch.load(c.html);c.title=clean(q('title').text());c.headings=q('h1,h2,h3').toArray().map(e=>clean(q(e).text()));c.sourcePath='current-page-recovery/'+c.file;delete c.html;}results.push({...job,capture:c});}}));results.sort((a,b)=>a.name.localeCompare(b.name)||a.kind.localeCompare(b.kind));fs.writeFileSync(path.join(root,'current-page-recovery.json'),JSON.stringify({checkedAtUtc:new Date().toISOString(),databaseAccess:false,databaseWrites:0,results},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({publishedLinksFollowed:jobs.length,statuses:results.reduce((a,r)=>(a[r.capture.status]=(a[r.capture.status]||0)+1,a),{}),pages:results.map(r=>({name:r.name,kind:r.kind,status:r.capture.status,title:r.capture.title}))},null,2));}
main().catch(e=>{console.error(e.name);process.exitCode=1;});
