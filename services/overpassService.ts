import type { HotelResult, AttractionResult } from "@/types/trip";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OVERPASS_TTL_MS = 10 * 60 * 1000;
const OVERPASS_TIMEOUT_MS = 7000;

const hotelsCache = new Map<string, { ts: number; value: HotelResult[] }>();
const attractionsCache = new Map<string, { ts: number; value: AttractionResult[] }>();

function cacheKey(lat: number, lon: number, radius: number): string {
  return `${lat.toFixed(4)}:${lon.toFixed(4)}:${radius}`;
}

export async function fetchHotels(lat: number, lon: number, radiusMeters = 5000): Promise<HotelResult[]> {
  const key = cacheKey(lat, lon, radiusMeters);
  const cached = hotelsCache.get(key);
  if (cached && Date.now() - cached.ts < OVERPASS_TTL_MS) {
    return cached.value;
  }

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
      signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
    });

    if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
    const data = await res.json();

    const hotels = (data.elements || [])
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
    hotelsCache.set(key, { ts: Date.now(), value: hotels });
    return hotels;
  } catch (err) {
    console.error("Overpass fetch failed:", err);
    return [];
  }
}

export async function fetchAttractionsFromOSM(lat: number, lon: number, radiusMeters = 10000): Promise<AttractionResult[]> {
  const key = cacheKey(lat, lon, radiusMeters);
  const cached = attractionsCache.get(key);
  if (cached && Date.now() - cached.ts < OVERPASS_TTL_MS) {
    return cached.value;
  }

  const query = `
    [out:json][timeout:25];
    (
      node["tourism"~"museum|attraction|artwork|viewpoint|theme_park|zoo|aquarium|gallery"](around:${radiusMeters},${lat},${lon});
      node["historic"~"monument|memorial|castle|ruins|archaeological_site"](around:${radiusMeters},${lat},${lon});
      node["leisure"~"park|nature_reserve|beach_resort"](around:${radiusMeters},${lat},${lon});
      way["tourism"~"museum|attraction|theme_park|zoo|aquarium"](around:${radiusMeters},${lat},${lon});
    );
    out body center 40;
  `;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
    });

    if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
    const data = await res.json();

    const attractions = (data.elements || [])
      .filter((el: Record<string, unknown>) => {
        const tags = el.tags as Record<string, string> | undefined;
        const elLat = el.lat !== undefined ? el.lat : (el.center as Record<string, unknown> | undefined)?.lat;
        const elLon = el.lon !== undefined ? el.lon : (el.center as Record<string, unknown> | undefined)?.lon;
        return elLat !== undefined && elLon !== undefined && tags?.name;
      })
      .map((el: Record<string, unknown>) => {
        const tags = el.tags as Record<string, string>;
        const elLat = (el.lat !== undefined ? el.lat : (el.center as Record<string, number> | undefined)?.lat) as number;
        const elLon = (el.lon !== undefined ? el.lon : (el.center as Record<string, number> | undefined)?.lon) as number;
        const kind = tags.tourism || tags.historic || tags.leisure || "attraction";
        return {
          id: `osm-attr-${el.id}`,
          name: tags.name || tags["name:en"] || "Unnamed Attraction",
          kind,
          lat: elLat,
          lon: elLon,
          rating: null,
          source: "OpenStreetMap",
        } as AttractionResult;
      })
      .slice(0, 20);
    attractionsCache.set(key, { ts: Date.now(), value: attractions });
    return attractions;
  } catch (err) {
    console.error("Overpass attractions fetch failed:", err);
    return [];
  }
}
