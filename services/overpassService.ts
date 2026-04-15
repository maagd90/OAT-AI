import type { HotelResult } from "@/types/trip";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export async function fetchHotels(lat: number, lon: number, radiusMeters = 5000): Promise<HotelResult[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"="hotel"](around:${radiusMeters},${lat},${lon});
      node["tourism"="hostel"](around:${radiusMeters},${lat},${lon});
      node["tourism"="guest_house"](around:${radiusMeters},${lat},${lon});
      node["tourism"="apartment"](around:${radiusMeters},${lat},${lon});
      way["tourism"="hotel"](around:${radiusMeters},${lat},${lon});
    );
    out body center 30;
  `;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
    const data = await res.json();

    return (data.elements || [])
      .filter((el: Record<string, unknown>) => {
        const tags = el.tags as Record<string, string> | undefined;
        const elLat = el.lat !== undefined ? el.lat : (el.center as Record<string, unknown> | undefined)?.lat;
        const elLon = el.lon !== undefined ? el.lon : (el.center as Record<string, unknown> | undefined)?.lon;
        return elLat !== undefined && elLon !== undefined && tags;
      })
      .map((el: Record<string, unknown>) => {
        const tags = el.tags as Record<string, string>;
        const elLat = (el.lat !== undefined ? el.lat : (el.center as Record<string, number> | undefined)?.lat) as number;
        const elLon = (el.lon !== undefined ? el.lon : (el.center as Record<string, number> | undefined)?.lon) as number;
        const starsVal = tags["stars"] ? parseInt(tags["stars"], 10) : null;
        return {
          id: `osm-${el.id}`,
          name: tags.name || tags["name:en"] || "Unnamed Accommodation",
          lat: elLat,
          lon: elLon,
          type: tags.tourism || "hotel",
          stars: starsVal !== null && !isNaN(starsVal) ? starsVal : null,
          source: "OpenStreetMap",
        } as HotelResult;
      })
      .slice(0, 20);
  } catch (err) {
    console.error("Overpass fetch failed:", err);
    return [];
  }
}
