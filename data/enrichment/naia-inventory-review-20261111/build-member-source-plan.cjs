'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{components,ch}=require('./source-utils.cjs');
const root=__dirname,base=path.resolve(root,'../naia-baseline-20261111'),read=(p)=>JSON.parse(fs.readFileSync(p));
const members=read(path.join(base,'official-inventory-sources/member-institutions-2026-27.json')),maps=read(path.join(base,'official-inventory-sources/school-map-institutions.json')),prior=read(path.join(base,'baseline-closeout/stored-naia-member-reconciliation.json')),confs=read(path.join(root,'conference-sources/research.json'));
const normalize=s=>s.toLowerCase().replace(/\([^)]*\)/g,' ').replace(/\bst\.?\b/g,'saint').replace(/&/g,' and ').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w&&!['university','college','univ','the','of','at'].includes(w)).sort().join(' ');
const confNames={SSAC:'Southern States Athletic Conference',WHAC:'Wolverine-Hoosier Athletic Conference',GSAC:'Great Southwest Athletic Conference',CAC:'Continental Athletic Conference (Independents)',TSC:'The Sun Conference',HAAC:'Heart of America Athletic Conference',KCAC:'Kansas Collegiate Athletic Conference',Crossroads:'Crossroads League','Mid-South':'Mid-South Conference',Frontier:'Frontier Conference',AAC:'Appalachian Athletic Conference','Am. Midwest':'American Midwest Conference',Sooner:'Sooner Athletic Conference',GPAC:'Great Plains Athletic Conference',Cascade:'Cascade Collegiate Conference',CCAC:'Chicagoland Collegiate Athletic Conference',Chicagoland:'Chicagoland Collegiate Athletic Conference',RSC:'River States Conference','Red River':'Red River Athletic Conference',HBCUAC:'HBCU Athletic Conference','Cal Pac':'California Pacific Conference',SUN:'The Sun Conference'};
const aliases={
'Georgia Southern East Georgia Campus':'Georgia Southern East Georgia(Swainsboro)',
'Montana State University-North':'Montana State University-Northern',
'Montana Tech University':'Montana Technological University',
'Science and Arts of Ok, University of':'University of Science and Arts of Oklahoma',
'Savannah College of Art and Design':'SCAD Savannah',
'West Virginia University Tech.':'West Virginia University Institute of Technology',
'Rochester Christian University':'Rochester University',
'Loyola University':'Loyola University New Orleans',
'Xavier University':'Xavier University of Louisiana',
'Oklahoma Panhandle State Univ':'Oklahoma Panhandle State University'
};
const hazards={9823:'Prescott entry leads to Daytona Beach',10096:'WVU Tech entry leads to West Virginia University',10641:'Columbia SC entry leads to Columbia MO',10664:'Union Commonwealth KY entry leads to Union NY',10691:'Governors State entry leads to Delta State',10692:'Holy Cross IN entry leads to Holy Cross MA',10694:'IU South Bend entry leads to IU Southeast',10699:'Saint Francis IL entry leads to St. Lawrence NY',10715:'Saint Francis IN entry leads to St. Lawrence NY',10769:'York NE entry leads to York Canada',10774:'Dickinson State entry leads to Dakota State',10775:'Mayville State entry leads to Minnesota State Mankato',10783:'Texas A&M San Antonio entry leads to South Dakota State',10805:'Loyola New Orleans entry leads to Loyola Maryland',10822:'Rochester Christian MI entry leads to Rochester NY',10690:'Walla Walla entry uses Western Washington University domain'};
const conferenceEntries=[];
for(const c of confs){const file=path.join(root,'conference-sources',c.home.file),html=fs.readFileSync(file,'utf8'),$=ch.load(html);
for(const item of components(html).filter(x=>x.type==='members').flatMap(c=>Array.isArray(c.data)?c.data:[]))if(item.athletics_website)conferenceEntries.push({conference:c.conference,name:item.title,url:item.athletics_website,location:item.location,sourceFile:'conference-sources/'+c.home.file,kind:'PUBLISHED_MEMBER_JSON'});
$('a[href]').each((_,e)=>{const a=$(e),img=a.find('img'),url=a.attr('href'),name=img.attr('alt')||a.attr('title');if(name&&/^https?:\/\//i.test(url))conferenceEntries.push({conference:c.conference,name,url,sourceFile:'conference-sources/'+c.home.file,kind:'PUBLISHED_LOGO_LINK'});});}
const unique=[...new Map(conferenceEntries.map(r=>[r.conference+'|'+r.name+'|'+r.url,r])).values()];
const confCode=m=>({'Mid-South':'MSC','Am. Midwest':'AMC',Sooner:'SAC',Cascade:'CCC','Red River':'RRAC',Crossroads:'Crossroads','Cal Pac':'CalPac',SUN:'TSC',Chicagoland:'CCAC'})[m.conference]||m.conference;
const memberRows=members.map(m=>{
const mapRows=maps.filter(r=>normalize(r.name)===normalize(aliases[m.name]||m.name)&&r.conference===confNames[m.conference]);
let alternatives=unique.filter(r=>r.conference===confCode(m)&&normalize(r.name)===normalize(m.name));
if(m.name==='Science and Arts of Ok, University of')alternatives=unique.filter(r=>r.conference==='SAC'&&/Science.*Arts/i.test(r.name));
if(m.name==='West Virginia University Tech.')alternatives=unique.filter(r=>r.conference==='RSC'&&/WVU.*Tech|West Virginia/i.test(r.name));
if(m.name==='Oklahoma Panhandle State Univ')alternatives=unique.filter(r=>r.conference==='SAC'&&/Panhandle/i.test(r.name));
const stored=prior.find(r=>r.member?.name===m.name&&r.member.state===m.state);
return{...m,stored:stored?{collegeId:stored.collegeId,programId:stored.programId,slug:stored.slug}:null,mapSources:mapRows.map(r=>({mapId:r.mapId,name:r.name,urls:r.links.filter(u=>/^http/i.test(u)),...(hazards[r.mapId]?{rejectedCampusLink:hazards[r.mapId]}:{})})),conferenceSources:alternatives};
});
assert.equal(memberRows.length,233);assert.equal(memberRows.filter(r=>!r.stored).length,61);
fs.writeFileSync(path.join(root,'member-source-plan.json'),JSON.stringify(memberRows,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(root,'conference-member-links.json'),JSON.stringify(unique,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(root,'rejected-map-campus-links.json'),JSON.stringify(hazards,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(memberRows.filter(r=>!r.stored).map(r=>({name:r.name,state:r.state,mapIds:r.mapSources.map(r=>r.mapId),conferenceLinks:r.conferenceSources.map(r=>r.url)})),null,2));
