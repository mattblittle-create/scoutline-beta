import directory from "@/data/geography/us-college-locations-ipeds2024.json";
import { getCoordinatesForZip } from "@/lib/recommendations/zipCoordinates";
type School = typeof directory[number];
type College = { name?: string | null; state?: string | null; city?: string | null; websiteUrl?: string | null };
function normalized(value: unknown) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/\bst\.?\b/g, "saint").replace(/[^a-z0-9]+/g, " ").trim();
}
function shortName(value: unknown) { return normalized(value).split(" ").filter(word => !["the", "of", "at", "and", "university", "college", "community", "technical", "institute"].includes(word)).join(" "); }
function hostname(value: unknown) {
  try { const s = String(value || "").trim(); return new URL(/^https?:/i.test(s) ? s : "https://" + s).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}
function index(key: (row: School) => string[]) {
  const map = new Map<string, School[]>();
  for (const row of directory) for (const k of new Set(key(row).filter(Boolean))) map.set(k, [...(map.get(k) || []), row]);
  return map;
}
const byName = index(row => [row.name, ...row.aliases].map(normalized));
const byShortName = index(row => [row.name, ...row.aliases].map(shortName));
const byHost = index(row => [row.host]);
function uniqueCampus(rows: School[], college: College) {
  const state = String(college.state || "").replace(/[^a-z]/gi, "").toUpperCase();
  let candidates = state.length === 2 ? rows.filter(row => row.state === state) : rows;
  if (candidates.length > 1 && college.city) candidates = candidates.filter(row => normalized(row.city) === normalized(college.city));
  return candidates.length === 1 ? candidates[0] : null;
}
export function directoryCollegeLocation(college: College | null) {
  if (!college) return null;
  const exact = uniqueCampus(byName.get(normalized(college.name)) || [], college);
  const short = !exact && college.state ? uniqueCampus(byShortName.get(shortName(college.name)) || [], college) : null;
  const host = !exact && !short && college.websiteUrl ? uniqueCampus(byHost.get(hostname(college.websiteUrl)) || [], college) : null;
  const row = exact || short || host;
  if (!row) return null;
  return getCoordinatesForZip(row.zip) || { latitude: row.latitude, longitude: row.longitude };
}
