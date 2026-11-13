'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{createRequire}=require('module');
const req=createRequire(path.resolve(__dirname,'../../../package.json')),ch=req('cheerio');
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function components(html){const $=ch.load(html),out=[];$('script').each((_,e)=>{const text=$(e).text();for(const m of text.matchAll(/var component\s*=\s*(\{[^\n]*?\});/g)){try{out.push(JSON.parse(m[1]));}catch{}}});return out;}
function links(html,base){const $=ch.load(html),out=[];function add(url,label,context,kind){if(!url||String(url).trim().startsWith('#'))return;try{const u=new URL(String(url).trim(),base);if(!/^https?:$/.test(u.protocol))return;out.push({url:u.href,label:clean(label),context:clean(context),kind});}catch{}}
$('a[href],option[value]').each((_,e)=>{const a=$(e);add(a.attr('href')||a.attr('value'),a.text(),a.attr('aria-label'),'HTML');});
function visit(value,context=''){if(!value||typeof value!=='object')return;if(Array.isArray(value)){for(const v of value)visit(v,context);return;}const title=value.title||value.label||value.text||'',next=/baseball/i.test(title)?title:context;if(value.url)add(value.url,title,next,'PUBLISHED_SIDEARM_JSON');for(const[k,v]of Object.entries(value))if(k!=='url')visit(v,next);}
for(const c of components(html))visit(c);return [...new Map(out.map(r=>[r.url+'|'+r.label+'|'+r.context,r])).values()];}
async function capture(url,root,file){try{const res=await fetch(url,{signal:AbortSignal.timeout(25000)}),body=await res.text();fs.writeFileSync(path.join(root,file),body,{flag:'wx'});return{url,finalUrl:res.url,status:res.status,file,checkedAtUtc:new Date().toISOString(),sha256:crypto.createHash('sha256').update(body).digest('hex'),html:res.status===200?body:null};}catch(e){return{url,status:'FAILED',errorType:e.name};}}
function sportHome(r){return /baseball/i.test(r.label+' '+r.context)&&(/\/(?:sports\/)?(?:baseball|bsb)(?:\/index)?\/?$/.test(new URL(r.url).pathname)||/[?&]path=(?:baseball|bsb)(?:&|$)/i.test(r.url))&&!/schedule|stat|roster|archive|news|calendar/i.test(new URL(r.url).pathname);}
module.exports={components,links,capture,clean,sportHome,ch};
