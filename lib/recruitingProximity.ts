import { directoryCollegeLocation } from "@/lib/collegeDirectoryLocation";
import { getCoordinatesForZip } from "@/lib/recommendations/zipCoordinates";
export const PROXIMITY_MILES = [25, 50, 100, 200, 500] as const;
type Point = { latitude: number; longitude: number };
export function validPoint(value: { latitude?: unknown; longitude?: unknown } | null | undefined): Point | null {
  const lat = value?.latitude, lon = value?.longitude;
  return typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90 && typeof lon === "number" && Number.isFinite(lon) && Math.abs(lon) <= 180 ? { latitude: lat, longitude: lon } : null;
}
export function collegeLocation(college: { zipCode?: string | null; latitude?: unknown; longitude?: unknown; name?: string | null; city?: string | null; state?: string | null; websiteUrl?: string | null } | null): Point | null {
  return getCoordinatesForZip(college?.zipCode) || validPoint(college) || directoryCollegeLocation(college);
}
export function playerLocation(profile: any): Point | null {
  const data = profile?.data || {}, normalized = data.normalized || {}, core = normalized.core || {}, player = normalized.player || {};
  const candidates = [profile?.user?.Player?.hometownZip];
  for (const record of [normalized, core, player, data]) for (const key of ["homeZip", "hometownZip", "zipCode", "zip", "postalCode"]) candidates.push(record[key]);
  for (const zip of candidates) { const point = getCoordinatesForZip(zip); if (point) return point; }
  return null;
}
export function straightLineMiles(from: Point, to: Point): number {
  const rad = (n: number) => n * Math.PI / 180;
  const a = Math.sin(rad(to.latitude - from.latitude) / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(rad(to.longitude - from.longitude) / 2) ** 2;
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}
