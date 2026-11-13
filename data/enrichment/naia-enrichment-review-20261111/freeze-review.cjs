'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{build}=require('./build-candidate.cjs'),preview=require('./preview-enrichment.cjs');
const root=__dirname,repo=path.resolve(root,'../../..'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function main(){const d=build(),baseline=JSON.parse(fs.readFileSync(path.resolve(root,d.candidate.baseline)));
 preview.validateCandidate(d.candidate,baseline);
 const files=['candidate.json','review-summary.json','dispositions.json','source-files.json'];for(const[file,value]of Object.entries({'candidate.json':d.candidate,'review-summary.json':d.summary,'dispositions.json':d.dispositions,'source-files.json':d.evidenceFiles}))fs.writeFileSync(path.join(root,file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 const local=fs.readdirSync(root).filter(f=>f.endsWith('.cjs')||['source-review.json','secondary-review.json','secondary-overrides.json','logo-asset-review.json','current-page-recovery.json','inventory-overlay-final.json','inventory-overlay-summary-final.json',...files].includes(f)).map(f=>path.join(root,f));
 const captures=['inventory-supplement','extra-sources','final-inventory-sources'].flatMap(folder=>fs.readdirSync(path.join(root,folder)).map(f=>path.join(root,folder,f)));
 const inputs=[...new Set([...d.evidenceFiles,...local,...captures,path.resolve(root,d.candidate.baseline),path.join(repo,'prisma/schema.prisma'),path.resolve(root,'../naia-inventory-review-20261111/source-utils.cjs'),path.resolve(root,'../naia-membership-evidence-20261111/review-verified/all-member-review.json'),path.resolve(root,'../naia-membership-evidence-20261111/review-verified/current-2027-conference-teams.json'),path.resolve(root,'../naia-membership-evidence-20261111/sources/current-standings-captures.json')])];
 const hashes=Object.fromEntries(inputs.sort().map(f=>[path.relative(root,f).replace(/\\/g,'/'),hash(f)]));
 const manifest={checkedAtUtc:new Date().toISOString(),candidateSHA256:hash(path.join(root,'candidate.json')),schemaSHA256:hash(path.join(repo,'prisma/schema.prisma')),approval:'NOT_GRANTED',hashes};fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({...d.summary,candidateSHA256:manifest.candidateSHA256,frozenInputs:inputs.length},null,2));
}
main();
