'use strict';
const fs=require('fs'),path=require('path'),u=require('../naia-inventory-review-20261111/source-utils.cjs'),parser=require('../naia-enrichment-review-20261111/source-parser.cjs');
function build(){const captures=JSON.parse(fs.readFileSync(path.join(__dirname,'core-recovery-captures.json'))),results=[];
for(const r of captures.results.filter(r=>r.kind==='coaches'&&r.capture.status===200)){
 const html=fs.readFileSync(path.join(__dirname,r.capture.sourcePath),'utf8'),q=u.ch.load(html),coaches=[],excluded=[];let sections=0;
 q('table').each((_,table)=>{const headers=q(table).find('thead th,thead td').toArray().map(e=>u.clean(q(e).text())),ni=headers.findIndex(s=>/^(?:full )?name$/i.test(s)),ti=headers.findIndex(s=>/^(?:title|position)$/i.test(s)),pi=headers.findIndex(s=>/^phone/i.test(s));if(ni<0||ti<0)return;let baseball=false;
  q(table).find('tbody tr').each((i,tr)=>{const cells=q(tr).children('td,th').toArray();if(cells.length===1&&Number(q(cells[0]).attr('colspan')||1)>1){const label=u.clean(q(tr).text());baseball=/^(?:men.s\s+)?baseball(?:\s*\([^)]*\))?$/i.test(label);if(baseball)sections++;return;}if(!baseball||cells.length!==headers.length)return;
   const nameCell=q(cells[ni]),name=u.clean(nameCell.find('a').first().text()||nameCell.text()),title=u.clean(q(cells[ti]).text());if(!parser.isVarsityRole(title)||!name.includes(' ')||/\bjv\b|junior varsity|development|reserve/i.test(title)){excluded.push({name,title,reason:'NON_VARSITY_ROLE_OR_UNRESOLVED_NAME'});return;}
   const raw=q(tr).html(),first=raw.match(/var firstHalf\s*=\s*"([^"\r\n]+)"/),second=raw.match(/var secondHalf\s*=\s*"([^"\r\n]+)"/);let email=q(tr).find('a[href^="mailto:"]').first().attr('href')?.replace(/^mailto:/i,'').split('?')[0]||null;if(!email&&first&&second)email=first[1]+'@'+second[1];if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))email=null;
   let bioUrl=null;try{const href=nameCell.find('a[href]').first().attr('href');if(href)bioUrl=new URL(href,r.capture.finalUrl).href;}catch{}
   const phone=pi<0?null:u.clean(q(cells[pi]).text())||null;coaches.push({name,title,email,phone,bioUrl,isHeadCoach:parser.isHead(title.replace(/\|/g,'/')),sourceRow:i,section:'Baseball'});
  });
 });
 const unique=[...new Map(coaches.map(c=>[c.name+'|'+c.title+'|'+c.email,c])).values()];results.push({...r,title:u.clean(q('title').text()),explicitBaseballSections:sections,coaches:unique,excluded,disposition:unique.length?'EXPLICIT_BASEBALL_DEPARTMENT_FACTS_AWAITING_REVIEW':'HELD_NO_SUPPORTED_BASEBALL_DEPARTMENT_ROWS'});
}
return results;}
module.exports={build};if(require.main===module){const results=build();fs.writeFileSync(path.join(__dirname,'staff-section-review.json'),JSON.stringify({databaseAccess:false,databaseWrites:0,results},null,2)+'\n');console.log(JSON.stringify({directories:results.length,supportedPrograms:results.filter(r=>r.coaches.length).length,coaches:results.reduce((n,r)=>n+r.coaches.length,0),headFlags:results.reduce((n,r)=>n+r.coaches.filter(c=>c.isHeadCoach).length,0)}));}
