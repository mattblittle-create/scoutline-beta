'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),u=require('../naia-inventory-review-20261111/source-utils.cjs');
async function main(){const out=path.join(__dirname,'directory-captures.json');assert(!fs.existsSync(out));fs.mkdirSync(path.join(__dirname,'sources'),{recursive:true});const results=[];
async function capture(key,url,publishedFrom=null){const r=await fetch(url,{signal:AbortSignal.timeout(25000)}),body=await r.text(),sourcePath='sources/'+key+'.html';fs.writeFileSync(path.join(__dirname,sourcePath),body,{flag:'wx'});results.push({key,url,finalUrl:r.url,status:r.status,checkedAtUtc:new Date().toISOString(),sourcePath,sha256:crypto.createHash('sha256').update(body).digest('hex'),publishedFrom});return{r,body};}
const d=await capture('defiance-directory','https://www.defiance.edu/directory/');
if(d.r.status===200){const q=u.ch.load(d.body),pages=[...new Set(q('a[href]').filter((_,e)=>/^Page [2-9]$/.test(u.clean(q(e).text()))).map((_,e)=>new URL(q(e).attr('href'),d.r.url).href).get())];for(let i=0;i<pages.length;i++)await capture('defiance-page-'+(i+2),pages[i],{sourcePath:'sources/defiance-directory.html',url:d.r.url});}
await capture('doane-directory','https://web.doane.edu/directory');
fs.writeFileSync(out,JSON.stringify({databaseAccess:false,databaseWrites:0,results},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(results.map(r=>({key:r.key,status:r.status,url:r.url})),null,2));}
main().catch(e=>{console.error(e);process.exitCode=1;});
