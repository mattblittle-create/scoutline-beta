'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const prior=path.resolve(__dirname,'../naia-enrichment-review-20261111'),u=require('../naia-inventory-review-20261111/source-utils.cjs');
const read=f=>JSON.parse(fs.readFileSync(f));
const review=read(path.join(prior,'source-review.json')),results=[];
for(const r of review.results){const links=[];const captures=[r.baseballHomepage?.capture,...Object.values(r.core||{}).map(x=>x?.capture)];
 for(const c of captures){if(c?.status!==200||!c.sourcePath)continue;const html=fs.readFileSync(path.resolve(prior,c.sourcePath),'utf8');
  for(const a of u.links(html,c.finalUrl||c.url)){
   const text=a.label+' '+a.context+' '+new URL(a.url).pathname;
   if(!/questionnaire|recruit(?:ing|ment)?[\s/_-]*(?:form|me)|prospective[\s/_-]*(?:student|athlete)|\bcamps?\b|\bclinics?\b/i.test(text))continue;
   if(/\/roster\/|\/coaches\/|\/news\/|\/staff-directory\/|\/bios\//i.test(new URL(a.url).pathname))continue;
   links.push({...a,publishedFrom:c.sourcePath,publishedSourceUrl:c.finalUrl||c.url,sourceSHA256:crypto.createHash('sha256').update(html).digest('hex')});
  }
 }
 results.push({name:r.name,state:r.state,campus:r.campus,links:[...new Map(links.map(x=>[x.url,x])).values()]});
}
fs.writeFileSync(path.join(__dirname,'recruiting-link-discovery.json'),JSON.stringify({checkedAtUtc:new Date().toISOString(),databaseAccess:false,databaseWrites:0,results},null,2)+'\n');
console.log(JSON.stringify({campuses:results.length,withLinks:results.filter(x=>x.links.length).length,links:results.reduce((n,r)=>n+r.links.length,0),sample:results.filter(x=>x.links.some(a=>/questionnaire|recruit|prospective/i.test(a.label+' '+a.url))).slice(0,12).map(x=>({slug:x.campus.slug,links:x.links.filter(a=>/questionnaire|recruit|prospective/i.test(a.label+' '+a.url)).map(a=>({url:a.url,label:a.label,context:a.context}))}))},null,2));
