'use strict';
const fs=require('fs'),path=require('path'),u=require('../naia-inventory-review-20261111/source-utils.cjs'),rules=require('../naia-enrichment-review-20261111/secondary-rules.cjs');
const root=path.resolve(__dirname,'../naia-enrichment-review-20261111');
const review=JSON.parse(fs.readFileSync(path.join(root,'secondary-review.json'))),out=[];
for(const r of review.results)for(const kind of ['questionnaire','camps']){const entry=r.destinations?.[kind];if(!entry||entry.capture?.status!==200)continue;const verdict=rules.destination(kind,entry);if(verdict.accepted)continue;
 const q=u.ch.load(fs.readFileSync(path.resolve(root,entry.capture.sourcePath),'utf8'));q('script,style').remove();const text=u.clean(q('body').text());
 out.push({slug:r.campus.slug,kind,url:entry.capture.finalUrl,sourcePath:entry.capture.sourcePath,verdict,title:u.clean(q('title').text()),headings:q('h1,h2,h3').toArray().map(e=>u.clean(q(e).text())),iframes:q('iframe[src]').toArray().map(e=>q(e).attr('src')),dates:[...text.matchAll(/.{0,80}(?:\b\d{1,2}\/\d{1,2}\/20(?:26|27)\b|\b20(?:26|27)-\d\d-\d\d\b).{0,100}/g)].map(x=>x[0])});
}
fs.writeFileSync(path.join(__dirname,'held-destination-inspection.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
