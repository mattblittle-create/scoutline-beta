'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{ch,clean}=require('../naia-inventory-review-20261111/source-utils.cjs');
const root=path.join(__dirname,'conference-schedules'),captures=JSON.parse(fs.readFileSync(path.join(root,'captures.json'))),events=[];
for(const r of captures){assert.equal(r.capture.status,200);assert(/2027|2026-27/.test(r.capture.title));const q=ch.load(fs.readFileSync(path.join(root,r.capture.file),'utf8'));let found=0;
  function visit(value){if(Array.isArray(value)){value.forEach(visit);return;}if(!value||typeof value!=='object')return;
    if(value['@type']==='SportsEvent'&&value.sport==='Baseball'&&/^2027-/.test(value.startDate||'')){
      const names=[value.homeTeam?.name,value.awayTeam?.name].filter(Boolean);for(const label of names)if(!/\b(jv|junior varsity|reserve|club|alumni|scrimmage|exhibition)\b/i.test(label+' '+(value.description||'')+' '+(value.name||'')))events.push({label,date:value.startDate,eventUrl:value.url||null,hostMember:r.team.name,hostState:r.team.state,sourceUrl:r.capture.finalUrl,sourcePath:'conference-schedules/'+r.capture.file,evidenceType:'PUBLISHED_BASEBALL_2027_SPORTS_EVENT'});found++;
    }
    if(value['@graph'])visit(value['@graph']);
  }
  q('script[type="application/ld+json"]').each((_,e)=>visit(JSON.parse(q(e).text())));
  q('.event-row[data-event-id]').each((_,element)=>{const e=q(element),label=clean(e.find('.team-name').first().text());if(!label||/\b(jv|junior varsity|reserve|club|alumni|scrimmage|exhibition)\b/i.test(clean(e.text())))return;events.push({label,date:null,eventId:e.attr('data-event-id'),hostMember:r.team.name,hostState:r.team.state,sourceUrl:r.capture.finalUrl,sourcePath:'conference-schedules/'+r.capture.file,evidenceType:'OPPONENT_EVENT_ON_EXPLICIT_2027_BASEBALL_SCHEDULE',limitation:'Season identified by page title and 2026-27 schedule URL; no complete event date inferred.'});});
  if(!found)for(const table of r.capture.tables||[])for(const row of table.rows){if(!/^\d{1,2}\/\d{1,2}\/2027$/.test(row.cells[0]||''))continue;const label=(row.cells[1]||'').replace(/^(?:at|vs\.?)\s+/i,'').trim();if(!label||/\b(jv|junior varsity|reserve|club|alumni|scrimmage|exhibition)\b/i.test(row.text))continue;events.push({label,date:row.cells[0],hostMember:r.team.name,hostState:r.team.state,sourceUrl:r.capture.finalUrl,sourcePath:'conference-schedules/'+r.capture.file,evidenceType:'DATED_2027_BASEBALL_SCHEDULE_ROW'});}
}
fs.writeFileSync(path.join(root,'season-baseball-evidence.json'),JSON.stringify(events,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({teamAppearances:events.length,labels:[...new Set(events.map(e=>e.label))].sort()},null,2));
