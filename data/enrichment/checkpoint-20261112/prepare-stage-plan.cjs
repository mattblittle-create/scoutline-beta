'use strict';
// Read-only Git inventory. Creates a reviewable file list; never stages or commits.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const repo=path.resolve(__dirname,'../../..'),git=args=>cp.execFileSync('git',args,{cwd:repo,encoding:'utf8'}),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(git(['status','--porcelain=v1','--untracked-files=no']).trim(),'','Review existing tracked/index edits first');
const all=git(['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean),selected=[],archived=[],outside=[],flags=[];
for(const file of all){if(!/^data\/enrichment\/(?:naia-[^/]+|checkpoint-20261112)\//.test(file)){outside.push(file);continue;}if(file.startsWith('data/enrichment/checkpoint-20261112/'))continue;const absolute=path.join(repo,file),stat=fs.statSync(absolute),ext=path.extname(file).toLowerCase();let reason=null;
if(!['.cjs','.py','.md','.json','.csv'].includes(ext))reason='RAW_OR_BINARY_EVIDENCE';
else if(/\/sources\//.test(file))reason='RAW_SOURCE_CAPTURE';
else if(stat.size>5*1024*1024)reason='LARGE_ARTIFACT_OVER_5_MIB';
else if(/(?:fresh-read-only-snapshot|read-only-current-before-apply)\.json$/.test(file))reason='FULL_DATABASE_STATE_SNAPSHOT';
let bytes;if(!reason){bytes=fs.readFileSync(absolute);if(ext==='.json'&&/^\s*\{[\s\S]{0,2048}"schools"\s*:\s*\[/.test(bytes.subarray(0,4096).toString('utf8')))reason='FULL_DATABASE_STATE_SNAPSHOT';}
if(reason){archived.push({path:file,bytes:stat.size,reason});continue;}
const text=bytes.toString('utf8');if(/(?:postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@|\bgh[pousr]_[A-Za-z0-9]{30,}|\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(text))flags.push(file);
selected.push({path:file,bytes:stat.size,sha256:hash(bytes)});}
for(const file of ['data/enrichment/checkpoint-20261112/README.md','data/enrichment/checkpoint-20261112/backup-receipt.json','data/enrichment/checkpoint-20261112/prepare-stage-plan.cjs']){const bytes=fs.readFileSync(path.join(repo,file));selected.push({path:file,bytes:bytes.length,sha256:hash(bytes)});}
selected.sort((a,b)=>a.path.localeCompare(b.path));const report={databaseAccess:false,databaseWrites:0,gitWrites:0,head:git(['rev-parse','HEAD']).trim(),selectedFiles:selected.length,selectedBytes:selected.reduce((n,f)=>n+f.bytes,0),archiveOnlyFiles:archived.length,archiveOnlyBytes:archived.reduce((n,f)=>n+f.bytes,0),potentialSecretFlags:flags,selected,archiveOnly:archived,outsideScope:outside};assert.equal(flags.length,0,'Potential credential patterns need review; filenames recorded in memory only');
fs.writeFileSync(__dirname+'/stage-plan.json',JSON.stringify(report,null,2)+'\n');const paths=[...selected.map(f=>f.path),'data/enrichment/checkpoint-20261112/stage-plan.json','data/enrichment/checkpoint-20261112/stage-paths.txt'];fs.writeFileSync(__dirname+'/stage-paths.txt',paths.join('\n')+'\n');console.log(JSON.stringify({selectedFiles:paths.length,selectedMiB:Number((report.selectedBytes/1024/1024).toFixed(2)),archiveOnlyFiles:archived.length,archiveOnlyMiB:Number((report.archiveOnlyBytes/1024/1024).toFixed(2)),temporaryOrOtherFilesExcluded:outside.length,potentialSecretFlags:flags.length,gitWrites:0},null,2));
