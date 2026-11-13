'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{ch,clean}=require('../naia-inventory-review-20261111/source-utils.cjs');
const root=__dirname,read=f=>JSON.parse(fs.readFileSync(path.resolve(root,f))),prior=read('../naia-membership-evidence-20261111/review-verified/all-member-review.json');
const normalize=s=>s.toLowerCase().replace(/\([^)]*\)/g,' ').replace(/\bst\.?\b/g,'saint').replace(/&/g,' and ').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w&&!['university','college','univ','the','of','at'].includes(w)).sort().join(' ');
const aliases={'Lawrence Tech':'Lawrence Technological University','UM-Dearborn':'Michigan-Dearborn, University','Oregon Tech':'Oregon Institute of Technology','LSU Shreveport':'Louisiana State University Shreveport','Williams Baptist College (Ark.)':'Williams Baptist University','Union Commonwealth University (Ky.)':'Union Commonwealth University','Bluefield University (Va.)':'Bluefield University','Johnson University - Tennesee':'Johnson University','University of Science and Arts (Okla.)':'Science and Arts of Ok, University of','SUNO (La.)':'Southern University at New Orleans','UNOH':'Northwestern Ohio, University of','West Virginia University Institute of Technology':'West Virginia University Tech.'};
const matches=[],unmatched=[];
function match(label,source){label=label.replace(/\s*\*.*$/,'').replace(/\s*\(DH\)$/i,'').trim();const rawState=label.match(/\(([^)]+)\)/)?.[1],state=({'Ill.':'IL','Ind.':'IN','Tenn.':'TN',Texas:'TX','Okla.':'OK','Va.':'VA',Iowa:'IA','Ariz.':'AZ','Ark.':'AR'})[rawState];const named=prior.filter(m=>normalize(m.name)===normalize(aliases[label]||label)&&(!state||m.state===state));if(named.length!==1){unmatched.push({label,...source,reason:named.length?'AMBIGUOUS_CAMPUS':'NO_EXACT_MATCH'});return;}matches.push({name:named[0].name,state:named[0].state,label,...source});}
for(const [folder,file]of [['inventory-supplement','captures.json'],['extra-sources','captures.json']])for(const r of read(folder+'/'+file)){
 const c=r.capture;if(c.status!==200)continue;const sourcePath=folder+'/'+c.file,q=ch.load(fs.readFileSync(path.join(root,sourcePath),'utf8'));
 const host=prior.find(m=>m.name===r.name&&m.state===r.state);
 if(host&&(/2027|2026-27/.test(c.title)&&/baseball.*(?:schedule|roster)/i.test(c.title)))matches.push({name:host.name,state:host.state,label:r.name,sourcePath,sourceUrl:c.finalUrl,kind:'CURRENT_OFFICIAL_BASEBALL_PAGE'});
 if(r.key==='morris-varsity'){assert(/VARSITY TEAMS:\s*Basketball, Softball, Baseball/i.test(c.text));matches.push({name:r.name,state:r.state,label:r.name,sourcePath,sourceUrl:c.finalUrl,kind:'INSTITUTION_EXPLICIT_VARSITY_BASEBALL_STATEMENT'});}
 if(!/2027|2026-27/.test(c.title)||!/baseball.*schedule/i.test(c.title))continue;
 for(const table of q('table').toArray()){
  const headers=q(table).find('thead tr').last().children('th,td').toArray().map(e=>clean(q(e).text())),oi=headers.findIndex(h=>/^opponent$/i.test(h)),di=headers.findIndex(h=>/^date$/i.test(h));if(oi<0||di<0)continue;
  for(const tr of q(table).find('tbody tr').toArray()){
   const cells=q(tr).children('th,td').toArray(),label=clean(q(cells[oi]).text()).replace(/\s*\(DH\)$/i,''),date=clean(q(cells[di]).text());if(!/2027/.test(date)||/\bjv\b|reserve|club|scrimmage|exhibition/i.test(clean(q(tr).text())))continue;
   match(label,{date,sourcePath,sourceUrl:c.finalUrl,kind:'DATED_2027_OPPONENT_ROW'});
  }
 }
 for(const element of q('.sidearm-schedule-game').toArray()){const e=q(element),label=clean(e.find('.sidearm-schedule-game-opponent-name').first().text());if(!label||/\bjv\b|reserve|club|scrimmage|exhibition/i.test(clean(e.text())))continue;match(label,{date:null,sourcePath,sourceUrl:c.finalUrl,kind:'OPPONENT_ON_EXPLICIT_2027_BASEBALL_SCHEDULE'});}
}
const reviewed=prior.map(r=>{const extra=matches.filter(m=>m.name===r.name&&m.state===r.state);return{...r,additionalCurrentEvidence:extra,reviewDisposition:extra.length?'SUPPORTED_CURRENT_BASEBALL_PRIMARY_EVIDENCE':r.reviewDisposition};});
const holds=reviewed.filter(r=>r.currentStoredCampus?.division==='NAIA'&&/HELD_SOURCE_OR_SPORT_MENU_INCOMPLETE|BASEBALL_NAVIGATION_PUBLISHED_PAGE_VERIFICATION_HELD/.test(r.reviewDisposition));
const summary={checkedAtUtc:new Date().toISOString(),databaseAccess:false,databaseWrites:0,memberRows:233,additionalMemberCampusesSupported:new Set(matches.map(m=>m.name+'|'+m.state)).size,remainingStoredSourceOrNavigationHolds:holds.length,remainingHolds:holds.map(r=>({name:r.name,state:r.state})),nationalBaseballInventoryVerified:false};
for(const[file,value]of Object.entries({'inventory-overlay-final.json':reviewed,'inventory-overlay-summary-final.json':summary,'unmatched-supplement-opponents-final.json':unmatched}))fs.writeFileSync(path.join(root,file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(summary,null,2));
