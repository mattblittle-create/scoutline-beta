'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {ch,clean}=require('../naia-inventory-review-20261111/source-utils.cjs');
const root=__dirname,prior=path.resolve(root,'../naia-inventory-review-20261111'),follow=path.resolve(root,'../naia-inventory-followup-20261111');
const inputs=new Set([__filename,path.join(prior,'source-utils.cjs')]);
function read(file){inputs.add(file);return JSON.parse(fs.readFileSync(file));}
function html(file){inputs.add(file);return fs.readFileSync(file,'utf8');}
const members=read(path.join(prior,'sponsorship-review/all-member-dispositions.json'));
const snapshot=read(path.join(follow,'closeout-audit-2026-11-11T15-11-06-341Z-2f16fdf1/fresh-read-only-snapshot.json'));
const newSources=read(path.join(root,'sources/captures.json')),newStandings=read(path.join(root,'sources/current-standings-captures.json'));
const oldStandings=read(path.join(prior,'published-link-recovery/research.json'));
const normalize=s=>s.toLowerCase().replace(/\([^)]*\)/g,' ').replace(/\bst\.?\b/g,'saint').replace(/&/g,' and ').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w&&!['university','college','univ','the','of','at'].includes(w)).sort().join(' ');
const configurations=[['GPAC',11],['HBCUAC',13],['Crossroads',10],['KCAC',13]];
const teamAliases={'Northwestern (Iowa)':'Northwestern College','Saint Francis (IN)':'Saint Francis, University','Southern University at New Orleans (LA)':'Southern University at New Orleans','Wiley (TX)':'Wiley College'};
const current=[];
for(const [conference,expected]of configurations){
  const fresh=newStandings.find(r=>r.key===conference),old=oldStandings.find(r=>r.kind==='standings'&&r.key===conference),source=fresh||old;
  assert.equal(source.capture.status,200);assert(/2027|2026-27/.test(source.capture.title||source.capture.pageTitle));
  const file=fresh?path.join(root,'sources',source.capture.file):path.join(prior,'published-link-recovery',source.capture.file),q=ch.load(html(file));
  const rows=q('table tbody tr').toArray().map(tr=>{const cell=q(tr).children('th,td').first(),label=clean(cell.text());return{label,scheduleLink:cell.find('a[href]').first().attr('href')};}).filter(r=>r.label&&r.scheduleLink);
  assert.equal(rows.length,expected);
  for(const row of rows){
    const state=row.label.match(/\((IA|Iowa|SD|NE|AL|MS|OH|LA|AR|TX|IN|MI)\)/)?.[1],stateCode=state==='Iowa'?'IA':state;
    const named=members.filter(m=>normalize(m.name)===normalize(teamAliases[row.label]||row.label)&&(!stateCode||m.state===stateCode));
    const member=named.length>1?named.filter(m=>m.conference===conference):named;
    assert.equal(member.length,1,'Campus match requires explicit review: '+conference+' / '+row.label);
    if(stateCode)assert.equal(member[0].state,stateCode);
    current.push({name:member[0].name,state:member[0].state,conference,membershipListConference:member[0].conference,conferenceDiffersFromAllSportMembershipList:member[0].conference!==conference,label:row.label,season:'2026-27 / spring 2027',sourceUrl:source.capture.finalUrl,sourcePath:path.relative(root,file).replace(/\\/g,'/'),publishedScheduleUrl:new URL(row.scheduleLink,source.capture.finalUrl).href,claim:'Listed in official conference baseball standings; roster and schedule contents not independently verified. Conference differences may reflect sport affiliation and require review before any field update.'});
  }
}
assert.equal(current.length,47);assert.equal(new Set(current.map(r=>r.name+'|'+r.state)).size,47);
const overrides=[
 {name:'Fisk University',state:'TN',key:'fisk-conference',claim:'Conference school profile lists sports offered without baseball.',status:'NO_BASEBALL_LISTED_IN_PRIMARY_SPORT_LIST',pattern:/Sports Offered\s*Basketball, Cross Country, Golf, Gymnastics/},
 {name:'Paul Quinn College',state:'TX',key:'paul-quinn-institution',claim:'Institution athletics page lists basketball, soccer, volleyball and track/cross country without baseball; coach biographies contain historical material.',status:'NO_BASEBALL_LISTED_IN_PRIMARY_SPORT_LIST',pattern:/Athletics Women.s Basketball.*Women.s Soccer.*Women.s Volleyball.*Men.s Basketball.*Men.s Soccer.*Track & Field \/ Cross Country/},
 {name:'Life Pacific University',state:'CA',key:'life-pacific-student-life',claim:'Current institution page describes six NAIA teams, including basketball, soccer and beach volleyball; historical 2025-26 conference awards list the six sports without baseball. Complete current-season sport list remains unconfirmed.',status:'LIMITED_SPORT_LIST_EVIDENCE_CURRENT_SEASON_HELD',pattern:/6 NAIA intercollegiate teams/},
 {name:'Montana State University-North',state:'MT',key:'msu-northern-facts',claim:'Direct institution facts-page capture failed. Search-index snippets and old handbooks are insufficient for a current-season conclusion; athletics homepage returns a splash loop.',status:'HELD_CURRENT_PRIMARY_SPORT_LIST_UNCAPTURED'}
];
for(const r of overrides){const s=newSources.find(s=>s.key===r.key);assert(s);if(r.pattern){assert.equal(s.capture.status,200);assert(r.pattern.test(s.capture.text));}r.sourceUrl=s.capture.finalUrl||s.capture.url;r.sourcePath=s.capture.file?'sources/'+s.capture.file:null;if(r.sourcePath)html(path.join(root,r.sourcePath));delete r.pattern;}
const memberAliases={'Georgia Southern East Georgia Campus':'Georgia Southern University – East Georgia Campus','Science and Arts of Ok, University of':'University of Science and Arts of Oklahoma','Oklahoma Panhandle State Univ':'Oklahoma Panhandle State University','Loyola University':'Loyola University New Orleans','West Virginia University Tech.':'West Virginia University Institute of Technology','Rochester Christian University':'Rochester University'};
const followEvidence=read(path.join(follow,'candidate.json'));
const priorResolved=followEvidence.remainingHolds.newlyResolvedAsNoBaseballInPublishedSportMenu;
const scheduleEvidence=read(path.join(root,'conference-schedules/season-baseball-evidence.json'));
const eventAliases={'IU Kokomo':'Indiana University Kokomo','Mid America Christian University':'Mid-America Christian University','OUAZ':'Ottawa University - Arizona','Indiana South Bend':'Indiana University South Bend','Northwestern (Iowa)':'Northwestern College'};
const scheduleMatches=[],unmatched=[];
for(const e of scheduleEvidence){
  if(/tournament|classic|^TBD$/i.test(e.label)){unmatched.push({...e,reason:'EVENT_PLACEHOLDER_NOT_TEAM'});continue;}
  const raw=e.label.match(/\(([^)]+)\)/)?.[1],stateAliases={Iowa:'IA','Ala.':'AL','Mich.':'MI','Kan.':'KS','Fla.':'FL'},state=stateAliases[raw]||raw;
  const found=members.filter(m=>normalize(m.name)===normalize(eventAliases[e.label]||e.label)&&(!state||m.state===state));
  if(found.length!==1){unmatched.push({...e,reason:found.length?'AMBIGUOUS_CAMPUS':'NO_EXACT_MEMBER_NAME_STATE_MATCH'});continue;}
  scheduleMatches.push({...e,memberName:found[0].name,memberState:found[0].state});
}
const rows=members.map(m=>{
  const stateKey=s=>{const key=s.toUpperCase().replace(/[^A-Z]/g,'');return({MICH:'MI',ARK:'AR',NEB:'NE',TENN:'TN',IND:'IN',FLA:'FL',IDAHO:'ID',CALIF:'CA',KAN:'KS',ALA:'AL',MISS:'MS'})[key]||key;};
  const c=m.stored?snapshot.schools.find(c=>c.id===m.stored.collegeId):snapshot.schools.find(c=>stateKey(c.state||'')===m.state&&normalize(c.name)===normalize(memberAliases[m.name]||m.name));
  if(m.stored){assert(c);assert.equal(stateKey(c.state||''),m.state);}
  const standing=current.find(r=>r.name===m.name&&r.state===m.state),override=overrides.find(r=>r.name===m.name&&r.state===m.state);
  const schedule=scheduleMatches.filter(e=>e.memberName===m.name&&e.memberState===m.state);
  const resolved=priorResolved.find(r=>(m.name==='Saint Mary, College of'?'College of Saint Mary':m.name)===r.name&&m.state===r.state);
  let status=standing?'SUPPORTED_2027_CONFERENCE_BASEBALL_LISTING':override?.status||m.disposition;
  if(schedule.length&&!standing)status='SUPPORTED_OPPONENT_ON_OFFICIAL_2027_BASEBALL_SCHEDULE';
  if(resolved){html(path.resolve(follow,resolved.source));status='NO_BASEBALL_LISTED_IN_PRIOR_PRIMARY_SPORT_REVIEW';}
  if(['Oklahoma Panhandle State Univ','Science and Arts of Ok, University of'].includes(m.name))status='SUPPORTED_2027_OPPONENT_CONFERENCE_SCHEDULE_HOMEPAGE_HELD';
  return{name:m.name,state:m.state,conference:m.conference,currentStoredCampus:c?{collegeId:c.id,slug:c.slug,programId:c.baseballProgram?.id||null,division:c.baseballProgram?.division||null}:null,priorDisposition:m.disposition,reviewDisposition:status,currentSeasonEvidence:standing||null,scheduleEvidence:schedule,sportListReview:override||resolved||null,priorBaseballProofs:m.baseballProofs,limitations:['No database verification promotion or field changes.','A published menu without baseball is not absolute proof of absence.']};
});
assert.equal(rows.length,233);
const supported=rows.filter(r=>r.currentStoredCampus?.division==='NAIA');
const heldStored=rows.filter(r=>r.currentStoredCampus?.division==='NAIA'&&r.reviewDisposition.startsWith('HELD'));
const newlySupported=rows.filter(r=>r.priorDisposition==='HELD_SOURCE_OR_SPORT_MENU_INCOMPLETE'&&/^SUPPORTED/.test(r.reviewDisposition));
assert.equal(supported.length,187);
const report={checkedAtUtc:new Date().toISOString(),databaseAccess:false,databaseWrites:0,allSportMemberRows:233,storedNAIAPrograms:194,memberRowsMatchedToStoredNAIA:supported.length,current2027ConferenceBaseballTeams:47,public2027ConferenceSchedulesCaptured:47,membersWith2027StandingsOrScheduleEvidence:rows.filter(r=>r.currentSeasonEvidence||r.scheduleEvidence.length).length,previousSourceHoldsNowSupported:newlySupported.length,remainingStoredMemberSourceHolds:heldStored.length,conferenceDifferences:current.filter(r=>r.conferenceDiffersFromAllSportMembershipList),otherFourReview:overrides,dispositions:rows.reduce((a,r)=>(a[r.reviewDisposition]=(a[r.reviewDisposition]||0)+1,a),{}),nationalBaseballInventoryVerified:false,naiaEnrichmentComplete:false,newImportsProposed:0,recordDeletionsProposed:0,recordMergesProposed:0,limitations:['The official membership list covers all sports, not just baseball.','Current conference listings do not independently verify individual rosters, coaches or full schedules.','Prior official baseball-page evidence may be season-unspecified.','Seven stale/duplicate stored records remain separately held.','Life Pacific and Montana State–Northern retain current-season evidence holds.']};
for(const file of fs.readdirSync(path.join(root,'sources')))if(file.endsWith('.html'))html(path.join(root,'sources',file));
for(const file of fs.readdirSync(path.join(root,'conference-schedules')))if(file.endsWith('.html'))html(path.join(root,'conference-schedules',file));
for(const script of ['collect-sources.cjs','recover-current-standings.cjs','collect-conference-schedules.cjs','extract-schedule-evidence.cjs'])inputs.add(path.join(root,script));
for(const m of members)for(const proof of m.baseballProofs)if(proof.sourcePath)html(path.resolve(prior,proof.sourcePath));
const out=path.join(root,'review-verified');fs.mkdirSync(out,{recursive:true});for(const[file,value]of Object.entries({'report.json':report,'all-member-review.json':rows,'current-2027-conference-teams.json':current,'remaining-stored-member-source-holds.json':heldStored,'newly-supported-source-holds.json':newlySupported,'unmatched-schedule-evidence.json':unmatched}))fs.writeFileSync(path.join(out,file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const hashes=Object.fromEntries([...inputs].sort().map(f=>[path.relative(root,f).replace(/\\/g,'/'),crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));fs.writeFileSync(path.join(out,'input-manifest.json'),JSON.stringify({hashes},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report,null,2));
