export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function filterByDistance<T extends { lat: number; lon: number }>(
  items: T[],
  centerLat: number,
  centerLon: number,
  maxDistanceKm: number
): T[] {
  return items.filter((item) => {
    const distance = haversineDistanceKm(centerLat, centerLon, item.lat, item.lon);
    return distance <= maxDistanceKm;
  });
}
