'use strict';
const fs=require('fs'),path=require('path'),{capture,ch,links,clean}=require('../naia-inventory-review-20261111/source-utils.cjs');
const jobs=[
 ['william-woods-2027','William Woods University','MO','https://wwuowls.com/sports/baseball/schedule/2027'],
 ['cumberlands-2027','Cumberlands, University of the','KY','https://cumberlandspatriots.com/sports/baseball/schedule/2027?grid=true'],
 ['aquinas-2027','Aquinas College','MI','https://aqsaints.com/sports/baseball/schedule/2027?grid=true'],
 ['dickinson-2027','Dickinson State University','ND','https://dsubluehawks.com/sports/baseball/schedule/2027?grid=true'],
 ['embry-prescott-2027','Embry-Riddle Aeronautical University','AZ','https://eraueagles.com/sports/baseball/schedule/2027?grid=true'],
 ['morris-varsity','Morris College','SC','https://www.morris.edu/athletics/']
];
async function main(){const root=path.join(__dirname,'inventory-supplement');fs.mkdirSync(root,{recursive:true});const results=await Promise.all(jobs.map(async([key,name,state,url])=>{const c=await capture(url,root,key+'.html');if(c.html){const q=ch.load(c.html);c.title=clean(q('title').text());c.headings=q('h1,h2,h3').toArray().map(e=>clean(q(e).text()));c.links=links(c.html,c.finalUrl).filter(a=>!/youtube|youtu\.be/i.test(a.url));c.tables=q('table').toArray().map(t=>({headings:clean(q(t).find('thead').text()),rows:q(t).find('tbody tr').toArray().map(e=>({text:clean(q(e).text()),cells:q(e).children('th,td').toArray().map(c=>clean(q(c).text()))}))}));c.events=q('.sidearm-schedule-game').toArray().map(e=>clean(q(e).text()));q('script,style').remove();c.text=clean(q('body').text());delete c.html;}return{key,name,state,capture:c};}));fs.writeFileSync(path.join(root,'captures.json'),JSON.stringify(results,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(results.map(r=>({key:r.key,status:r.capture.status,title:r.capture.title,events:r.capture.events?.length})),null,2));}
main().catch(e=>{console.error(e.name);process.exitCode=1;});
