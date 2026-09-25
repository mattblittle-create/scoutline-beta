// lib/recommendations/zipCoordinates.ts

export type ZipCoordinate = {
  latitude: number;
  longitude: number;
};

const ZIP_COORDINATES: Record<string, ZipCoordinate> = {
  // Clover / Lake Wylie area test ZIPs
  "29710": { latitude: 35.1112, longitude: -81.2265 },
  "29745": { latitude: 34.9943, longitude: -81.2420 },
  "28278": { latitude: 35.1068, longitude: -80.9967 },
};

export function getCoordinatesForZip(zip: string | null | undefined): ZipCoordinate | null {
  const cleaned = String(zip || "").trim().slice(0, 5);
  return ZIP_COORDINATES[cleaned] || null;
}