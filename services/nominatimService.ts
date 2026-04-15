import type { LocationResult } from "@/types/trip";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export async function geocodeCity(city: string): Promise<LocationResult | null> {
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(city)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AITravelPlanner/1.0 (contact@example.com)" },
    });

    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
    const data = await res.json();

    if (!data || data.length === 0) return null;

    const item = data[0];
    return {
      name: city,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      country: item.address?.country,
      displayName: item.display_name,
    };
  } catch (err) {
    console.error("Nominatim geocode failed:", err);
    return null;
  }
}
