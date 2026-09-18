// lib/recommendations/distance.ts

export type GeoPoint = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
};

export type DistanceResult = {
  miles: number | null;
  label: string;
};

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMiles(
  from: GeoPoint,
  to: GeoPoint
): number | null {
  if (
    typeof from.latitude !== "number" ||
    typeof from.longitude !== "number" ||
    typeof to.latitude !== "number" ||
    typeof to.longitude !== "number"
  ) {
    return null;
  }

  const lat1 = toRadians(from.latitude);
  const lon1 = toRadians(from.longitude);
  const lat2 = toRadians(to.latitude);
  const lon2 = toRadians(to.longitude);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_MILES * c);
}

export function formatDistanceLabel(miles: number | null): string {
  if (miles === null) return "Distance unavailable";
  if (miles < 50) return `${miles} mi · Local`;
  if (miles < 150) return `${miles} mi · Regional`;
  if (miles < 400) return `${miles} mi · Drivable`;
  return `${miles} mi · Travel`;
}

export function getDistanceResult(from: GeoPoint, to: GeoPoint): DistanceResult {
  const miles = calculateDistanceMiles(from, to);

  return {
    miles,
    label: formatDistanceLabel(miles),
  };
}