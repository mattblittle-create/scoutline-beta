'use strict';
// Only Embry-Riddle is special-cased. Never infer a campus from a generic slug alone.
const clean = v => String(v ?? '').trim();
const normalize = v => clean(v).toLowerCase().replace(/[–—]/g, '-');
function isEmbry(row) {
  return /embry[\s–—-]*riddle|embryriddle|erau\.edu|eraueagles\.com|erauathletics\.com/i.test(
    ['slug','name','schoolName','websiteUrl','baseballWebsiteUrl','replacementBaseballWebsiteUrl','rosterUrl','scheduleUrl','dataSourceUrl','contactUrl','bioUrl'].map(k => clean(row[k])).join(' '));
}
function resolveEmbryRiddleRow(input, context = {}) {
  const row = {...input};
  if (!isEmbry(row)) return row;
  const votes = new Set();
  const vote = x => votes.add(x);
  const state = normalize(row.state);
  if (state === 'fl' || state === 'florida') vote('daytona');
  else if (state === 'az' || state === 'arizona') vote('prescott');
  else if (state) throw new Error('Embry-Riddle: unsupported campus state');
  const city = normalize(row.city);
  if (city === 'daytona beach') vote('daytona');
  else if (city === 'prescott') vote('prescott');
  else if (city) throw new Error('Embry-Riddle: unsupported campus city');
  const school = normalize(row.schoolName || row.name);
  if (/daytona/.test(school)) vote('daytona');
  if (/prescott/.test(school)) vote('prescott');
  if (clean(row.division) && clean(context.division) && clean(row.division).toUpperCase() !== clean(context.division).toUpperCase()) throw new Error('Embry-Riddle: source division conflicts with importer scope');
  const division = clean(row.division || context.division).toUpperCase();
  if (division === 'NCAA_D2') vote('daytona');
  else if (division === 'NAIA') vote('prescott');
  else if (division) throw new Error('Embry-Riddle: unsupported baseball division');
  // Restrict URL evidence to identity/baseball URLs; never use arbitrary narrative text.
  for (const key of ['websiteUrl','baseballWebsiteUrl','replacementBaseballWebsiteUrl','rosterUrl','scheduleUrl','contactUrl','bioUrl']) {
    if (!clean(row[key])) continue;
    let u; try {u = new URL(row[key]);} catch {throw new Error('Embry-Riddle: malformed source URL');}
    if (!['https:','http:'].includes(u.protocol)) throw new Error('Embry-Riddle: unsupported URL scheme');
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'erauathletics.com' || host === 'daytonabeach.erau.edu') vote('daytona');
    if (host === 'eraueagles.com' || host === 'prescott.erau.edu') vote('prescott');
    if (host === 'erau.edu' && /\/daytona-beach(?:-campus|\/|$)/.test(u.pathname)) vote('daytona');
    if (host === 'erau.edu' && /\/prescott(?:-campus|\/|$)/.test(u.pathname)) vote('prescott');
    if (host === 'naiastats.prestosports.com' && /\/embryriddleaz(?:\/|$)/.test(u.pathname)) vote('prescott');
  }
  if (votes.size !== 1) throw new Error('Embry-Riddle: missing or conflicting campus evidence');
  const campus = [...votes][0];
  const target = campus === 'daytona' ? 'embry-riddle-daytona-beach' : 'embry-riddle';
  const slug = clean(row.slug);
  if (slug && !['embry-riddle','embry-riddle-daytona-beach'].includes(slug)) throw new Error('Embry-Riddle: unreviewed source slug');
  if (slug === 'embry-riddle-daytona-beach' && campus !== 'daytona') throw new Error('Embry-Riddle: wrong-campus canonical slug');
  // Import rows can explicitly map the legacy D2 source slug, never a generic universal alias.
  row.slug = target;
  return row;
}
function assertEmbryTarget(row, college) {
  if (!isEmbry(row)) return;
  const r = resolveEmbryRiddleRow(row);
  const daytona = r.slug === 'embry-riddle-daytona-beach';
  if (!college || college.slug !== r.slug || college.state !== (daytona ? 'FL' : 'AZ') || college.city !== (daytona ? 'Daytona Beach' : 'Prescott')) throw new Error('Embry-Riddle: target campus does not match; complete reviewed repair first');
  const p = college.baseballProgram;
  if (p && p.division !== (daytona ? 'NCAA_D2' : 'NAIA')) throw new Error('Embry-Riddle: target division conflicts');
}
function scorecardCampus(row, school) {
  if (!isEmbry(row)) return true;
  const r = resolveEmbryRiddleRow(row);
  const daytona = r.slug === 'embry-riddle-daytona-beach';
  return normalize(school['school.state']) === (daytona ? 'fl' : 'az') && normalize(school['school.city']) === (daytona ? 'daytona beach' : 'prescott') && normalize(school['school.name']).includes(daytona ? 'daytona beach' : 'prescott');
}
module.exports = {isEmbry, resolveEmbryRiddleRow, assertEmbryTarget, scorecardCampus};
