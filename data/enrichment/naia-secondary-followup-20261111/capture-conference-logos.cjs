'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),sharp=require('sharp');
const input=JSON.parse(fs.readFileSync(path.join(__dirname,'conference-logo-discovery.json')));
const outputPath=path.join(__dirname,'conference-logo-captures.json');
if(fs.existsSync(outputPath))throw Error('Capture already exists; review saved results rather than retry.');
const dir=path.join(__dirname,'logo-assets');fs.mkdirSync(dir,{recursive:true});
const rows=input.results.filter(x=>x.assets.length),out=[];
let cursor=0;
async function worker(){while(cursor<rows.length){const r=rows[cursor++],a=r.assets[0];
 const result={...r,selected:a};
 try{const res=await fetch(a.url,{signal:AbortSignal.timeout(25000)});
  result.capture={url:a.url,finalUrl:res.url,status:res.status,contentType:res.headers.get('content-type'),checkedAtUtc:new Date().toISOString()};
  if(res.status===200&&/^image\//i.test(result.capture.contentType||'')){
   const bytes=Buffer.from(await res.arrayBuffer()),filename=r.campus.slug+'.asset';
   fs.writeFileSync(path.join(dir,filename),bytes,{flag:'wx'});
   result.capture.sourcePath='logo-assets/'+filename;
   result.capture.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
   const meta=await sharp(bytes).metadata();result.capture.decoded={format:meta.format,width:meta.width,height:meta.height};
   result.disposition='DECODED_PUBLIC_CONFERENCE_LOGO_AWAITING_VISUAL_REVIEW';
  }else result.disposition='HELD_NON_IMAGE_OR_UNAVAILABLE';
 }catch(e){result.disposition='HELD_CAPTURE_OR_DECODE_FAILURE';result.errorType=e.name;}
 out.push(result);
}}
(async()=>{await Promise.all(Array.from({length:4},worker));out.sort((a,b)=>a.name.localeCompare(b.name));
 fs.writeFileSync(outputPath,JSON.stringify({checkedAtUtc:new Date().toISOString(),databaseAccess:false,databaseWrites:0,inputSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'conference-logo-discovery.json'))).digest('hex'),results:out},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({databaseAccess:false,databaseWrites:0,attempted:out.length,decoded:out.filter(x=>x.capture?.decoded).length,held:out.filter(x=>!x.capture?.decoded).map(x=>({slug:x.campus.slug,status:x.capture?.status,error:x.errorType}))}));
})().catch(e=>{console.error(e);process.exitCode=1;});
