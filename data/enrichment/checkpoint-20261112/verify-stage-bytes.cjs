'use strict';
// Read-only index verification: the staged checkpoint must preserve raw bytes.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict'),repo=path.resolve(__dirname,'../../..'),git=args=>cp.execFileSync('git',args,{cwd:repo,encoding:'utf8'});
assert.equal(git(['rev-parse','--show-object-format']).trim(),'sha1');
const expected=fs.readFileSync(__dirname+'/stage-paths.txt','utf8').trim().split(/\r?\n/).concat(['.gitattributes','data/enrichment/checkpoint-20261112/verify-stage-bytes.cjs']).sort();
const actual=git(['diff','--cached','--name-only','-z']).split('\0').filter(Boolean).sort();assert.deepStrictEqual(actual,expected,'Staged file selection differs from reviewed checkpoint');
const index=new Map(git(['ls-files','--stage','-z']).split('\0').filter(Boolean).map(row=>{const split=row.indexOf('\t'),[mode,oid,stage]=row.slice(0,split).split(' ');assert.equal(stage,'0','Unmerged index');return[row.slice(split+1),{mode,oid}];}));
const mismatches=[];for(const file of expected){const bytes=fs.readFileSync(path.join(repo,file)),oid=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');if(index.get(file)?.oid!==oid)mismatches.push(file);}
if(mismatches.length){console.error(JSON.stringify({rawByteMismatches:mismatches},null,2));process.exitCode=1;}else console.log(JSON.stringify({stagedFiles:expected.length,exactRawByteMatches:expected.length,lineEndingChanges:0,unexpectedStagedFiles:0,databaseAccess:false,databaseWrites:0,gitWrites:0},null,2));
