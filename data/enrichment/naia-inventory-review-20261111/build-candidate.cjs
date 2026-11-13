'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=__dirname,read=p=>JSON.parse(fs.readFileSync(path.resolve(root,p)));
const baseline='../naia-baseline-20261111/live-audit-2026-11-11T14-01-28-197Z-5a38848d/fresh-read-only-snapshot.json';
const s=read(baseline),review=read('sponsorship-review/other-61-member-dispositions.json');
const changes=[];
function add(slug,model,field,after,source){const c=s.schools.find(c=>c.slug===slug);assert(c,'Missing exact college: '+slug);assert(!c.programProfileUpdatedByUserId,'Owned college held');const row=model==='College'?c:c.baseballProgram;assert(row);assert.notEqual(row.verificationStatus,'VERIFIED','Verified records held');assert.notDeepEqual(row[field],after);changes.push({slug,collegeId:c.id,programId:c.baseballProgram.id,model,field,before:row[field],after,source});}
const transitions=[
['andrew-college','NAIA','Southern States Athletic Conference','priority-evidence/andrew-transition.html'],
['bismarck-state-college','NAIA','Frontier Conference','priority-evidence/bismarck-transition.html'],
['hesston-college','NAIA','Continental Athletic Conference','priority-evidence/hesston-transition.html'],
['east-georgia-college','NAIA','Continental Athletic Conference','supplemental-sources/east-georgia-transition.html'],
['shawnee-state','NCAA_D2','Mountain East Conference','../naia-baseline-20261111/official-inventory-sources/exception-evidence/shawnee-ncaa-directory.html']
];
for(const [slug,division,conference,source]of transitions){const c=s.schools.find(c=>c.slug===slug),p=c.baseballProgram;assert(['NJCAA_D1','NJCAA_D2','NAIA'].includes(p.division));assert(/^(?:NJCAA Division (?:I|II) programs may offer athletic scholarships, subject to NJCAA and institutional limits\.|NAIA programs may offer athletic scholarships and other aid opportunities\.)$/.test(p.scholarshipNotes));assert(['https://www.njcaa.org/','https://www.naia.org/'].includes(p.scholarshipInfoUrl));add(slug,'CollegeBaseballProgram','division',division,source);add(slug,'CollegeBaseballProgram','conference',conference,source);add(slug,'CollegeBaseballProgram','scholarshipNotes',null,source);add(slug,'CollegeBaseballProgram','scholarshipInfoUrl',null,source);}
add('east-georgia-college','College','name','Georgia Southern University – East Georgia Campus','supplemental-sources/east-georgia-transition.html');
add('east-georgia-college','College','city','Swainsboro','supplemental-sources/east-georgia-transition.html');
add('bethel','College','name','Bethel University (Tennessee)','../naia-baseline-20261111/official-school-baseball-review/10770-baseball.html');
add('concordia','College','name','Concordia University (Nebraska)','../naia-baseline-20261111/official-school-baseball-review/10726-baseball.html');
const targets=[
['Bethel University','IN','bethel-university-indiana','Bethel University (Indiana)'],
['Champion Christian College','AR','champion-christian-college','Champion Christian College'],
['Mid-America Christian University','OK','mid-america-christian-university','Mid-America Christian University'],
['Oklahoma City University','OK','oklahoma-city-university','Oklahoma City University'],
['Ozarks, College of the','MO','college-of-the-ozarks-missouri','College of the Ozarks (Missouri)'],
['Southwestern Christian University','OK','southwestern-christian-university','Southwestern Christian University'],
['Texas Wesleyan University','TX','texas-wesleyan-university','Texas Wesleyan University'],
['United States Sports University','AL','united-states-sports-university','United States Sports University'],
['Warner Pacific University','OR','warner-pacific-university','Warner Pacific University']
];
const conf={'Sooner':'Sooner Athletic Conference','Cascade':'Cascade Collegiate Conference','Crossroads':'Crossroads League','CAC':'Continental Athletic Conference'};
const norm=name=>name.toLowerCase().replace(/\([^)]*\)/g,'').replace(/\bst\.?\b/g,'saint').replace(/[^a-z0-9]/g,'').replace(/university|college/g,'');
const creates=targets.map(([memberName,state,slug,name])=>{const r=review.find(r=>r.name===memberName&&r.state===state);assert(r?.disposition==='SUPPORTED_CURRENT_MEMBER_WITH_OFFICIAL_BASEBALL_PAGE');assert(r.baseballProofs.length);assert(!s.schools.some(c=>c.slug===slug));assert(!s.schools.some(c=>norm(c.name)===norm(name)&&c.state===state),'Possible existing campus: '+name);const proof=r.baseballProofs[0];assert(conf[r.conference]);return{memberName,memberState:state,college:{slug,name,state,verificationStatus:'UNVERIFIED'},program:{division:'NAIA',conference:conf[r.conference],baseballWebsiteUrl:proof.url,verificationStatus:'UNVERIFIED'},source:proof.sourcePath};});
assert.equal(changes.length,24);assert.equal(creates.length,9);
const holds={middleGeorgiaDuplicate:{status:'HELD_NO_RECLASSIFICATION_OR_MERGE',preservedCanonicalSlug:'middle-georgia',staleDuplicateSlug:'middle-georgia-state',preservedCanonicalCoaches:3,preservedCanonicalPlayers:43,preservedCanonicalSnapshots:1},closuresAndSuspension:read('../naia-baseline-20261111/baseline-closeout/stored-naia-member-reconciliation.json').filter(r=>!r.member&&r.slug!=='shawnee-state'&&r.slug!=='middle-georgia-state'),other61SourceHolds:review.filter(r=>!r.disposition.startsWith('SUPPORTED')),institutionSchoolType:transitions.filter(([slug])=>slug!=='shawnee-state').map(([slug])=>({slug,status:'PRESERVE_JUNIOR_COLLEGE_PENDING_SEPARATE_ACADEMIC_CLASSIFICATION_REVIEW'})),nationalInventoryVerified:false,otherSourceHoldsRemain:true};
const candidate={version:1,scope:'NAIA_IDENTITY_AND_MEMBERSHIP_REVIEW_20261111',baseline,changes,creates,holds,recordDeletions:0,recordMerges:0,newCoaches:0,newRosterPlayers:0,newManualVerificationMarkers:0,youtubeUpdates:0,approval:'NOT_GRANTED'};
const out=path.join(root,'correction-review');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate,null,2)+'\n',{flag:'wx'});
const summary={createdAtUtc:new Date().toISOString(),candidateSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'candidate.json'))).digest('hex'),newColleges:9,newPrograms:9,existingProgramsReclassified:5,existingProgramFieldChanges:20,existingCollegeFieldChanges:4,totalExistingFieldChanges:24,obsoleteGenericScholarshipTemplateFieldsCleared:10,projectedStoredNAIAPrograms:192,projectedCountIsNotVerifiedNationalBaseballTotal:true,recordDeletions:0,recordMerges:0,coachesPlayersSnapshotsAndProfilesPreserved:true,globalCoaches:4563,globalPlayers:19757,globalSnapshots:514,baselineIsUserRunReadOnly:true,assistantDatabaseAccess:false,approval:'NOT_GRANTED'};
fs.writeFileSync(path.join(out,'review-summary.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});fs.writeFileSync(path.join(out,'remaining-holds.json'),JSON.stringify(holds,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(summary,null,2));
