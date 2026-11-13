'use strict';
const fs=require('fs'),path=require('path');
const {capture,ch,links}=require('../naia-inventory-review-20261111/source-utils.cjs');
const root=path.join(__dirname,'sources');
const jobs=[
['andrew-accreditation','https://www.andrewcollege.edu/accreditation/'],
['bismarck-degrees','https://catalog.bismarckstate.edu/catalog/degrees/'],
['bismarck-academics','https://bismarckstate.edu/academics/'],
['hesston-engineering','https://hesston.edu/academics/programs/engineering-b.s/'],
['east-georgia-consolidation','https://www.georgiasouthern.edu/consolidation'],
['ocu-2027-schedule','https://www.ocusports.com/sports/baseball/schedule'],
['usao-directory','https://phones.usao.edu/Index_files/sheet001.htm'],
['opsu-institution','https://opsu.edu/']
];
async function main(){fs.mkdirSync(root,{recursive:true});const rows=await Promise.all(jobs.map(async([key,url])=>{const r=await capture(url,root,key+'.html');if(r.html){const $=ch.load(r.html);r.title=$('title').text().replace(/\s+/g,' ').trim();r.headings=$('h1,h2,h3').map((_,e)=>$(e).text().replace(/\s+/g,' ').trim()).get();r.publishedRelevantLinks=links(r.html,r.finalUrl).filter(a=>/baseball|bachelor|accredit|degrees|directory|about|athletics/i.test(a.label+' '+a.context)&&! /youtube|youtu\.be/i.test(a.url));$('script,style,nav,header,footer').remove();r.text=$('body').text().replace(/\s+/g,' ').trim();delete r.html;}return{key,...r};}));fs.writeFileSync(path.join(root,'captures.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(rows.map(({key,status,title,headings})=>({key,status,title,headings:headings?.slice(0,5)})),null,2));}main().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
