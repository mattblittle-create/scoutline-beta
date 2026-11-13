'use strict';
const fs=require('fs'),path=require('path'),{capture,ch,links}=require('./source-utils.cjs');
const root=path.join(__dirname,'priority-evidence');
const sources=[
['bethel-in-roster','https://bupilots.com/sports/baseball/roster'],
['bismarck-transition','https://bismarckstate.edu/about/NAIAFrontierConference/'],
['hesston-transition','https://hesston.edu/about/news/article/hesston-college-joins-naia-and-nccaa-for-2025-26-athletic-season/'],
['andrew-transition','https://andrewfightingtigers.com/news/2026/7/1/7_1_2026_74.aspx'],
['hesston-schedule','https://hclarks.com/sports/baseball/schedule'],
['ussu-roster','https://ussueagles.com/sports/baseball/roster'],
['ussu-transition','https://ussu.edu/news/2026-ussu-athletics-year-in-review/']
];
async function main(){fs.mkdirSync(root,{recursive:true});const rows=await Promise.all(sources.map(async([key,url])=>{const r=await capture(url,root,key+'.html');if(r.html){const q=ch.load(r.html);q('script,style').remove();r.title=q('title').text().replace(/\s+/g,' ').trim();r.headings=q('h1,h2').map((_,e)=>q(e).text().replace(/\s+/g,' ').trim()).get().slice(0,12);r.links=links(r.html,r.finalUrl);r.text=q('body').text().replace(/\s+/g,' ').trim();delete r.html;}return{key,...r};}));fs.writeFileSync(path.join(root,'research.json'),JSON.stringify(rows,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(rows.map(({key,status,title,headings})=>({key,status,title,headings})),null,2));}main().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
