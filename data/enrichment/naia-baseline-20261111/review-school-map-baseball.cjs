'use strict';
// Public GETs of URLs explicitly published by the official NAIA school map.
// No guessed team paths, retries, browser challenges, form submissions or DB access.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { createRequire } = require('module');
const req = createRequire(path.resolve(__dirname, '../../../package.json')), ch = req('cheerio');
const source = path.join(__dirname, 'official-inventory-sources');
const schools = JSON.parse(fs.readFileSync(path.join(source, 'school-map-institutions.json')));
const out = path.join(__dirname, 'official-school-baseball-review');
const deniedHosts = new Set(), results = [];
const clean = s => s.replace(/\s+/g, ' ').trim();
function links(html, base) {
  const $ = ch.load(html), matches = [];
  $('a[href]').each((_, e) => {
    const a = $(e), label = clean(a.text()), aria = clean(a.attr('aria-label') || '');
    if (!/^(?:men'?s?\s+)?baseball$/i.test(label) && !/^(?:men'?s?\s+)?baseball$/i.test(aria)) return;
    try {
      const url = new URL(a.attr('href'), base); if (!['https:', 'http:'].includes(url.protocol)) return;
      if (/youtube|twitter|instagram|facebook|ticket|shop|store|recruit|questionnaire/i.test(url.hostname + url.pathname)) return;
      matches.push({ url: url.href, label, aria, inNavigation: !!a.closest('nav,header,[role=navigation]').length, probableSportHome: /\/(?:sports\/)?(?:baseball|bsb|m-basebl)(?:\/index|\/)?$/i.test(url.pathname) });
    } catch {}
  });
  return [...new Map(matches.map(r => [r.url, r])).values()].sort((a, b) => Number(b.probableSportHome) - Number(a.probableSportHome) || Number(b.inNavigation) - Number(a.inNavigation));
}
async function capture(url, file) {
  const host = new URL(url).hostname;
  if (deniedHosts.has(host)) return { url, status: 'HELD_PRIOR_ACCESS_DENIAL' };
  const checkedAtUtc = new Date().toISOString();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if ([401, 403, 429].includes(res.status)) { deniedHosts.add(host); deniedHosts.add(new URL(res.url).hostname); }
    const body = await res.text();
    fs.writeFileSync(path.join(out, file), body, { flag: 'wx' });
    return { url, finalUrl: res.url, checkedAtUtc, status: res.status, file, sha256: crypto.createHash('sha256').update(body).digest('hex'), bytes: Buffer.byteLength(body), html: res.ok && /html/i.test(res.headers.get('content-type') || '') ? body : null };
  } catch (e) { return { url, checkedAtUtc, status: 'FAILED', errorType: e.name }; }
}
async function inspect(school) {
  const url = school.links.find(u => /^https?:\/\//i.test(u.trim()));
  if (!url) return { ...school, disposition: 'HELD_NO_PUBLISHED_WEB_LINK' };
  const home = await capture(url.trim(), school.mapId + '-home.html');
  let publishedBaseballLinks = [], baseball = null;
  if (home.html) {
    publishedBaseballLinks = links(home.html, home.finalUrl);
    const pick = publishedBaseballLinks.find(r => r.probableSportHome);
    if (pick) {
      if (pick.url === home.finalUrl) baseball = { ...home };
      else baseball = await capture(pick.url, school.mapId + '-baseball.html');
    }
  }
  const text = baseball?.html ? clean(ch.load(baseball.html)('body').text()) : '';
  const pageTitle = baseball?.html ? clean(ch.load(baseball.html)('title').text()) : null;
  const seasonLinks = baseball?.html ? (() => { const $ = ch.load(baseball.html); return $('a[href]').toArray().flatMap(e => { const a = $(e); if (!/2027|2026-27|2026–27/.test(a.text() + ' ' + a.attr('href'))) return []; try { return [{ label: clean(a.text()).slice(0,180), url: new URL(a.attr('href'), baseball.finalUrl).href }]; } catch { return []; } }).slice(0,80); })() : [];
  delete home.html; if (baseball) delete baseball.html;
  return { mapId: school.mapId, name: school.name, mapConference: school.conference, mapSource: 'official-inventory-sources/school-map.html', home, publishedBaseballLinks, baseball, pageTitle, mentions2027: /2027|2026-27|2026–27/.test(text), seasonLinks, disposition: baseball?.status === 200 ? 'PUBLISHED_BASEBALL_PAGE_CAPTURED_REQUIRES_SEASON_AND_MEMBERSHIP_REVIEW' : publishedBaseballLinks.length ? 'HELD_BASEBALL_LINK_REQUIRES_REVIEW' : 'HELD_NO_BASEBALL_LINK_ESTABLISHED_NOT_EVIDENCE_OF_NO_TEAM' };
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  let index = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (index < schools.length) {
      const school = schools[index++]; results.push(await inspect(school));
      if (results.length % 25 === 0) console.log('Reviewed ' + results.length + '/' + schools.length);
    }
  }));
  results.sort((a, b) => a.mapId - b.mapId);
  fs.writeFileSync(path.join(out, 'research-decisions.json'), JSON.stringify(results, null, 2) + '\n', { flag: 'wx' });
  const report = { checkedAtUtc: new Date().toISOString(), databaseAccess: false, databaseWrites: 0, schoolsReviewed: results.length, publishedBaseballPagesCaptured: results.filter(r => r.baseball?.status === 200).length, pageCapturesMentioning2027: results.filter(r => r.baseball?.status === 200 && r.mentions2027).length, nationalBaseballInventoryVerified: false, mapMayContainHistoricalMembers: true, deniedHosts: [...deniedHosts], evidenceIsNotAnImportCandidate: true };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(report, null, 2));
}
main().catch(e => { console.error(e.name + ': ' + e.message); process.exitCode = 1; });
