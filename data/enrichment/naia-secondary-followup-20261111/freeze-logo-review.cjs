'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const read=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,f)));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,f))).digest('hex');
const save=(f,x)=>fs.writeFileSync(path.join(__dirname,f),JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const discovery=read('conference-logo-discovery.json'),captures=read('conference-logo-captures.json');
const accepted=captures.results.filter(x=>x.capture?.decoded);
if(accepted.length!==38)throw Error('Unexpected reviewed count');
// Both contact sheets inspected: each is a school athletics/institution mark;
// no awards, conference logos, placeholders or unrelated campus marks observed.
save('logo-visual-review.json',{reviewedAtUtc:new Date().toISOString(),reviewedAssets:38,sheets:['logo-review-1.png','logo-review-2.png'],decision:'ACCEPT_EXACT_CONFERENCE_CAMPUS_LOGOS',notes:'Some conference originals are low resolution (notably Viterbo); preserve original asset URLs and do not claim newly designed or high-resolution artwork. Judson 403 remains held.'});
const candidate={scope:'NAIA_BLANK_PROGRAM_LOGOS_ONLY_20261111',approval:'NOT_GRANTED',baseline:'../naia-enrichment-review-20261111/closeout-audit-2026-11-11T16-31-39-476Z-42ca5e88/fresh-read-only-snapshot.json',changes:accepted.map(r=>({model:'CollegeBaseballProgram',field:'logoUrl',collegeId:r.campus.collegeId,programId:r.campus.programId,slug:r.campus.slug,before:null,after:r.capture.finalUrl,publishedName:r.selected.publishedName,conferenceSource:r.selected.sourceFile,sourcePath:r.capture.sourcePath})),recordDeletions:0,recordMerges:0,coachesCreated:0,playersCreated:0,snapshotsCreated:0,verificationPromotions:0,youtubeUpdates:0};
save('logo-candidate.json',candidate);
const files=['preview-logos.cjs','freeze-logo-review.cjs','discover-conference-logos.cjs','capture-conference-logos.cjs','render-logo-review.cjs','conference-logo-discovery.json','conference-logo-captures.json','logo-visual-review.json','logo-review-1.png','logo-review-2.png','logo-candidate.json',candidate.baseline,'../../../prisma/schema.prisma','../naia-inventory-review-20261111/member-source-plan.json','../naia-membership-evidence-20261111/review-verified/all-member-review.json','../naia-inventory-review-20261111/conference-sources/research.json','../naia-inventory-review-20261111/source-utils.cjs',...accepted.flatMap(x=>[x.capture.sourcePath,'../naia-inventory-review-20261111/'+x.selected.sourceFile])];
save('logo-manifest.json',{candidateSHA256:sha('logo-candidate.json'),baselineSHA256:sha(candidate.baseline),hashes:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)]))});
console.log(JSON.stringify({databaseAccess:false,databaseWrites:0,proposedBlankLogoFills:38,remainingLogoHolds:discovery.results.length-38,candidateSHA256:sha('logo-candidate.json'),approval:'NOT_GRANTED'}));
