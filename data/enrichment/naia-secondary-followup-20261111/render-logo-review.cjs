'use strict';
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'conference-logo-captures.json'))).results.filter(x=>x.capture?.decoded);
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
(async()=>{for(let start=0;start<rows.length;start+=20){const batch=rows.slice(start,start+20),composite=[];
 for(let i=0;i<batch.length;i++){const r=batch[i],left=i%4*250,top=Math.floor(i/4)*170;
  const logo=await sharp(path.join(__dirname,r.capture.sourcePath)).resize(220,120,{fit:'inside'}).png().toBuffer();
  composite.push({input:logo,left:left+15,top:top+5});
  composite.push({input:Buffer.from('<svg width="250" height="35"><rect width="250" height="35" fill="white"/><text x="5" y="19" font-size="12">'+esc(r.campus.slug)+'</text></svg>'),left,top:top+130});
 }
 await sharp({create:{width:1000,height:Math.ceil(batch.length/4)*170,channels:4,background:'#eeeeee'}}).composite(composite).png().toFile(path.join(__dirname,'logo-review-'+(1+start/20)+'.png'));
 }console.log(JSON.stringify({rendered:rows.length,sheets:Math.ceil(rows.length/20)}));
})().catch(e=>{console.error(e);process.exitCode=1;});
