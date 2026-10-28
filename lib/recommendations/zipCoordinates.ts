import zipAreas from "@/data/geography/us-zcta-coordinates-2026.json";
export type ZipCoordinate = { latitude: number; longitude: number };
export function normalizeZip(zip: unknown): string | null {
  if (typeof zip !== "string") return null;
  const match = zip.trim().match(/^(\d{5})(?:-\d{4})?$/);
  return match?.[1] || null;
}
export function getCoordinatesForZip(zip: string | null | undefined): ZipCoordinate | null {
  const key = normalizeZip(zip);
  const point = key ? (zipAreas as Record<string, number[]>)[key] : undefined;
  return point ? { latitude: point[0], longitude: point[1] } : null;
}
