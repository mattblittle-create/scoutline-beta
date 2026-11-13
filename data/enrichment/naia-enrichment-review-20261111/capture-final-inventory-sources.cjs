'use strict';
const fs=require('fs'),path=require('path'),{capture,ch,clean}=require('../naia-inventory-review-20261111/source-utils.cjs');
const jobs=[
 ['bethel-tn-2027','Bethel University','TN','https://bethelathletics.com/sports/baseball/schedule/2027?grid=true'],
 ['sau-conference-2026','St. Ambrose University','IA','https://sau.edu/about-sau/news-events/news/2026/st-ambrose-university-approved-for-full-membership-in-the-heart-of-america-athletic-conference.php'],
 ['sau-baseball-2026','St. Ambrose University','IA','https://sau.edu/about-sau/news-events/news/2026/st-ambrose-university-announces-6-million-investment-in-new-baseball-complex.php'],
 ['texas-college-varsity','Texas College','TX','https://texascollege.edu/about-brtexas-college/quick-facts/']
];
async function main(){const root=path.join(__dirname,'final-inventory-sources');fs.mkdirSync(root,{recursive:true});const results=await Promise.all(jobs.map(async([key,name,state,url])=>{const c=await capture(url,root,key+'.html');if(c.html){const q=ch.load(c.html);c.title=clean(q('title').text());c.headings=q('h1,h2,h3').toArray().map(e=>clean(q(e).text()));q('script,style').remove();c.text=clean(q('body').text());delete c.html;}return{key,name,state,capture:c};}));fs.writeFileSync(path.join(root,'captures.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(results.map(r=>({key:r.key,status:r.capture.status,title:r.capture.title})),null,2));}
main().catch(e=>{console.error(e.name);process.exitCode=1;});
