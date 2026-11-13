'use strict';
const assert=require('assert/strict'),{ch,clean}=require('../naia-inventory-review-20261111/source-utils.cjs');
const norm=s=>clean(s).toLowerCase().replace(/[^a-z0-9]/g,'');
const absolute=(s,base)=>{if(!s)return null;try{const u=new URL(s,base);return /^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}};
function seasonGate(title,headings,url,kind){
 const label=[title,...headings.filter(h=>new RegExp('baseball.*'+kind,'i').test(h))].join(' | ');
 if(/\b(jv|junior varsity|reserve|club|developmental|ncba)\b/i.test(label+' '+url))return false;
 if(kind==='roster')return /(?:2027|2026[-–]27|2026[-–]2027).*baseball.*roster|baseball.*(?:2027|2026[-–]27|2026[-–]2027).*roster/i.test(label)&&!/(?:202[0-5]|2026(?![-–]27|[-–]2027)).{0,15}baseball.*roster/i.test(label);
 if(kind==='coaches')return (/baseball.*coach|coach.*baseball/i.test(label)||(/\/(?:baseball|bsb)\/coaches(?:\/|$)/i.test(url)&&/baseball/i.test(title)))&&!/\/(?:202[0-5](?:-\d\d)?|2025-26)\//.test(url)&&!/202[0-6] (?:baseball )?coaching staff/i.test(label);
 return /(?:2027|2026[-–]27).*baseball.*schedule|baseball.*(?:2027|2026[-–]27).*schedule/i.test(label);
}
function primaryPosition(raw){if(!raw)return null;const s=raw.toUpperCase().trim();const first=s.split(/[\/,;&]|\s+-\s+/)[0].trim();return({P:'P',RHP:'RHP',LHP:'LHP',C:'C',CATCHER:'C','1B':'1B','2B':'2B','3B':'3B',SS:'SS',IF:'INF',INF:'INF',INFIELD:'INF',MIF:'INF',CIF:'INF',OF:'OF',OUTFIELD:'OF',LF:'OF',CF:'OF',RF:'OF',UT:'UTIL',UTL:'UTIL',UTIL:'UTIL',UTILITY:'UTIL',DH:'DH',PH:'PH',PR:'PR',RHPINF:'RHP'})[first]||null;}
function classBucket(raw){if(!raw)return null;const s=raw.toLowerCase().replace(/^r(?:edshirt)?[-.\s]*/,'').replace(/[^a-z]/g,'');return({fr:'FRESHMAN',freshman:'FRESHMAN',freshmen:'FRESHMAN',so:'SOPHOMORE',sophomore:'SOPHOMORE',jr:'JUNIOR',junior:'JUNIOR',sr:'SENIOR',senior:'SENIOR',gr:'GRADUATE',grad:'GRADUATE',graduate:'GRADUATE',graduatestudent:'GRADUATE',gs:'GRADUATE'})[s]||null;}
function height(raw){const m=clean(raw).match(/^([4-7])\s*[-'’′]\s*(\d{1,2})(?:["”″])?$/);return m&&+m[2]<12?+m[1]*12 + +m[2]:null;}
function weight(raw){const m=clean(raw).match(/^(\d{2,3})(?:\s*(?:lbs?\.?|pounds))?$/i);return m&&+m[1]>=90&&+m[1]<=400?+m[1]:null;}
const optional=s=>{const x=clean(s);return !x||/^(?:-|—|–|n\/a)$/i.test(x)?null:x;};
function tableInfo(q,table){const labels={'col-coaches-fullname':'Name','col-coaches-staff_title':'Title','col-coaches-staff_email':'Email','col-coaches-staff_phone':'Phone'};const headers=q(table).find('thead tr').last().children('th,td').toArray().map(e=>clean(q(e).text())||labels[q(e).attr('id')]||'');return{headers,index:regex=>headers.findIndex(h=>regex.test(h))};}
function roster(html,url,title,headings){
 assert(seasonGate(title,headings,url,'roster'),'Current varsity roster season not established');const q=ch.load(html),players=[],diagnostics=[],nameNormalizations=[];
 for(const table of q('table').toArray()){
  const info=tableInfo(q,table),nameIndex=info.index(/^(?:full )?name$/i);if(nameIndex<0||info.index(/^title$/i)>=0)continue;
  const pos=info.index(/^(?:pos\.?|position)$/i),cl=info.index(/^(?:cl\.?|yr\.?|year|academic year|class|eligibility)$/i),ht=info.index(/^(?:ht\.?|height)$/i),wt=info.index(/^(?:wt\.?|weight)$/i);
  if(pos<0&&!/roster/i.test(q(table).attr('class')||''))continue;
  for(const tr of q(table).find('tbody tr').toArray()){
   const cells=q(tr).children('th,td').toArray();if(cells.length!==info.headers.length){diagnostics.push({reason:'COLUMN_COUNT_MISMATCH',row:clean(q(tr).text())});continue;}
   const nameCell=q(cells[nameIndex]),a=nameCell.find('a[href]').filter((_,e)=>/\/(?:roster|bios)\//i.test(q(e).attr('href')||'')&&!/\/coaches\/|\/staff\//i.test(q(e).attr('href')||'')).first();
   const splitNames=info.headers.filter(h=>/^name$/i.test(h)).length===2&&q(tr).find('.player_firstname,.player_lastname').length===2;
   const name=splitNames?clean(q(tr).find('.player_firstname').text()+' '+q(tr).find('.player_lastname').text()):clean(a.length?a.text():nameCell.clone().find('img,script,style,.d-none,.visually-hidden').remove().end().text());
   if(!name||/\b(?:coach|manager|trainer|TBA|TBD)\b/i.test(name)||name.length>90||!/[a-z]/i.test(name)){diagnostics.push({reason:'NAME_NOT_PLAYER',row:clean(q(tr).text())});continue;}
   const cell=i=>i<0?null:optional(q(cells[i]).text()),positionRaw=cell(pos),classYearRaw=cell(cl),heightRaw=cell(ht),weightRaw=cell(wt);
   const profile=absolute(a.attr('href'),url);if(profile)assert(!/\/(?:202[0-5](?:-\d\d)?|2026)\/(?:bios|roster)\//.test(profile),'Older-season profile link held');
   players.push({season:'2027',name,positionRaw,primaryPosition:primaryPosition(positionRaw),classYearRaw,classBucket:classBucket(classYearRaw),heightRaw,heightInches:height(heightRaw),weightRaw,weightLb:weight(weightRaw),rosterProfileUrl:profile,sourceUrl:url,sourceType:'OFFICIAL_ATHLETICS',confidence:'HIGH',verifiedAt:null});
  }
 }
 if(!players.length)for(const card of q('.player-card.card').toArray()){
  const e=q(card),anchor=e.find('.bio-card-name-and-year a[href],a.full-bio').first(),first=clean(e.find('.card-front .firstname').first().text()),last=clean(e.find('.card-front .lastname').first().text());let name=clean(first+' '+last);if(!name||!first||!last)continue;
  const values={};e.find('.bio-data li').each((_,li)=>{const label=clean(q(li).find('span').first().text()).replace(/:$/,'').toLowerCase(),copy=q(li).clone();copy.find('span').first().remove();values[label]=optional(copy.text());});
  const positionRaw=values.position||null,classYearRaw=values.class||null,heightRaw=values.height||null,weightRaw=values.weight||null,profile=absolute(anchor.attr('href'),url);assert(profile&&/\/2026-27\/bios\//.test(profile),'Current card profile season not established');
  if(classYearRaw&&name.endsWith(' - '+classYearRaw)){const before=name;name=name.slice(0,-(' - '+classYearRaw).length);nameNormalizations.push({before,after:name,publishedClass:classYearRaw,reason:'EXPLICIT_CLASS_SUFFIX_SEPARATED_FROM_NAME'});}
  players.push({season:'2027',name,positionRaw,primaryPosition:primaryPosition(positionRaw),classYearRaw,classBucket:classBucket(classYearRaw),heightRaw,heightInches:height(heightRaw),weightRaw,weightLb:weight(weightRaw),rosterProfileUrl:profile,sourceUrl:url,sourceType:'OFFICIAL_ATHLETICS',confidence:'HIGH',verifiedAt:null});
 }
 if(!players.length)for(const card of q('.roster-athlete').toArray()){
  const e=q(card),a=e.find('.roster-athlete-info a.name').first(),name=clean(a.text());if(!name)continue;const positionRaw=optional(e.find('.position').first().text()),classYearRaw=optional(e.find('.details b').first().text());players.push({season:'2027',name,positionRaw,primaryPosition:primaryPosition(positionRaw),classYearRaw,classBucket:classBucket(classYearRaw),heightRaw:null,heightInches:null,weightRaw:null,weightLb:null,rosterProfileUrl:absolute(a.attr('href'),url),sourceUrl:url,sourceType:'OFFICIAL_ATHLETICS',confidence:'HIGH',verifiedAt:null});
 }
 const identities=new Map();for(const p of players){const key=(p.rosterProfileUrl||'name:'+p.name)+'|'+p.name;if(identities.has(key))assert.deepStrictEqual(p,identities.get(key),'Conflicting duplicate roster row');else identities.set(key,p);}const unique=[...identities.values()];
 assert(unique.length>=10,'Roster empty, partial or unresolved format');assert.equal(diagnostics.length,0,'Roster rows need manual review');
 const profile=new Set(),names=new Map();for(const p of unique){if(p.rosterProfileUrl){assert(!profile.has(p.rosterProfileUrl),'Conflicting published profile identity');profile.add(p.rosterProfileUrl);}names.set(p.name,(names.get(p.name)||0)+1);}for(const p of unique)assert(names.get(p.name)===1||p.rosterProfileUrl,'Same-name roster entries require profiles');
 const native=q('.sidearm-roster-player').toArray().filter(e=>q(e).find('.sidearm-roster-player-name').length);if(native.length)assert.equal(unique.length,native.length,'Native cards and table disagree');
 return{players:unique,sourceRows:players.length,nativeCards:native.length,headersReviewed:true,nameNormalizations};
}
function isHead(title){return title.split(/[/;&]/).some(part=>!/emeritus|former|\bjv\b|junior varsity|development|prospect|reserve|strength|conditioning|operations|facilities|softball|basketball|soccer|football|wrestling/i.test(part)&&/^\s*(?:(?:interim\s+)?(?:co[- ]?)?head\s+(?:baseball\s+)?coach\b|baseball\s+(?:co[- ]?)?head\s+coach\b)/i.test(part));}
function isVarsityRole(role){return role.split(/[/;&]/).some(part=>!/manager|trainer|strength|conditioning|operations|chaplain|transformational|consultant|support|emeritus|former|memoriam|prospect|development|\bjv\b|junior varsity|reserve|student assistant(?! coach)/i.test(part)&&(/coach|grad(?:uate)? assistant/i.test(part)||/^\s*(?:pitching|hitting|recruiting|catching|infield|outfield) coordinator\s*$/i.test(part)||/^\s*assistant baseball\s*$/i.test(part)));}
function coaches(html,url,title,headings){
 assert(!headings.some(h=>/\b(?:202[0-5]|2025-26)\s+baseball\s+coaching staff/i.test(h)),'Explicit older-season staff list held');
 assert(seasonGate(title,headings,url,'coaches')||(seasonGate(title,headings,url,'roster')&&headings.some(h=>/baseball coaching staff/i.test(h))),'Current baseball coaching directory not established');const q=ch.load(html),rows=[],excluded=[];let section='';
 q('h1,h2,h3,table').each((_,element)=>{
  if(element.tagName!=='table'){section=clean(q(element).text());return;}
  const info=tableInfo(q,element),ni=info.index(/^(?:full )?name$/i),ti=info.index(/^(?:title|position)$/i);if(ni<0||ti<0)return;
  const excludedSection=/support|jv|junior varsity|developmental|reserve|staff emeriti/i.test(section);
  const ei=info.index(/^e[- ]?mail(?: address)?$/i),pi=info.index(/^phone(?: number)?$/i);
  for(const tr of q(element).find('tbody tr').toArray()){
   const cells=q(tr).children('th,td').toArray();if(cells.length!==info.headers.length){excluded.push({reason:'COLUMN_COUNT_MISMATCH',text:clean(q(tr).text())});continue;}
   const nameCell=q(cells[ni]),name=clean(nameCell.find('a').first().text()||nameCell.text()),role=clean(q(cells[ti]).text());
   if(excludedSection||!isVarsityRole(role)){excluded.push({name,title:role,section,reason:'NONCOACH_OR_SUPPORT_SCOPE'});continue;}
   if(!name||name.length>90||!/\s/.test(name)){excluded.push({name,title:role,reason:'NAME_REQUIRES_REVIEW'});continue;}
   let email=ei<0?null:optional(q(cells[ei]).find('a[href^="mailto:"]').first().attr('href')?.replace(/^mailto:/i,'').split('?')[0]||q(cells[ei]).text());if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){excluded.push({name,title:role,reason:'EMAIL_REQUIRES_REVIEW'});email=null;}
   const phone=pi<0?null:optional(q(cells[pi]).find('a[href^="tel:"]').first().text()||q(cells[pi]).find('span').first().text()||q(cells[pi]).text());
   let bio=absolute(nameCell.find('a[href]').first().attr('href'),url);if(bio&&/\/(?:202[0-5](?:-\d\d)?|2026)\/(?:coach|coaches|bios)\//.test(bio)){excluded.push({name,title:role,reason:'OLDER_SEASON_BIO_REFERENCE_HELD',url:bio});bio=null;}
   const social=host=>q(tr).find('a[href]').toArray().map(e=>absolute(q(e).attr('href'),url)).filter(Boolean).filter(s=>host.test(s)&&!/intent|share/i.test(s));
   rows.push({name,title:role,email,phone,bioUrl:bio,contactUrl:url,headshotUrl:null,xUrl:social(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i)[0]||null,instagramUrl:social(/^https?:\/\/(?:www\.)?instagram\.com\//i)[0]||null,linkedinUrl:null,isHeadCoach:isHead(role),importKey:norm(name)+'|'+(email||'').toLowerCase(),dataSource:'DOM_ENRICHMENT',reviewStatus:'NEEDS_REVIEW',isActive:true,lastSeenAt:null,sourceUrl:url,manuallyVerifiedAt:null,claimedByUserId:null,claimedAt:null});
  }
 });
 if(!rows.length){const cards=q('.coaches-content .card,.coaches-headshot-container .card,.staff-member').toArray(),escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]),synthetic=[];for(const card of cards){const e=q(card),a=e.find('.card-title a[href],a.card-title[href]').first(),copy=a.clone();copy.find('.jersey-number').remove();const name=clean(copy.text()||e.find('.staff-member-name').text()),role=clean(e.find('p.card-text,.staff-member-title').first().text()),email=e.find('a[href^="mailto:"]').first().attr('href')?.replace(/^mailto:/i,'').split('?')[0]||'',phone=e.find('.fa-phone').parent().text();if(!name||!role||(!e.hasClass('staff-member')&&!absolute(a.attr('href'),url)))continue;const bio=absolute(a.attr('href'),url);synthetic.push('<tr><td>'+(bio?'<a href="'+escape(bio)+'">'+escape(name)+'</a>':escape(name))+'</td><td>'+escape(role)+'</td><td>'+escape(email)+'</td><td>'+escape(clean(phone))+'</td></tr>');}if(synthetic.length)return coaches('<table><thead><tr><th>Name</th><th>Title</th><th>Email</th><th>Phone</th></tr></thead><tbody>'+synthetic.join('')+'</tbody></table>',url,title,headings);}
 const identities=new Map();for(const r of rows){if(identities.has(r.importKey)){const previous=identities.get(r.importKey);if(previous.bioUrl!==r.bioUrl){assert.deepStrictEqual({...previous,bioUrl:null},{...r,bioUrl:null},'Conflicting duplicate coaching facts');excluded.push({name:r.name,title:r.title,reason:'MULTIPLE_PUBLISHED_BIO_URLS_REFERENCE_HELD',urls:[previous.bioUrl,r.bioUrl]});previous.bioUrl=null;}else assert.deepStrictEqual(r,previous,'Conflicting duplicate coaching row');}else identities.set(r.importKey,r);}const unique=[...identities.values()];assert(unique.length>0,'No supported coaching rows');assert(unique.filter(r=>r.isHeadCoach).length<=2,'Head-coach mapping requires manual review');return{coaches:unique,excluded};
}
function snapshot(players,url){const completeClass=players.every(p=>p.classBucket),count=fn=>players.filter(fn).length;const rawParts=p=>(p.positionRaw||'').toUpperCase().split(/[\/,;&]/).map(s=>s.trim());const completePos=players.every(p=>p.primaryPosition&&rawParts(p).every(x=>/^(?:RHP|LHP|P|C|1B|2B|3B|SS|IF|INF|MIF|CIF|OF|LF|CF|RF|UT|UTL|UTIL|DH|PH|PR)$/.test(x)));
 const isPitcher=p=>rawParts(p).some(x=>/^(?:RHP|LHP|P)$/.test(x)),isPosition=p=>rawParts(p).some(x=>/^(?:C|1B|2B|3B|SS|IF|INF|MIF|CIF|OF|LF|CF|RF|UT|UTL|UTIL|DH)$/.test(x));
 return{season:'2027',rosterSize:players.length,freshmen:completeClass?count(p=>p.classBucket==='FRESHMAN'):null,sophomores:completeClass?count(p=>p.classBucket==='SOPHOMORE'):null,juniors:completeClass?count(p=>p.classBucket==='JUNIOR'):null,seniors:completeClass?count(p=>p.classBucket==='SENIOR'):null,graduateStudents:completeClass?count(p=>p.classBucket==='GRADUATE'):null,pitchers:completePos?count(isPitcher):null,catchers:completePos?count(p=>rawParts(p).includes('C')):null,infielders:completePos?count(p=>rawParts(p).some(x=>/^(?:1B|2B|3B|SS|IF|INF|MIF|CIF)$/.test(x))):null,outfielders:completePos?count(p=>rawParts(p).some(x=>/^(?:OF|LF|CF|RF)$/.test(x))):null,twoWayPlayers:completePos?count(p=>isPitcher(p)&&isPosition(p)):null,leftHandedPitchers:completePos&&players.filter(isPitcher).every(p=>!rawParts(p).includes('P'))?count(p=>rawParts(p).includes('LHP')):null,rightHandedPitchers:completePos&&players.filter(isPitcher).every(p=>!rawParts(p).includes('P'))?count(p=>rawParts(p).includes('RHP')):null,sourceUrl:url,sourceType:'OFFICIAL_ATHLETICS',confidence:'HIGH',verifiedAt:null};}
module.exports={seasonGate,primaryPosition,classBucket,height,weight,roster,coaches,isHead,isVarsityRole,snapshot};
