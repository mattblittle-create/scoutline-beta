'use strict';
// Offline discovery only. Existing conference-to-campus joins are reused exactly.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const prior=path.resolve(__dirname,'../naia-inventory-review-20261111');
const u=require(path.join(prior,'source-utils.cjs'));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const baselinePath=path.resolve(__dirname,'../naia-enrichment-review-20261111/closeout-audit-2026-11-11T16-31-39-476Z-42ca5e88/fresh-read-only-snapshot.json');
const baseline=read(baselinePath), plan=read(path.join(prior,'member-source-plan.json'));
const members=read(path.resolve(__dirname,'../naia-membership-evidence-20261111/review-verified/all-member-review.json'));
const conferences=read(path.join(prior,'conference-sources/research.json'));
const host=s=>{try{return new URL(s).hostname.toLowerCase().replace(/^www\./,'');}catch{return null;}};
const results=[];
for(const m of members.filter(x=>x.currentStoredCampus?.division==='NAIA'&&x.currentStoredCampus.programId)){
 const school=baseline.schools.find(x=>x.id===m.currentStoredCampus.collegeId);
 if(!school||school.baseballProgram?.id!==m.currentStoredCampus.programId)throw Error('Campus baseline mismatch: '+m.name);
 if(school.baseballProgram.logoUrl)continue;
 const p=plan.find(x=>x.name===m.name&&x.state===m.state);
 const assets=[];
 for(const s of p?.conferenceSources||[]){
  const f=path.join(prior,s.sourceFile), html=fs.readFileSync(f,'utf8');
  const conference=conferences.find(x=>x.conference===s.conference);
  const base=conference?.home?.finalUrl||conference?.home?.url;
  if(!base)continue;
  for(const c of u.components(html).filter(x=>x.type==='members'))for(const item of c.data||[]){
   if(item.title!==s.name||host(item.athletics_website)!==host(s.url))continue;
   if(item.image?.url)assets.push({url:new URL(item.image.url,base).href,conference:s.conference,publishedName:item.title,location:item.location,publishedAthleticsUrl:item.athletics_website,sourceFile:s.sourceFile,sourceSHA256:crypto.createHash('sha256').update(html).digest('hex'),join:'EXACT_PRIOR_CONFERENCE_NAME_AND_ATHLETICS_HOST'});
  }
  const q=u.ch.load(html);
  q('a[href]').each((i,a)=>{
   if(host(q(a).attr('href'))!==host(s.url))return;
   q(a).find('img').each((j,img)=>{
    const src=q(img).attr('src')||q(img).attr('data-src');
    const label=q(img).attr('alt')||q(a).attr('title')||'';
    if(!src||label.trim()!==s.name)return;
    assets.push({url:new URL(src,base).href,conference:s.conference,publishedName:label,publishedAthleticsUrl:s.url,sourceFile:s.sourceFile,sourceSHA256:crypto.createHash('sha256').update(html).digest('hex'),join:'EXACT_PRIOR_CONFERENCE_IMAGE_LABEL_AND_ATHLETICS_HOST'});
   });
  });
 }
 results.push({name:m.name,state:m.state,campus:m.currentStoredCampus,assets:[...new Map(assets.map(a=>[a.url,a])).values()],disposition:assets.length?'PUBLISHED_ASSET_AWAITING_CAPTURE_AND_VISUAL_REVIEW':'HELD_NO_EXACT_CONFERENCE_ASSET_JOIN'});
}
const output={checkedAtUtc:new Date().toISOString(),databaseAccess:false,databaseWrites:0,baseline:path.relative(path.resolve(__dirname,'../../..'),baselinePath).replace(/\\/g,'/'),baselineSHA256:crypto.createHash('sha256').update(fs.readFileSync(baselinePath)).digest('hex'),results};
fs.writeFileSync(path.join(__dirname,'conference-logo-discovery.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({databaseAccess:false,databaseWrites:0,missingLogos:results.length,exactPublishedAssetMatches:results.filter(x=>x.assets.length).length,unresolved:results.filter(x=>!x.assets.length).map(x=>x.campus.slug)}));
