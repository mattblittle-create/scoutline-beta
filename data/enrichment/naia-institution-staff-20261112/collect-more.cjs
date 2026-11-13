'use strict';
// Public institutional pages only. No database client or environment loading.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
async function main(){
 const output=path.join(__dirname,'additional-captures.json');assert(!fs.existsSync(output),'Capture already exists; review saved evidence before another request.');
 fs.mkdirSync(path.join(__dirname,'sources'),{recursive:true});const results=[];
 for(const [key,url] of [['briar-cliff-directory','https://www.briarcliff.edu/directory'],['brescia-directory','https://students.brescia.edu/directory/'],['cleary-head','https://www.cleary.edu/staff/andrew-maki-3/']]){
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)}),body=Buffer.from(await response.arrayBuffer()),sourcePath='sources/'+key+'.html';
  fs.writeFileSync(path.join(__dirname,sourcePath),body,{flag:'wx'});
  results.push({key,url,finalUrl:response.url,status:response.status,contentType:response.headers.get('content-type'),checkedAtUtc:new Date().toISOString(),sourcePath,sha256:crypto.createHash('sha256').update(body).digest('hex')});
 }
 fs.writeFileSync(output,JSON.stringify({databaseAccess:false,databaseWrites:0,results},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({databaseAccess:false,databaseWrites:0,captures:results.map(r=>({key:r.key,status:r.status,sha256:r.sha256}))},null,2));
 assert(results.every(r=>r.status===200),'Non-200 evidence remains held.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
