'use strict';
const fs=require('fs'),path=require('path'),{capture,links,ch,clean}=require('../naia-inventory-review-20261111/source-utils.cjs');
const jobs=[
 ['fisk-conference','Fisk University','TN','https://media.hbcuac.org/schools/fisk/'],
 ['paul-quinn-institution','Paul Quinn College','TX','https://paulquinn.edu/athletics/'],
 ['life-pacific-student-life','Life Pacific University','CA','https://lifepacific.edu/student-life/'],
 ['life-pacific-conference-award','Life Pacific University','CA','https://gsacsports.org/sports/2026/5/25/2025-26_all-sport_award.aspx'],
 ['msu-northern-facts','Montana State University-North','MT','https://welovenorthern.msun.edu/aboutmsun/factsfigures.aspx']
];
async function main(){const root=path.join(__dirname,'sources');fs.mkdirSync(root,{recursive:true});const results=await Promise.all(jobs.map(async([key,name,state,url])=>{const r=await capture(url,root,key+'.html');if(r.html){const $=ch.load(r.html);r.title=clean($('title').text());r.links=links(r.html,r.finalUrl).filter(a=>!/youtube|youtu\.be/i.test(a.url));$('script,style').remove();r.text=clean($('body').text());delete r.html;}return{key,name,state,capture:r};}));fs.writeFileSync(path.join(root,'captures.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(results.map(r=>({key:r.key,status:r.capture.status,title:r.capture.title,text:r.capture.text?.slice(0,100)})),null,2));}
main().catch(e=>{console.error(e.name);process.exitCode=1;});
