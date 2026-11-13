'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),u=require('../naia-inventory-review-20261111/source-utils.cjs');
const prior=path.resolve(__dirname,'../naia-enrichment-review-20261111'),read=f=>JSON.parse(fs.readFileSync(f));
const review=read(path.join(prior,'source-review.json')),dispositions=read(path.join(prior,'dispositions.json'));
const known=new Set(),blocked=new Set((review.blockedHosts||[]).filter(x=>typeof x==='string').map(x=>x.replace(/^www\./,'')));
const key=s=>{try{const x=new URL(s);x.hash='';return x.href;}catch{return s;}};
function visit(x){if(!x||typeof x!=='object')return;if(x.status!==undefined){for(const v of [x.url,x.finalUrl])if(v)known.add(key(v));}for(const v of Object.values(x))if(v&&typeof v==='object')visit(v);}
visit(review);for(const file of ['current-page-recovery.json','secondary-review.json'])visit(read(path.join(prior,file)));
const results=[];
for(const r of review.results){const d=dispositions.find(x=>x.programId===r.campus.programId);if(d.coaches!=='HELD'&&d.roster!=='HELD')continue;const candidates=[];
 const captures=[r.baseballHomepage?.capture,...Object.values(r.core||{}).map(x=>x?.capture)].filter(c=>c?.status===200&&c.sourcePath);
 for(const c of [...new Map(captures.map(c=>[c.sourcePath,c])).values()]){const f=path.resolve(prior,c.sourcePath),html=fs.readFileSync(f,'utf8');for(const a of u.links(html,c.finalUrl||c.url)){
  let kind=null;if(d.coaches==='HELD'&&(/staff[-_ ]?directory|coaching[-_ ]?staff/i.test(a.label+' '+a.url)||(/coach/i.test(a.label+' '+a.context)&&/\/coaches(?:\/index)?\/?(?:\?|$)|coaching-records|coaching-staff/i.test(a.url))))kind='coaches';
  if(d.roster==='HELD'&&/baseball|\/bsb\//i.test(a.url+' '+a.label+' '+a.context)&&/roster/i.test(a.label+' '+a.url)&&/2027|2026-27/i.test(a.url+' '+a.label)&&!/\bjv\b|reserve|development|club/i.test(a.label+' '+a.url))kind='roster';
  if(!kind||known.has(key(a.url))||blocked.has(new URL(a.url).hostname.replace(/^www\./,'')))continue;
  if(kind==='coaches'&&/\/coaches\/[^/?]+$/i.test(new URL(a.url).pathname)&&!/\/coaches\/index$/i.test(new URL(a.url).pathname))continue;
  candidates.push({...a,kind,publishedFrom:c.sourcePath,publishedSourceUrl:c.finalUrl||c.url,sourceSHA256:crypto.createHash('sha256').update(html).digest('hex')});
 }}results.push({name:r.name,state:r.state,campus:r.campus,staffHeld:d.coaches==='HELD',rosterHeld:d.roster==='HELD',candidates:[...new Map(candidates.map(a=>[key(a.url),a])).values()]});}
fs.writeFileSync(path.join(__dirname,'published-core-recovery-links.json'),JSON.stringify({checkedAtUtc:new Date().toISOString(),databaseAccess:false,databaseWrites:0,results},null,2)+'\n');console.log(JSON.stringify({reviewedHeldCampuses:results.length,withNewPublishedLinks:results.filter(r=>r.candidates.length).length,newLinks:results.reduce((n,r)=>n+r.candidates.length,0),samples:results.filter(r=>r.candidates.length).slice(0,8).map(r=>({slug:r.campus.slug,links:r.candidates.map(a=>({kind:a.kind,url:a.url,label:a.label}))}))},null,2));
