'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const out = path.join(__dirname, 'official-inventory-sources');
const sources = [
  ['membership-2026-27.pdf', 'https://www.naia.org/wp-content/uploads/2026/07/2026-2027_NAIA_Institutions.pdf'],
  ['school-map.html', 'https://naia.college-tour.com/'],
  ['conferences.html', 'https://www.naia.org/explore/conferences/']
];
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const results = await Promise.all(sources.map(async ([file, url]) => {
    const checkedAtUtc = new Date().toISOString();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const bytes = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(out, file), bytes, { flag: 'wx' });
      return { url, finalUrl: res.url, checkedAtUtc, status: res.status, contentType: res.headers.get('content-type'), file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
    } catch (e) { return { url, checkedAtUtc, status: 'FAILED', errorType: e.name }; }
  }));
  fs.writeFileSync(path.join(out, 'captures.json'), JSON.stringify(results, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(results, null, 2));
}
main().catch(e => { console.error(e.name); process.exitCode = 1; });
