const fs=require('fs'),u=require('../naia-inventory-review-20261111/source-utils.cjs'),q=u.ch.load(fs.readFileSync(__dirname+'/sources/defiance-directory.html','utf8'));
q('a[href]').filter((_,e)=>/page|directory/i.test(q(e).attr('href'))).each((_,e)=>console.log(JSON.stringify({text:u.clean(q(e).text()),url:q(e).attr('href')})));
q('*').filter((_,e)=>!q(e).children().length&&/Assistant Baseball Coach/.test(q(e).text())).each((_,e)=>console.log(q(e).parent().html()));
