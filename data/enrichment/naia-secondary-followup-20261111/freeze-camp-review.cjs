'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),builder=require('./build-camp-review.cjs');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,f))).digest('hex');
const b=builder.build(),files=[...b.files.map(f=>path.relative(__dirname,f).replace(/\\/g,'/')),'camp-candidate.json','camp-review-summary.json','build-camp-review.cjs','preview-camps.cjs','freeze-camp-review.cjs','recruiting-destination-captures.json','recruiting-followlink-captures.json','../naia-inventory-review-20261111/source-utils.cjs','../../../prisma/schema.prisma'];
fs.writeFileSync(path.join(__dirname,'camp-manifest.json'),JSON.stringify({candidateSHA256:sha('camp-candidate.json'),hashes:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)]))},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({candidateSHA256:sha('camp-candidate.json'),approval:'NOT_GRANTED',programs:7,fieldChanges:7,databaseAccess:false,databaseWrites:0}));
