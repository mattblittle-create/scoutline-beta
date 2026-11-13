'use strict';
const fs=require('fs'),path=require('path'),{capture,ch,links,clean}=require('../naia-inventory-review-20261111/source-utils.cjs');
const jobs=[
 ['loyola-roster','Loyola University','LA','https://loyolawolfpack.com/sports/baseball/roster'],
 ['loyola-schedule','Loyola University','LA','https://loyolawolfpack.com/sports/baseball/schedule/2027?grid=true'],
 ['cumberland-schedule','Cumberland University','TN','https://gocumberlandathletics.com/sports/baseball/schedule/2027?grid=true'],
 ['wayland-schedule','Wayland Baptist University','TX','https://wbuathletics.com/sports/baseball/schedule/2027?grid=true'],
 ['toccoa-schedule','University of Toccoa Falls','GA','https://utfathletics.com/sports/baseball/schedule'],
 ['simpson-schedule','Simpson University','CA','https://simpsonredhawks.com/sports/baseball/schedule']
];
async function main(){const root=path.join(__dirname,'extra-sources');fs.mkdirSync(root,{recursive:true});const results=await Promise.all(jobs.map(async([key,name,state,url])=>{const c=await capture(url,root,key+'.html');if(c.html){const q=ch.load(c.html);c.title=clean(q('title').text());c.headings=q('h1,h2,h3').toArray().map(e=>clean(q(e).text()));c.links=links(c.html,c.finalUrl).filter(a=>!/youtube|youtu\.be/i.test(a.url));c.tables=q('table').toArray().map(t=>({headers:q(t).find('thead tr').last().children('th,td').toArray().map(e=>clean(q(e).text())),rows:q(t).find('tbody tr').toArray().map(e=>({text:clean(q(e).text()),cells:q(e).children('th,td').toArray().map(c=>clean(q(c).text()))}))}));c.events=q('.sidearm-schedule-game').toArray().map(e=>clean(q(e).text()));delete c.html;}return{key,name,state,capture:c};}));fs.writeFileSync(path.join(root,'captures.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(results.map(r=>({key:r.key,status:r.capture.status,title:r.capture.title,events:r.capture.events?.length})),null,2));}
main().catch(e=>{console.error(e.name);process.exitCode=1;});
