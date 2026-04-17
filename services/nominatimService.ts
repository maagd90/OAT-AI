import type { LocationResult } from "@/types/trip";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const GEO_TTL_MS = 30 * 60 * 1000;
const GEO_TIMEOUT_MS = 5000;

const geocodeCache = new Map<string, { ts: number; value: LocationResult | null }>();

export async function geocodeCity(city: string): Promise<LocationResult | null> {
  const cacheKey = city.trim().toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < GEO_TTL_MS) {
    return cached.value;
  }

  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(city)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AITravelPlanner/1.0 (contact@example.com)" },
      signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
    });

    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
    const data = await res.json();

    if (!data || data.length === 0) {
      geocodeCache.set(cacheKey, { ts: Date.now(), value: null });
      return null;
    }

    const item = data[0];
    const result: LocationResult = {
      name: city,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      country: item.address?.country,
      displayName: item.display_name,
    };
    geocodeCache.set(cacheKey, { ts: Date.now(), value: result });
    return result;
  } catch (err) {
    console.error("Nominatim geocode failed:", err);
    // Don't cache errors for long — allow retries sooner
    geocodeCache.set(cacheKey, { ts: Date.now() - GEO_TTL_MS + 60_000, value: null });
    return null;
  }
}
